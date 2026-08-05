import { pocketbaseClient } from './pocketbaseClient.js';
import logger from './logger.js';
import { rewriteText } from './textRewriter.js';
import { OFFICIAL_ADS } from './houseAdsCatalog.js';
import { recordContentEvent } from './contentAnalytics.js';

/**
 * rssAutoPublisher
 * ----------------
 * Job periódico (cada 30 min) que, para cada feed RSS configurado:
 *   1. Obtiene los artículos del feed.
 *   2. Por cada artículo que no exista ya en nw3_noticias (dedup por fuente_url),
 *      descarga la página fuente para extraer el cuerpo completo (fetchArticleContent),
 *      recalcula la categoría y los hashtags sobre ese texto, y crea el registro en
 *      PocketBase (guardando la imagen del feed en el campo `imagen` si la trae).
 *   3. Si el artículo proviene de un canal de Telegram (link t.me/...), edita el
 *      mensaje original del canal vía Bot API añadiendo el enlace a NW3.
 *   4. Guarda el telegram_url del post original en el registro.
 *
 * El token del bot se lee SIEMPRE desde process.env.BOT_TOKEN_NW3 (nunca hardcodeado).
 * Si no está definido, los artículos se siguen creando pero se omite la edición en Telegram.
 */

// ── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN_NW3;
const SITE_URL = process.env.SITE_URL || 'https://noticiasweb3.todosobreall.tech';
const INTERVAL_MS = 30 * 60 * 1000;          // cada 30 minutos
const TELEGRAM_CALL_DELAY_MS = 1200;          // pausa entre llamadas a la Bot API
const MAX_NEW_PER_RUN = Number(process.env.RSS_MAX_NEW_PER_RUN || 25); // tope de seguridad: nuevos artículos por ejecución
const MAX_TELEGRAM_BODY_CHARS = Number(process.env.RSS_TELEGRAM_SUMMARY_CHARS || 180); // una frase breve
// Completar primero el post permite que Inside Ads añada después su texto y
// teclado sin que el worker vuelva a tocar el mensaje.
const CHANNEL_EDIT_MIN_AGE_MS = Number(process.env.RSS_CHANNEL_EDIT_MIN_AGE_MS || 0);
const HOUSE_ADS_INTERNAL_URL = process.env.HOUSE_ADS_INTERNAL_URL || 'http://api:3001/community-cards?placement=telegram_channel';
const HOUSE_ADS_TRACKING_BASE_URL = String(process.env.HOUSE_ADS_TRACKING_BASE_URL || 'https://todosobreall.tech/hcgi/api/community-cards').replace(/\/$/, '');
const HOUSE_ADS_TIMEOUT_MS = Number(process.env.HOUSE_ADS_TIMEOUT_MS || 3000);
const TELEGRAM_VIEWS_SYNC_INTERVAL_MS = Number(process.env.TELEGRAM_VIEWS_SYNC_INTERVAL_MS || 15 * 60 * 1000);
const TELEGRAM_VIEWS_SYNC_LIMIT = Number(process.env.TELEGRAM_VIEWS_SYNC_LIMIT || 40);
const TELEGRAM_HTTP_TIMEOUT_MS = Number(process.env.TELEGRAM_HTTP_TIMEOUT_MS || 15_000);
const TELEGRAM_PENDING_RETRY_LIMIT = Math.max(1, Number(process.env.TELEGRAM_PENDING_RETRY_LIMIT || 10));
let autoPublishRunning = false;
let backfillRunning = false;
const WORKER_STATUS_KEY = 'rss_worker_status';
const WORKER_COMMAND_KEY = 'rss_worker_command';
const WORKER_CONTROL_INTERVAL_MS = Number(process.env.RSS_WORKER_CONTROL_INTERVAL_MS || 5000);

async function readWorkerSetting(key) {
  try {
    return await pocketbaseClient.collection('nw3_settings').getFirstListItem(`key="${key}"`);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

async function writeWorkerSetting(key, value) {
  const current = await readWorkerSetting(key);
  if (current) return pocketbaseClient.collection('nw3_settings').update(current.id, { value });
  return pocketbaseClient.collection('nw3_settings').create({ key, value });
}

async function patchWorkerStatus(patch) {
  try {
    const current = await readWorkerSetting(WORKER_STATUS_KEY);
    const value = { ...(current?.value || {}), ...patch, updated_at: new Date().toISOString() };
    await writeWorkerSetting(WORKER_STATUS_KEY, value);
    return value;
  } catch (error) {
    logger.warn(`[rssAutoPublisher] No se pudo guardar el estado del worker: ${error.message}`);
    return null;
  }
}

// Extracción del cuerpo completo del artículo original (fetchArticleContent):
const MIN_ARTICLE_CHARS = 200;                // mínimo de texto extraído para darlo por válido
const FETCH_TIMEOUT_MS = 10000;               // timeout al descargar la página fuente
const FETCH_USER_AGENT = 'Mozilla/5.0 (compatible; NW3Bot/1.0; +https://noticiasweb3.todosobreall.tech)';
const MAX_HASHTAGS = 5;                        // tope total de hashtags por artículo

// Límites de la Bot API de Telegram para edición de mensajes:
//   · máx. 30 mensajes editados por segundo en total,
//   · máx. 1 mensaje por segundo y por chat (canal).
// Con 1500 ms entre llamadas nos mantenemos holgadamente por debajo de ambos.
const TELEGRAM_BACKFILL_DELAY_MS = 1500;
// Backfill de Instant View: lote por ciclo y periodicidad. Con 100 y 1,5 s de
// pausa, un ciclo tarda ~2,5 min.
const IV_BACKFILL_MAX_PER_RUN = Number(process.env.IV_BACKFILL_MAX_PER_RUN || 100);
const IV_BACKFILL_INTERVAL_MS = Number(process.env.IV_BACKFILL_INTERVAL_MS || 45 * 60 * 1000);
const TELEGRAM_MAX_RETRIES = 3;               // reintentos por mensaje ante un 429 (Too Many Requests)

// Canales de Telegram propios (vía RSSHub) — sus items traen link t.me/... editable.
const CHANNELS = [
  { channel: 'TodoSobreAllTech',    defaultCategory: 'Tecnología' },
  { channel: 'TodoSobreGameplaysCanal', defaultCategory: 'Gaming' },
  { channel: 'resistencia_censura', defaultCategory: 'Ciberseguridad' },
];

// Feeds fijos de rss.app (espejo de RSS_APP_FEEDS en useTelegramFeed.jsx).
const RSS_APP_FEEDS = [
  // Fuente agregada oficial de TodoSobreAllTech. Sustituye los feeds separados
  // y el antiguo flujo de IFTTT para que el worker cree, publique y formatee cada
  // entrada una sola vez. La deduplicación se hace por URL original.
  { url: 'https://rss.app/feeds/v1.1/_V6S1IOxd3DMA4V76.json', defaultCategory: 'Tecnología', label: 'RSS Telegram Alltech' },
  { url: 'https://rss.app/feeds/v1.1/_CDNEKnSOiQkbSr1i.json', defaultCategory: 'Gaming', label: '@TodoSobreGameplaysCanal', publishChannel: '@TodoSobreGameplaysCanal' },
  // El feed del propio canal NO usa publishNew (publicaría posts nuevos a partir
  // de sus propios posts → bucle): mantiene la edición del post original.
  { url: 'https://rss.app/feeds/v1.1/VIGykitWBlIEm69s.json', defaultCategory: 'Tecnología',     label: '@TodoSobreAllTech', publishNew: false },
];

// Canal propio donde se publican como posts NUEVOS los artículos de los feeds de
// rss.app (a diferencia de los canales de Telegram, cuyo post original se edita).
const PUBLISH_CHANNEL = '@TodoSobreAllTech';

function tokenForPublishChannel(channel = PUBLISH_CHANNEL) {
  // Un único bot publica y edita en todos los canales propios. El canal se
  // selecciona mediante chat_id, pero las credenciales son siempre las mismas.
  return BOT_TOKEN;
}

// Categorización por keywords — copiada de useTelegramFeed.jsx (misma lógica).
const CATEGORY_KEYWORDS = {
  'IA': [
    'inteligencia artificial', ' ia ', ' ai ', 'chatgpt', 'gpt', 'claude', 'gemini', 'llm',
    'openai', 'anthropic', 'deepseek', 'copilot', 'machine learning',
    'aprendizaje automático', 'modelo de lenguaje', 'generativa', 'generativo',
    'mistral', 'llama', 'stable diffusion', 'midjourney', 'sora', 'agente ia',
    'neural', 'perplexity', 'grok', 'notebooklm',
  ],
  'Gaming': [
    'gaming', 'videojuego', 'videogame', 'consola', 'ps5', 'playstation', 'xbox',
    'nintendo', 'switch', 'steam', 'fortnite', 'minecraft', 'gamer', 'esport',
    'pc gamer', 'metacritic', 'forza', 'call of duty', 'gta', 'valorant',
    'twitch', 'streamer', 'gameplay', 'dlc', 'early access', 'pokemon',
  ],
  'Ciberseguridad': [
    'hack', 'hacker', 'ciberseguridad', 'cybersecurity', 'vulnerabilidad', 'malware',
    'ransomware', 'phishing', 'brecha', 'filtración', 'ciberataque', 'exploit',
    'vpn', 'cifrado', 'contraseña', 'datos robados', 'spyware', 'backdoor',
    'zero-day', '0-day', 'ddos', 'botnet', 'robo de datos',
    'censura', 'vigilancia', 'espionaje', 'nsa', 'gdpr', 'datos personales',
    'apagón de internet', 'corte de internet', 'bloqueo de internet', 'internet bloqueado',
    'netblocks', 'internet shutdown', 'conectividad a internet',
    'escalada de privilegios', 'escalada local', 'acceso no autorizado', 'cadena de suministro',
    'poc ', 'proof of concept', 'cve-', 'cvss', 'parcheado', 'sin parchear', 'ejecución remota',
    'inyección', 'bypass', 'token robado', 'exfiltración', 'exfiltraci',
  ],
  'Espacio': [
    'nasa', 'espacio', 'cohete', 'satélite', 'órbita', 'astronauta', 'spacex',
    'marte', 'luna', 'telescopio', 'hubble', 'james webb', 'iss', 'estación espacial',
    'lanzamiento espacial', 'exoplaneta', 'asteroide', 'cometa', 'galaxia',
    'agujero negro', 'esa ', 'cosmos', 'universo', 'supernova',
  ],
  'Móviles': [
    'iphone', 'android', 'smartphone', ' móvil ', 'samsung', 'pixel', 'oneplus',
    'xiaomi', 'huawei', 'app store', 'google play', 'ios ', 'aplicación móvil',
    'tableta', 'tablet', 'wearable', 'smartwatch', 'apple watch', 'galaxy',
    'snapdragon', 'dimensity', 'batería móvil', '5g', 'telefono',
  ],
  'Energía': [
    'energía solar', 'panel solar', 'célula solar', 'fotovoltaica', 'renovable',
    'eólica', 'batería', 'almacenamiento energía', 'hidrógeno', 'nuclear',
    'fusión nuclear', 'carbono', 'emisiones', 'co2', 'cambio climático',
    'electricidad', 'red eléctrica', 'cargador', 'coche eléctrico', 'tesla',
    'perovskita', 'biomasa', 'geotérmica',
  ],
  'Redes Sociales': [
    'twitter', 'x.com', 'instagram', 'facebook', 'meta ', 'tiktok', 'youtube',
    'linkedin', 'reddit', 'snapchat', 'whatsapp', 'telegram', 'mastodon',
    'bluesky', 'threads', 'influencer', 'viral', 'redes sociales', 'social media',
    'moderación de contenido', 'desinformación', 'bulo', 'fake news',
  ],
  'Economía': [
    'bolsa', 'wall street', 'nasdaq', 'cotización', 'inversión', 'startup',
    'valoración', 'ipo', 'fusión', 'adquisición', 'despidos', 'ertes',
    'inflación', 'banco', 'criptomoneda', 'bitcoin', 'ethereum', 'blockchain',
    'economía', 'pib', 'recesión', 'beneficios', 'facturación', 'multa',
    'regulación', 'ue tech', 'antitrust', 'monopolio',
  ],
  'Salud': [
    'salud', 'médico', 'medicina', 'hospital', 'enfermedad', 'vacuna', 'virus',
    'bacteria', 'cáncer', 'investigación médica', 'farmacéutica', 'tratamiento',
    'estudio científico', 'longevidad', 'alzheimer', 'diabetes', 'cardio',
    'mental', 'sueño', 'descanso', 'nutrición', 'dieta', 'ejercicio',
  ],
  'Ciencia': [
    'científicos', 'investigadores', 'descubrimiento', 'estudio', 'universidad',
    'laboratorio', 'experimento', 'física', 'química', 'biología', 'arqueología',
    'fósil', 'evolución', 'genética', 'adn', 'crispr', 'cuántica', 'átomo',
    'partícula', 'materia oscura', 'teoría', 'naturaleza', 'animal', 'especie',
    'clima', 'océano', 'geología', 'volcán', 'terremoto',
  ],
};

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createNewsRecordWithRetry(record, maxAttempts = 3) {
  const escapedSlug = String(record.slug).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await pocketbaseClient.collection('nw3_noticias').create(record);
    } catch (err) {
      lastError = err;
      // Si PocketBase guardó el registro pero la respuesta se perdió, no crear
      // un duplicado durante el reintento.
      try {
        const existing = await pocketbaseClient.collection('nw3_noticias')
          .getFirstListItem(`slug="${escapedSlug}"`);
        if (existing) return existing;
      } catch { /* sigue con el reintento */ }
      if (attempt < maxAttempts) {
        const delayMs = 1000 * (2 ** (attempt - 1));
        logger.warn(`[rssAutoPublisher] PocketBase no respondió al guardar; reintento ${attempt}/${maxAttempts} en ${delayMs} ms: ${err.message}`);
        await sleep(delayMs);
      }
    }
  }
  throw new Error(`PocketBase no pudo guardar el artículo tras ${maxAttempts} intentos: ${lastError?.message || 'error desconocido'}`);
}

function detectCategory(text, defaultCategory) {
  const lower = ` ${text.toLowerCase()} `;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return defaultCategory;
}

// Hashtags a partir de la categoría: "Ciberseguridad" → "#Ciberseguridad #NW3",
// "IA" → "#IA #NW3", "Redes Sociales" → "#RedesSociales #NW3" (sin espacios en el tag).
function buildHashtags(categoria) {
  const cat = (categoria || '').trim().replace(/\s+/g, '');
  return cat ? `#${cat} #NW3` : '#NW3';
}

// Entidades conocidas (tecnologías, empresas, productos) → hashtag canónico.
// Se detectan con límites de palabra para evitar falsos positivos (p. ej.
// "intel" dentro de "inteligencia"). Se omiten términos ambiguos en español
// como "meta" (objetivo) o "llama" (animal/verbo).
const KNOWN_ENTITIES = [
  ['OpenAI', /\bopenai\b/i],
  ['ChatGPT', /\bchat\s?gpt\b/i],
  ['Anthropic', /\banthropic\b/i],
  ['Claude', /\bclaude\b/i],
  ['Gemini', /\bgemini\b/i],
  ['DeepSeek', /\bdeepseek\b/i],
  ['Copilot', /\bcopilot\b/i],
  ['Mistral', /\bmistral\b/i],
  ['Grok', /\bgrok\b/i],
  ['Perplexity', /\bperplexity\b/i],
  ['Midjourney', /\bmidjourney\b/i],
  ['Google', /\bgoogle\b/i],
  ['Microsoft', /\bmicrosoft\b/i],
  ['Apple', /\bapple\b/i],
  ['Amazon', /\bamazon\b/i],
  ['Nvidia', /\bnvidia\b/i],
  ['Intel', /\bintel\b/i],
  ['AMD', /\bamd\b/i],
  ['Qualcomm', /\bqualcomm\b/i],
  ['Samsung', /\bsamsung\b/i],
  ['Xiaomi', /\bxiaomi\b/i],
  ['Huawei', /\bhuawei\b/i],
  ['Sony', /\bsony\b/i],
  ['Tesla', /\btesla\b/i],
  ['SpaceX', /\bspacex\b/i],
  ['NASA', /\bnasa\b/i],
  ['Android', /\bandroid\b/i],
  ['iPhone', /\biphone\b/i],
  ['iOS', /\bios\b/i],
  ['Windows', /\bwindows\b/i],
  ['Linux', /\blinux\b/i],
  ['Bitcoin', /\bbitcoin\b/i],
  ['Ethereum', /\bethereum\b/i],
  ['Telegram', /\btelegram\b/i],
  ['WhatsApp', /\bwhatsapp\b/i],
  ['TikTok', /\btiktok\b/i],
  ['Instagram', /\binstagram\b/i],
  ['Facebook', /\bfacebook\b/i],
  ['YouTube', /\byoutube\b/i],
  ['Twitter', /\b(?:twitter|x\.com)\b/i],
  ['Ransomware', /\bransomware\b/i],
  ['Phishing', /\bphishing\b/i],
  ['Malware', /\bmalware\b/i],
];

// Palabras capitalizadas frecuentes que NO son nombres propios (arranques de
// frase, determinantes, conectores) — se excluyen al inferir entidades del texto.
const CAP_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del', 'de',
  'en', 'por', 'con', 'para', 'que', 'como', 'más', 'mas', 'este', 'esta', 'estos',
  'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'su', 'sus', 'mi', 'tu', 'nuestro',
  'pero', 'según', 'tras', 'sin', 'desde', 'hasta', 'sobre', 'entre', 'cuando',
  'donde', 'aunque', 'mientras', 'también', 'además', 'asimismo', 'ahora', 'hoy',
  'ayer', 'mañana', 'son', 'fue', 'fueron', 'han', 'hay', 'esto', 'esta', 'aquí',
  'allí', 'sí', 'tan', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'cada',
]);

// Convierte una palabra en una etiqueta de hashtag: conserva letras (con acentos)
// y dígitos, eliminando espacios y signos. "Redes Sociales" → "RedesSociales".
function tagify(word = '') {
  return String(word).replace(/[^\p{L}\p{N}]/gu, '');
}

// Nombres propios recurrentes del texto: tokens capitalizados de ≥4 letras que
// aparecen 2+ veces (más probable que sean entidades reales y no inicios de
// frase), ordenados por frecuencia.
function frequentProperNouns(text = '') {
  const counts = new Map();
  const re = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const word = m[1];
    if (CAP_STOPWORDS.has(word.toLowerCase())) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);
}

// Entidades del texto: primero las del diccionario conocido (en su orden), luego
// nombres propios recurrentes. Sin duplicados (case-insensitive).
function detectEntities(text = '') {
  const out = [];
  const used = new Set();
  for (const [tag, re] of KNOWN_ENTITIES) {
    if (used.has(tag.toLowerCase())) continue;
    if (re.test(text)) { out.push(tag); used.add(tag.toLowerCase()); }
  }
  for (const noun of frequentProperNouns(text)) {
    if (used.has(noun.toLowerCase())) continue;
    out.push(noun); used.add(noun.toLowerCase());
  }
  return out;
}

/**
 * buildHashtagsFromContent
 * ------------------------
 * Hashtags del artículo: "#Categoria #NW3" más entidades detectadas en el
 * contenido (tecnologías, empresas, nombres propios), hasta MAX_HASHTAGS (5)
 * etiquetas en total. Devuelve la cadena "#A #B #C …".
 */
function buildHashtagsFromContent(categoria, text = '') {
  const tags = [];
  const seen = new Set();
  // push devuelve true cuando se alcanza el tope (para cortar el bucle).
  const push = (raw) => {
    const t = tagify(raw);
    if (!t) return false;
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    tags.push(`#${t}`);
    return tags.length >= MAX_HASHTAGS;
  };

  const cat = (categoria || '').trim().replace(/\s+/g, '');
  if (cat) push(cat);
  push('NW3');

  // Entidades solo del texto ya limpio (sin enlaces de IFTTT ni líneas de
  // atribución), para no derivar hashtags de ese ruido.
  for (const entity of detectEntities(stripFeedNoise(text))) {
    if (push(entity)) break;
  }
  return tags.join(' ');
}

// Ruido recurrente en los cuerpos de los feeds: enlaces de IFTTT
// (https://ift.tt/...) y líneas de atribución tipo "Fuente | dominio.com • fecha".
function stripFeedNoise(text = '') {
  return String(text)
    .replace(/https?:\/\/ift\.tt\/\S+/gi, '')          // enlaces de IFTTT
    .replace(/^[ \t]*Fuente[ \t]*\|[^\n]*$/gim, '');    // atribución "Fuente | dominio • fecha"
}

// Elimina el título repetido al inicio del cuerpo: los feeds JSON de rss.app
// suelen reproducir el titular como primera línea del content_text.
function stripLeadingTitle(text = '', title = '') {
  const body = String(text).trim();
  const t = String(title).trim();
  if (t && body.toLowerCase().startsWith(t.toLowerCase())) {
    return body.slice(t.length).replace(/^[\s\-–—:.|·•]+/, '').trim();
  }
  return body;
}

// El mensaje del canal necesita solo una entradilla. Los proveedores suelen
// repetir el titular y añadir su marca, la fuente o llamadas a abrir la noticia;
// esos elementos ya están representados por el título y el enlace propio.
function cleanTelegramSummaryText(text = '', title = '') {
  const withoutTitle = stripLeadingTitle(stripFeedNoise(htmlToPlainText(text)), title);
  return withoutTitle
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line
      && !/^(?:noticias\s*web\s*3|noticiasweb3|nw3)(?:\b|\s*[-:|])/i.test(line)
      && !/^(?:fuente|source|vía|via|publicado por|publicado en)\s*[:|-]/i.test(line)
      && !/^(?:leer|lee|ver|abrir|contin[uú]a)(?:\s+(?:la noticia|el artículo|leyendo|en))?\b/i.test(line)
      && !/^https?:\/\/(?:noticiasweb3\.)?todosobreall\.tech\b/i.test(line))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTelegramEditedBase(text = '') {
  const lines = stripFeedNoise(htmlToPlainText(text))
    .split('\n')
    .map((line) => line
      .replace(/https?:\/\/(?:www\.)?ift\.tt\/\S+/gi, '')
      .replace(/https?:\/\/(?:noticiasweb3\.)?todosobreall\.tech\/\S*/gi, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+\($/, '')
      .trim())
    .filter((line) => line
      && !/^(?:noticias\s*web\s*3|noticiasweb3|nw3)(?:\b|\s*[-:|])/i.test(line)
      && !/^(?:fuente|source|vía|via|publicado por|publicado en)\s*[:|-]/i.test(line)
      && !/^(?:leer|lee|ver|abrir|contin[uú]a)(?:\s+(?:la noticia|el artículo|leyendo|en))?\b/i.test(line));
  if (!lines.length) return '';

  const title = lines[0];
  const uniqueBodyLines = lines.slice(1).filter((line, index, values) => {
    const normalized = line.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (!normalized) return false;
    const normalizedTitle = title.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (normalizedTitle.includes(normalized) || normalized.includes(normalizedTitle)) return false;
    return values.findIndex((candidate) => candidate.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === normalized) === index;
  });
  const summary = summarize(cleanTelegramSummaryText(uniqueBodyLines.join('\n'), title), MAX_TELEGRAM_BODY_CHARS);
  return summary ? `${title}\n\n${summary}` : title;
}

function htmlToPlainText(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // Al reescribir un post conservamos también el destino de los enlaces del
    // anuncio; eliminar simplemente <a> dejaría Inside Ads sin URL de clic.
    .replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(html = '') {
  return stripFeedNoise(htmlToPlainText(html));
}

function sourceUrlFromTelegramPost(raw = '', fallback = '') {
  const links = [];
  const hrefRe = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRe.exec(String(raw))) !== null) links.push(match[1]);
  const plainRe = /https?:\/\/[^\s<>"']+/gi;
  while ((match = plainRe.exec(htmlToPlainText(raw))) !== null) links.push(match[0]);
  const normalized = links.map((link) => String(link).replace(/[),.;]+$/, ''));
  return normalized.find((link) => /https?:\/\/(?:www\.)?ift\.tt\//i.test(link))
    || normalized.find((link) => !/https?:\/\/(?:t\.me|telegram\.me|inside\.ad|noticiasweb3\.todosobreall\.tech)\//i.test(link))
    || fallback;
}

function isWorkerPublishedRecord(record = {}) {
  return /t\.me\/(?:s\/)?TodoSobreAllTech\/\d+/i.test(record.telegram_url || '')
    && !/^@TodoSobreAllTech en Telegram$/i.test(record.fuente_label || '');
}

function shouldDelayChannelEdit(pubDate, now = Date.now()) {
  const publishedAt = new Date(pubDate || 0).getTime();
  return Number.isFinite(publishedAt) && publishedAt > 0
    && now - publishedAt < CHANNEL_EDIT_MIN_AGE_MS;
}

// Boilerplate típico de páginas de noticias que se cuela en párrafos <p>
// (avisos de cookies, llamadas a suscribirse/compartir, créditos, etc.).
function isBoilerplate(text = '') {
  return /\b(cookies?|política de privacidad|newsletter|suscr[ií]bete|publicidad|advertisement|patrocinad|síguenos|comparte|compartir en|todos los derechos reservados|lee también|leer más|seguir leyendo|aceptar y continuar)\b/i.test(text);
}

// Marcadores de contenido patrocinado/publicitario. Si se detecta alguno en el
// título o el cuerpo, el artículo se descarta (no se crea ni se publica).
// "publi" se ancla con \b para no confundirlo con "publicado"/"público".
const SPONSORED_PATTERNS = [
  /patrocinad/i,             // patrocinado / patrocinada / patrocinados
  /sponsored/i,
  /\bpubli\b/i,              // "la publi" (coloquial)
  /publicidad/i,
  /en colaboraci[óo]n con/i,
  /branded content/i,
  /en partnership/i,
];

function isSponsored(title = '', text = '') {
  const hay = `${title}\n${text}`;
  return SPONSORED_PATTERNS.some((re) => re.test(hay));
}

// Extrae el cuerpo principal de un documento HTML: descarta bloques no
// informativos (scripts, estilos, nav, header, footer, aside, formularios y
// figuras) y devuelve el texto de los párrafos <p> relevantes, separados por
// líneas en blanco. Filtra párrafos muy cortos y boilerplate.
function extractMainText(html = '') {
  const stripped = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form|figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  const paragraphs = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const text = stripHtml(m[1]);
    if (text.length < 40) continue;        // descarta pies de foto, botones, créditos cortos
    if (isBoilerplate(text)) continue;     // descarta cookies/publicidad/compartir
    paragraphs.push(text);
  }
  return paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * fetchArticleContent
 * -------------------
 * Descarga la URL del artículo original y extrae el texto principal del HTML
 * (párrafos <p>, eliminando nav, footer, ads, scripts y headers).
 * Devuelve el texto limpio solo si alcanza MIN_ARTICLE_CHARS (200) caracteres;
 * en caso contrario devuelve '' para que el caller recurra al extracto del feed.
 * Nunca lanza: ante cualquier error de red/parseo devuelve ''.
 */
async function fetchArticleContent(url) {
  if (!url || !/^https?:\/\//i.test(url)) return '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': FETCH_USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) return '';
    if (!/text\/html|xml/i.test(res.headers.get('content-type') || '')) return '';

    const html = await res.text();
    const text = extractMainText(html);
    return text.length >= MIN_ARTICLE_CHARS ? text : '';
  } catch (err) {
    logger.warn(`[rssAutoPublisher] No se pudo extraer el contenido de ${url}: ${err.message}`);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

// Slug con el mismo formato que NuevaNoticiaPage.generarSlug.
function generarSlug(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

// Hash corto y determinista a partir de la URL fuente, para sufijar el slug.
function shortHash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function pubDateToDisplay(str) {
  const d = new Date(str);
  if (isNaN(d)) {
    const now = new Date();
    return `${now.getDate()} de ${MONTHS_ES[now.getMonth()]} del ${now.getFullYear()}`;
  }
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} del ${d.getFullYear()}`;
}

function yearOf(str) {
  const d = new Date(str);
  return isNaN(d) ? 2026 : d.getFullYear();
}

function proxyUrl(rssUrl) {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
}

// Detecta links a un post concreto de un canal (t.me/canal/123) — editables vía Bot API.
function telegramPostUrl(url = '') {
  return /t\.me\/(?:s\/)?[A-Za-z0-9_]+\/\d+/.test(url) ? url : null;
}

// Primer href incrustado en un bloque HTML, o null si no hay ninguno.
function firstLinkInHtml(html = '') {
  const m = String(html).match(/<a\b[^>]*\bhref=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// Primer src de <img> incrustado en un bloque HTML, o null si no hay ninguno.
function firstImageInHtml(html = '') {
  const m = String(html).match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// Normaliza una URL de imagen para el campo `imagen` (tipo url en PocketBase):
// devuelve la URL solo si es http(s) y válida, o '' en caso contrario (así una
// URL malformada nunca aborta el create del artículo).
function safeImageUrl(raw = '') {
  try {
    const u = new URL(String(raw));
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch {
    return '';
  }
}

// ── Obtención de feeds → items normalizados ───────────────────────────────────
// item: { title, sourceUrl, label, category, excerpt, fullText, image, pubDate, telegramUrl|null }

async function fetchTelegramChannel({ channel, defaultCategory }) {
  const res = await fetch(proxyUrl(`https://rsshub.app/telegram/channel/${channel}`));
  const data = await res.json();
  if (data.status !== 'ok') return [];

  return (data.items || [])
    .filter((item) => item.link)
    .map((item) => {
      const raw = item.description || item.content || '';
      const telegramOriginalText = htmlToPlainText(raw);
      const text = stripFeedNoise(telegramOriginalText);
      const sourceUrl = sourceUrlFromTelegramPost(raw, item.link);
      const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) || 'Publicación del canal';
      const title = firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
      return {
        title,
        sourceUrl,
        label: `@${channel} en Telegram`,
        category: detectCategory(`${title} ${text}`, defaultCategory),
        excerpt: text.slice(0, 8000),
        fullText: text,
        image: item.thumbnail || item.enclosure?.link || firstImageInHtml(item.description || item.content || '') || '',
        pubDate: item.pubDate,
        telegramUrl: item.link,
        telegramOriginalText,
        sourceKind: 'telegram_channel',
        isIfttt: /https?:\/\/(?:www\.)?ift\.tt\//i.test(sourceUrl),
      };
    });
}

async function fetchRssFeed({ url, defaultCategory, label, publishNew = false, publishChannel = PUBLISH_CHANNEL }) {
  // JSON Feed v1.1 (rss.app *.json): fetch directo.
  if (url.endsWith('.json')) {
    const res = await fetch(url);
    const data = await res.json();
    return (data.items || [])
      .filter((item) => item.url)
      .map((item) => {
        // El content_text de los feeds JSON arrastra el titular repetido al
        // inicio, enlaces de IFTTT y líneas de atribución: stripHtml limpia
        // IFTTT/atribución y stripLeadingTitle quita el título duplicado.
        const text = stripLeadingTitle(stripHtml(item.content_html || item.content_text || ''), item.title || '');
        const rawTitle = item.title || text.slice(0, 90);
        const title = rawTitle.length > 120 ? `${rawTitle.slice(0, 120)}…` : rawTitle;
        // URL real del artículo original: rss.app la expone en external_url; si
        // falta, tomamos el primer enlace incrustado en el content_html. item.url
        // suele ser el post de Telegram (t.me/...), que reservamos para telegramUrl,
        // y solo se usa como último recurso si no hay URL del artículo.
        const sourceUrl = item.external_url || firstLinkInHtml(item.content_html) || item.url;
        return {
          title,
          sourceUrl,
          label: label || url,
          category: detectCategory(`${title} ${text}`, defaultCategory),
          excerpt: text.slice(0, 8000),
          fullText: text,
          image: item.image || item.banner_image || firstImageInHtml(item.content_html || '') || '',
          pubDate: item.date_published,
          // telegramUrl = el post de Telegram original (t.me/canal/123), para que
          // el job pueda editar el mensaje. Sigue siendo item.url.
          telegramUrl: telegramPostUrl(item.url),
          // publishNew = se publica como post NUEVO en el canal (feeds rss.app),
          // en lugar de editar un post existente.
          publishNew,
          publishChannel,
        };
      });
  }

  // RSS/Atom XML vía rss2json.
  const res = await fetch(proxyUrl(url));
  const data = await res.json();
  if (data.status !== 'ok') return [];

  return (data.items || [])
    .filter((item) => item.link)
    .map((item) => {
      const text = stripHtml(item.description || item.content || '');
      const rawTitle = stripHtml(item.title || '') || text.slice(0, 90);
      const title = rawTitle.length > 120 ? `${rawTitle.slice(0, 120)}…` : rawTitle;
      return {
        title,
        sourceUrl: item.link,
        label: label || url,
        category: detectCategory(`${title} ${text}`, defaultCategory),
        excerpt: text.slice(0, 8000),
        fullText: text,
        image: item.thumbnail || item.enclosure?.link || firstImageInHtml(item.description || item.content || '') || '',
        pubDate: item.pubDate,
        telegramUrl: null,
        publishNew,
        publishChannel,
      };
    });
}

// Feeds dinámicos guardados en nw3_settings (key="rss_feeds").
async function loadDynamicFeeds() {
  try {
    const record = await pocketbaseClient.collection('nw3_settings').getFirstListItem('key="rss_feeds"');
    return Array.isArray(record.value?.feeds) ? record.value.feeds : [];
  } catch {
    return [];
  }
}

// ── Telegram Bot API: editar el mensaje original del canal ─────────────────────
async function telegramApi(method, body, retries = TELEGRAM_MAX_RETRIES, token = BOT_TOKEN) {
  for (let attempt = 0; ; attempt++) {
    let res;
    let data;
    try {
      res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TELEGRAM_HTTP_TIMEOUT_MS),
      });
      data = await res.json();
    } catch (error) {
      if (attempt >= retries) throw error;
      const delayMs = Math.min(15_000, 1000 * (2 ** attempt));
      logger.warn(`[rssAutoPublisher] Transporte Telegram en ${method}: ${error.message}; reintento ${attempt + 1}/${retries}.`);
      await sleep(delayMs);
      continue;
    }

    // 429 Too Many Requests → respetar el retry_after que indica Telegram y reintentar
    // (hasta `retries` veces); pasado el límite, devolvemos el error para que lo logue el caller.
    if (!data.ok && data.error_code === 429 && attempt < retries) {
      const retryAfter = data.parameters?.retry_after ?? 1;
      logger.warn(`[rssAutoPublisher] Telegram 429 en ${method}: espero ${retryAfter}s y reintento (${attempt + 1}/${retries}).`);
      await sleep((retryAfter + 0.5) * 1000); // +0.5 s de margen sobre lo que pide Telegram
      continue;
    }

    // Los fallos 5xx son transitorios. No reintentamos 4xx (por ejemplo el
    // sendRichMessage no disponible), para pasar inmediatamente al fallback.
    const transientServerError = res.status >= 500 || Number(data.error_code) >= 500;
    if (transientServerError && attempt < retries) {
      await sleep(Math.min(15_000, 1000 * (2 ** attempt)));
      continue;
    }

    return data;
  }
}

/**
 * Añade "#Categoria #NW3" y "📰 Leer en NW3: <url>" al final del mensaje original del canal.
 * Intenta editMessageText; si el mensaje es multimedia (sin texto) cae a editMessageCaption.
 * Devuelve { ok, permanent }: ok=true si la edición se aplicó (o ya estaba aplicada);
 * permanent=true si Telegram rechazó la edición de forma definitiva (mensaje borrado,
 * demasiado antiguo, sin permisos...) y no tiene sentido reintentarla nunca más.
 * Un fallo de red/5xx devuelve permanent=false: es transitorio y se reintenta.
 */
// Escapa los 3 caracteres que rompen parse_mode HTML en texto plano (no en el <a> del sufijo/footer).
const escapeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function telegramHouseAdTrackingUrl(ad = {}) {
  const id = encodeURIComponent(String(ad.id || OFFICIAL_ADS[0].id));
  return `${HOUSE_ADS_TRACKING_BASE_URL}/${id}/click?placement=telegram_channel`;
}

function telegramHouseAdBoostTrackingUrl(ad = {}) {
  if (!ad?.boost_url) return '';
  const id = encodeURIComponent(String(ad.id || OFFICIAL_ADS[0].id));
  return `${HOUSE_ADS_TRACKING_BASE_URL}/${id}/boost?placement=telegram_channel`;
}

const escapeRichMarkdown = (value = '') => String(value).replace(/([\\`*_[\]<>])/g, '\\$1');

// Telegram no incrusta una imagen dentro de sendMessage. Un blockquote HTML
// actúa como tarjeta compacta y permanece en el propio texto cuando Inside Ads
// añade después su bloque y su teclado. Todos los enlaces pasan por el contador
// propio, que registra también el país del clic antes de redirigir.
function formatTelegramHouseAd(ad = {}) {
  if (!ad?.id || !ad?.title) return '';
  const trackingUrl = escapeHtml(telegramHouseAdTrackingUrl(ad));
  const title = escapeHtml(String(ad.title).slice(0, 100));
  const description = escapeHtml(String(ad.description || '').slice(0, 180));
  const cta = escapeHtml(String(ad.cta || 'Abrir').slice(0, 40));
  const boostUrl = telegramHouseAdBoostTrackingUrl(ad);
  const boost = boostUrl ? ` · <a href="${escapeHtml(boostUrl)}">&#128640; Impulsar</a>` : '';
  return `<blockquote>&#128226; <b>Recomendado por TodoSobreAllTech</b>\n<a href="${trackingUrl}">${title}</a>${description ? `\n${description}` : ''}\n<a href="${trackingUrl}">${cta} &rarr;</a>${boost}</blockquote>`;
}

function formatTelegramHouseAdMarkdown(ad = {}) {
  if (!ad?.id || !ad?.title) return '';
  const title = escapeRichMarkdown(String(ad.title).slice(0, 55));
  const description = escapeRichMarkdown(String(ad.description || '').slice(0, 72));
  return [
    '| **COMUNIDAD DESTACADA** |',
    '|:--|',
    `| **${title}**${description ? `<br>${description}` : ''} |`,
  ].filter(Boolean).join('\n');
}

function formatTelegramNewsRichMarkdown(article, slug, houseAd) {
  const articleUrl = `${SITE_URL}/noticias/${slug}`;
  const ivUrl = `https://t.me/iv?url=${encodeURIComponent(articleUrl)}&rhash=170fab6bf56287`;
  const title = escapeRichMarkdown(String(article.titulo || '').slice(0, 200));
  const cleanBody = cleanTelegramSummaryText(article.excerpt || article.contenido, article.titulo);
  const body = escapeRichMarkdown(summarize(cleanBody, MAX_TELEGRAM_BODY_CHARS));
  const hashtags = String(article.hashtags || buildHashtags(article.categoria)).trim();
  const campaign = formatTelegramHouseAdMarkdown(houseAd);
  return [
    `## 📰 ${title}`,
    body,
    hashtags,
    `[Leer en NoticiasWeb3](${ivUrl})`,
    campaign ? '---' : '',
    campaign,
  ].filter(Boolean).join('\n\n');
}

function formatTelegramBackfillRichMarkdown(originalText, slug, categoria, hashtags, houseAd) {
  const { editorialText, promotionText } = extractInsideAdsPromotion(originalText);
  const base = cleanTelegramEditedBase(editorialText);
  const [title = 'NoticiasWeb3', ...bodyParts] = base.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const news = formatTelegramNewsRichMarkdown({
    titulo: title,
    excerpt: bodyParts.join(' '),
    categoria,
    hashtags: hashtags || buildHashtags(categoria),
  }, slug, houseAd);
  const preservedAd = formatPreservedInsideAds(promotionText);
  return [news, preservedAd ? '---' : '', preservedAd].filter(Boolean).join('\n\n');
}

async function loadTelegramHouseAd(now = Date.now()) {
  try {
    const response = await fetch(HOUSE_ADS_INTERNAL_URL, { signal: AbortSignal.timeout(HOUSE_ADS_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.ads?.[0]?.id && data.ads[0].title) return data.ads[0];
    throw new Error('catálogo vacío');
  } catch (error) {
    const index = Math.floor(now / (10 * 60 * 1000)) % OFFICIAL_ADS.length;
    logger.warn(`[rssAutoPublisher] Campañas internas no disponibles; se usa la rotación oficial: ${error.message}`);
    return OFFICIAL_ADS[index];
  }
}

// RSSHub permite recuperar el texto que Inside Ads añade al post. Lo separamos
// del contenido editorial y lo reinsertamos al final del Rich Message. La
// edición no envía reply_markup, por lo que no sustituye su teclado inline.
function hasInsideAdsPromotion(text = '') {
  const value = String(text);
  return /(?:@?insideads_bot|inside\s*ads|https?:\/\/(?:www\.)?inside\.ad(?:\/|\b))/i.test(value)
    || /(?:^|\n)\s*(?:publicidad|anuncio|patrocinado)\s*[:-]/im.test(value);
}

function extractInsideAdsPromotion(text = '') {
  const plain = htmlToPlainText(text);
  const lines = plain.split('\n');
  let index = lines.findIndex((line) => /@?insideads_bot|inside\s*ads|https?:\/\/(?:www\.)?inside\.ad(?:\/|\b)/i.test(line));
  if (index < 0) index = lines.findIndex((line, position) => position >= Math.max(1, lines.length - 6)
    && /^\s*(?:publicidad|anuncio|patrocinado)\s*[:-]/i.test(line));
  if (index < 0) return { editorialText: plain, promotionText: '' };
  return { editorialText: lines.slice(0, index).join('\n').trim(), promotionText: lines.slice(index).join('\n').trim() };
}

function formatPreservedInsideAds(text = '') {
  const lines = String(text).split('\n').map((line) => escapeRichMarkdown(line.trim())).filter(Boolean);
  if (!lines.length) return '';
  return ['> **PUBLICIDAD · INSIDE ADS**', ...lines.map((line) => `> ${line}`)].join('\n');
}

function extractInsideAdsButton(text = '') {
  const promotion = extractInsideAdsPromotion(text).promotionText;
  if (!promotion) return null;
  const linked = [...promotion.matchAll(/([^()\n]{1,48})\s*\((https:\/\/[^)\s]+)\)/g)].pop();
  const rawUrl = linked?.[2] || [...promotion.matchAll(/https:\/\/[^\s)]+/g)].pop()?.[0] || '';
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return null;
    const textLabel = String(linked?.[1] || 'Ver anuncio').trim().replace(/^[-–—:·\s]+/, '').slice(-40) || 'Ver anuncio';
    return { text: textLabel, url: url.toString() };
  } catch { return null; }
}

function parseTelegramPublicPost(html = '') {
  const source = String(html);
  const textHtml = source.match(/<div\b[^>]*class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*class=["'][^"']*tgme_widget_message_footer/i)?.[1]
    || source.match(/<div\b[^>]*class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
    || '';
  const buttons = [...source.matchAll(/<a\b([^>]*class=["'][^"']*tgme_widget_message_inline_button[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const href = match[1].match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
      const label = htmlToPlainText(match[2]).replace(/\s+/g, ' ').trim();
      try {
        const url = new URL(href.replace(/&amp;/g, '&'));
        return url.protocol === 'https:' && label ? { text: label.slice(0, 40), url: url.toString() } : null;
      } catch { return null; }
    })
    .filter(Boolean);
  const insideAdsButton = buttons.find((button) => !/noticiasweb3|todosobreall\.tech\/hcgi\/api\/community-cards/i.test(button.url)) || null;
  return { telegramOriginalText: htmlToPlainText(textHtml), insideAdsButton };
}

async function fetchTelegramPublicPost(telegramUrl) {
  const match = String(telegramUrl).match(/^https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (!match) return null;
  // Telegram sirve mensajes recientes y antiguos desde dos variantes distintas
  // según la caché/CDN. Probar ambas evita que el backfill dependa de `/s/`.
  const urls = [
    `https://t.me/${match[1]}/${match[2]}?embed=1&mode=tme`,
    `https://t.me/s/${match[1]}/${match[2]}?embed=1&mode=tme`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': FETCH_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const parsed = parseTelegramPublicPost(await response.text());
      if (parsed.telegramOriginalText) return parsed;
    } catch { /* prueba la siguiente variante */ }
  }
  return null;
}

function buildTelegramPostKeyboard(ivUrl, houseAd, insideAdsButton = null) {
  const actions = [];
  if (insideAdsButton?.url) actions.push(insideAdsButton);
  if (houseAd?.id) actions.push({ text: String(houseAd.cta || 'Abrir comunidad').slice(0, 24),
    url: telegramHouseAdTrackingUrl(houseAd) });
  return { inline_keyboard: [
    [{ text: 'Leer noticia', url: ivUrl }],
    ...(actions.length ? [actions] : []),
  ] };
}

async function appendNw3LinkToTelegramPost(telegramUrl, slug, originalText, categoria, hashtags, houseAd, knownInsideAdsButton = null) {
  const match = telegramUrl.match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  // URL que no apunta a un post concreto: irrecuperable, no reintentar.
  if (!match) return { ok: false, permanent: true };

  const chatId = `@${match[1]}`;
  const messageId = Number(match[2]);
  const articleUrl = `${SITE_URL}/noticias/${slug}`;
  const ivUrl = `https://t.me/iv?url=${encodeURIComponent(articleUrl)}&rhash=170fab6bf56287`;
  const originalBase = (originalText || '').trim();

  const richMarkdown = formatTelegramBackfillRichMarkdown(originalBase, slug, categoria, hashtags, houseAd);
  const insideAdsButton = knownInsideAdsButton || extractInsideAdsButton(originalBase);
  const mergedKeyboard = buildTelegramPostKeyboard(ivUrl, houseAd, insideAdsButton);

  // El backfill usa exclusivamente la edición enriquecida de Bot API 10.2 para
  // que el diseño sea idéntico al de las publicaciones nuevas.
  const result = await telegramApi('editRichMessage', {
    chat_id: chatId,
    message_id: messageId,
    rich_message: { markdown: richMarkdown },
    link_preview_options: { is_disabled: false, url: ivUrl, prefer_large_media: true, show_above_text: false },
    reply_markup: mergedKeyboard,
  });

  if (result.ok) return { ok: true, permanent: false, communityAdAdded: Boolean(houseAd?.id), insideAdsPreserved: hasInsideAdsPromotion(originalBase) };

  const desc = (result.description || '').toLowerCase();

  // "message is not modified": el enlace ya estaba puesto → lo damos por bueno.
  if (desc.includes('not modified')) return { ok: true, permanent: false };

  // La edición enriquecida de mensajes multimedia no se degrada a HTML.
  if (desc.includes('no text in the message') || desc.includes('caption')) return { ok: false, permanent: true };

  // Una instalación todavía sin editRichMessage se trata como transitoria.
  const unsupportedRichEdit = desc.includes('method not found') || desc.includes('not supported');
  const permanent = !unsupportedRichEdit && (result.error_code === 400 || result.error_code === 403);
  logger.warn(`[rssAutoPublisher] No se pudo editar ${telegramUrl} (${permanent ? 'definitivo' : 'transitorio'}): ${result.description || 'error desconocido'}`);
  return { ok: false, permanent };
}

// Resumen breve para el cuerpo del post de Telegram: las primeras frases del
// texto hasta `maxLen` caracteres (≈2-3 frases). Acumula frases completas
// (terminadas en . ! ? …) mientras quepan; si ni la primera frase cabe, recorta
// por carácter añadiendo «…». El artículo completo queda en la web.
function summarize(text = '', maxLen = MAX_TELEGRAM_BODY_CHARS) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?…]+[.!?…]+(?:\s|$)/g) || [];
  const firstSentence = (sentences[0] || '').trim();
  if (firstSentence && firstSentence.length <= maxLen) return firstSentence;
  if (clean.length <= maxLen) return clean;

  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > maxLen) break;
    out += s;
    break;
  }
  out = out.trim();

  // Si la primera frase ya excede maxLen (o no hay puntuación), recorte duro.
  if (!out) out = `${clean.slice(0, maxLen - 1).trimEnd()}…`;
  return out;
}

/**
 * publishToTelegram
 * -----------------
 * Publica un artículo como mensaje NUEVO en PUBLISH_CHANNEL (@TodoSobreAllTech)
 * vía sendMessage, con el formato:
 *
 *   📰 [título]
 *
 *   [resumen breve: 2-3 frases, máx. 300 caracteres]
 *
 *   #Categoria #NW3
 *
 *   🔗 Leer más: https://noticiasweb3.todosobreall.tech/noticias/[slug]
 *
 * `article` debe traer { titulo, contenido, categoria, hashtags?, excerpt? }.
 * El cuerpo del mensaje NO es el contenido completo: se resume a 2-3 frases
 * (máx. MAX_TELEGRAM_BODY_CHARS) tomando el excerpt del feed o, en su defecto,
 * las primeras frases del contenido reescrito; el artículo completo queda en la
 * web (enlace "Leer más"). Si trae `hashtags` (cadena ya construida) se usan tal
 * cual; si no, se derivan de la categoría. Devuelve el message_id del post
 * publicado, o null si falla.
 */
async function publishToTelegram(article, slug, selectedHouseAd, publishChannel = PUBLISH_CHANNEL) {
  const header = `📰 ${escapeHtml(article.titulo)}`;
  const articleUrl = `${SITE_URL}/noticias/${slug}`;
  const ivUrl = `https://t.me/iv?url=${encodeURIComponent(articleUrl)}&rhash=170fab6bf56287`;
  const houseAd = selectedHouseAd || await loadTelegramHouseAd();
  const houseAdBlock = formatTelegramHouseAd(houseAd);
  const richMarkdown = formatTelegramNewsRichMarkdown(article, slug, houseAd);
  const footer = `${article.hashtags || buildHashtags(article.categoria)}\n\n🔗 <a href="${ivUrl}">Leer en NoticiasWeb3</a>${houseAdBlock ? `\n\n${houseAdBlock}` : ''}`;

  // Cuerpo = resumen breve (2-3 frases, máx. 300 caracteres), no el contenido
  // completo. Preferimos el excerpt del feed y caemos al contenido reescrito.
  const cleanBody = cleanTelegramSummaryText(article.excerpt || article.contenido, article.titulo);
  let body = summarize(cleanBody, MAX_TELEGRAM_BODY_CHARS);

  // Salvaguarda del límite de 4096 de sendMessage (en la práctica el resumen ya
  // está muy por debajo), conservando cabecera, hashtags y enlace.
  const room = 4096 - header.length - footer.length - 4; // 4 = los dos "\n\n"
  if (body.length > room) body = `${body.slice(0, Math.max(0, room - 1)).trimEnd()}…`;

  const text = `${header}\n\n${escapeHtml(body)}\n\n${footer}`;
  const publishToken = tokenForPublishChannel(publishChannel);
  if (!publishToken) return null;
  const campaignKeyboard = buildTelegramPostKeyboard(ivUrl, houseAd);

  try {
    let result = await telegramApi('sendRichMessage', {
      chat_id: publishChannel,
      rich_message: { markdown: richMarkdown },
      link_preview_options: {
        is_disabled: false,
        url: ivUrl,
        prefer_large_media: true,
        show_above_text: false,
      },
      reply_markup: campaignKeyboard,
    }, TELEGRAM_MAX_RETRIES, publishToken);

    // Instalaciones que todavía ejecuten una versión anterior de Bot API
    // mantienen el formato compacto mediante el sendMessage HTML tradicional.
    if (!result.ok) {
      logger.warn(`[rssAutoPublisher] Rich Markdown no disponible; se usa HTML compatible: ${result.description || 'error desconocido'}`);
      result = await telegramApi('sendMessage', {
      chat_id: publishChannel,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: false, url: ivUrl, prefer_large_media: true, show_above_text: false },
      reply_markup: campaignKeyboard,
      }, TELEGRAM_MAX_RETRIES, publishToken);
    }
    if (result.ok && result.result?.message_id) {
      return result.result.message_id;
    }

    logger.warn(`[rssAutoPublisher] publishToTelegram falló: ${result.description || 'error desconocido'}`);
    return null;
  } catch (err) {
    // Telegram es una salida secundaria: un timeout suyo nunca debe impedir que
    // el artículo se guarde y obtenga su URL propia en NoticiasWeb3.
    logger.warn(`[rssAutoPublisher] Telegram no disponible; el artículo se guardará igualmente: ${err.message}`);
    return null;
  }
}

async function updateTelegramPublishState(recordId, patch, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await pocketbaseClient.collection('nw3_noticias').update(recordId, {
        ...patch, telegram_publish_updated: new Date().toISOString(),
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(750 * attempt);
    }
  }
  throw lastError;
}

async function publishStoredRecordToTelegram(record, selectedHouseAd) {
  const attempts = Number(record.telegram_publish_attempts || 0) + 1;
  const publishChannel = record.telegram_publish_channel || PUBLISH_CHANNEL;
  const messageId = await publishToTelegram({
    titulo: record.titulo,
    contenido: record.contenido,
    categoria: record.categoria,
    hashtags: buildHashtags(record.categoria),
    excerpt: record.contenido,
  }, record.slug, selectedHouseAd, publishChannel);

  if (messageId) {
    const telegramUrl = `https://t.me/${publishChannel.replace(/^@/, '')}/${messageId}`;
    await updateTelegramPublishState(record.id, {
      telegram_url: telegramUrl,
      nw3_iv_added: false,
      community_ad_id: String(selectedHouseAd?.id || ''),
      telegram_publish_status: 'published',
      telegram_publish_attempts: attempts,
      telegram_publish_error: '',
    });
    return telegramUrl;
  }

  await updateTelegramPublishState(record.id, {
    telegram_publish_status: telegramPublishFailureStatus(attempts),
    telegram_publish_attempts: attempts,
    telegram_publish_error: 'Telegram no devolvio un message_id',
  });
  return '';
}

function telegramPublishFailureStatus(attempts) {
  return Number(attempts || 0) >= TELEGRAM_PENDING_RETRY_LIMIT ? 'failed' : 'pending';
}

function telegramPendingFilter(now = Date.now()) {
  const recentCutoff = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const publishLabels = RSS_APP_FEEDS.filter((feed) => feed.publishNew !== false)
    .map((feed) => `fuente_label="${String(feed.label || feed.url).replaceAll('"', '\\"')}"`)
    .join(' || ');
  return `telegram_url="" && telegram_publish_attempts < ${TELEGRAM_PENDING_RETRY_LIMIT} && (`
    + `telegram_publish_status="pending" || (`
    + `telegram_publish_status="" && created>="${recentCutoff}" && (${publishLabels})`
    + '))';
}

async function retryPendingTelegramPublications(selectedHouseAd) {
  if (!BOT_TOKEN) return { retried: 0, published: 0 };
  let records = [];
  try {
    records = await pocketbaseClient.collection('nw3_noticias').getFullList({
      filter: telegramPendingFilter(),
      sort: 'created',
      fields: 'id,titulo,slug,categoria,contenido,telegram_publish_channel,telegram_publish_attempts,created',
    });
  } catch (error) {
    logger.warn(`[rssAutoPublisher] No se pudo consultar la cola Telegram: ${error.message}`);
    return { retried: 0, published: 0 };
  }

  let published = 0;
  for (const record of records.slice(0, 10)) {
    try {
      const telegramUrl = await publishStoredRecordToTelegram(record, selectedHouseAd);
      if (telegramUrl) {
        published++;
        logger.info(`[rssAutoPublisher] Publicacion pendiente recuperada: ${telegramUrl}`);
      }
    } catch (error) {
      logger.warn(`[rssAutoPublisher] Reintento Telegram para ${record.slug}: ${error.message}`);
    }
    await sleep(TELEGRAM_CALL_DELAY_MS);
  }
  return { retried: Math.min(records.length, 10), published };
}

function parseTelegramViewCount(value = '') {
  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.').toUpperCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return null;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]] || 1;
  return Math.round(Number(match[1]) * multiplier);
}

async function fetchOfficialTelegramViews(telegramUrl) {
  const match = String(telegramUrl).match(/^https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (!match) return null;
  const url = `https://t.me/s/${match[1]}/${match[2]}?embed=1&mode=tme`;
  const response = await fetch(url, {
    headers: { 'User-Agent': FETCH_USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const html = await response.text();
  const views = html.match(/tgme_widget_message_views[^>]*>([^<]+)</i)?.[1];
  return parseTelegramViewCount(views);
}

async function syncOfficialTelegramViews() {
  try {
    const records = (await pocketbaseClient.collection('nw3_noticias').getFullList({
      filter: 'telegram_url != ""',
      sort: '-created',
      fields: 'id,telegram_url,telegram_views,telegram_views_synced,community_ad_id',
    })).slice(0, TELEGRAM_VIEWS_SYNC_LIMIT);
    let updated = 0;
    let impressions = 0;
    for (let offset = 0; offset < records.length; offset += 4) {
      const batch = records.slice(offset, offset + 4);
      const results = await Promise.allSettled(batch.map((record) => fetchOfficialTelegramViews(record.telegram_url)));
      for (let index = 0; index < batch.length; index++) {
        const record = batch[index];
        const result = results[index];
        const official = result.status === 'fulfilled' ? result.value : null;
        if (!Number.isSafeInteger(official) || official < 0) continue;
        const previous = Number(record.telegram_views || 0);
        const firstSync = record.telegram_views_synced !== true;
        const delta = firstSync ? 0 : Math.max(0, official - previous);
        await pocketbaseClient.collection('nw3_noticias').update(record.id, {
          telegram_views: Math.max(previous, official),
          telegram_views_synced: true,
        });
        updated++;
        if (delta > 0) {
          await recordContentEvent({ kind: 'news', targetId: record.id, eventType: 'impression', country: 'UNK', placement: 'telegram_channel', count: delta });
          if (record.community_ad_id) {
            await recordContentEvent({ kind: 'community_ad', targetId: record.community_ad_id, eventType: 'impression', country: 'UNK', placement: 'telegram_channel', count: delta });
          }
          impressions += delta;
        }
      }
    }
    logger.info(`[rssAutoPublisher] Telegram oficial: ${updated} posts sincronizados, +${impressions} impresiones.`);
  } catch (error) {
    logger.warn(`[rssAutoPublisher] No se pudieron sincronizar las impresiones oficiales de Telegram: ${error.message}`);
  }
}

// ── Backfill puntual ─────────────────────────────────────────────────────────
/**
 * backfillTelegramLinks
 * ---------------------
 * Recorre nw3_noticias buscando artículos que tengan telegram_url y cuyo
 * `contenido` aún NO incluya "Leer en NW3", y edita el mensaje original del
 * canal para añadirle el enlace. Corre periódicamente (IV_BACKFILL_INTERVAL_MS)
 * en lotes de IV_BACKFILL_MAX_PER_RUN, de más reciente a más antiguo.
 */
async function backfillTelegramLinks({ force = false, limit = IV_BACKFILL_MAX_PER_RUN, commandId = '' } = {}) {
  if (backfillRunning) return { ok: false, skipped: true, reason: 'backfill_running' };
  backfillRunning = true;
  try {
    if (!BOT_TOKEN) {
      logger.warn('[rssAutoPublisher] backfillTelegramLinks: BOT_TOKEN_NW3 no definido — se omite el backfill.');
      return { ok: false, skipped: true, reason: 'missing_token' };
    }

    await patchWorkerStatus({ mode: 'backfill', state: 'running', command_id: commandId || null,
      started_at: new Date().toISOString(), progress: { processed: 0, total: 0, edited: 0, failed: 0 } });

    // Posts del canal aún no reescritos al formato Instant View. El flag nw3_iv_added
    // evita reprocesar los ya editados en cada arranque.
    // Se excluyen los ya editados (nw3_iv_added) y los que Telegram rechazó de
    // forma definitiva (nw3_iv_failed), para no reintentarlos en cada ciclo.
    // Orden descendente: los posts recientes del canal son los que la gente ve.
    const records = (await pocketbaseClient.collection('nw3_noticias').getFullList({
      filter: force
        ? 'telegram_url != "" && nw3_iv_failed != true'
        : 'telegram_url != "" && nw3_iv_added != true && nw3_iv_failed != true',
      sort: '-created',
    })).slice(0, Math.min(Math.max(1, Number(limit) || IV_BACKFILL_MAX_PER_RUN), 500));

    if (records.length === 0) {
      logger.info('[rssAutoPublisher] backfillTelegramLinks: no hay artículos que actualizar.');
      const result = { ok: true, processed: 0, edited: 0, failed_permanent: 0, failed_transient: 0 };
      await patchWorkerStatus({ mode: 'backfill', state: 'completed', completed_at: new Date().toISOString(), progress: result });
      return result;
    }

    logger.info(`[rssAutoPublisher] backfillTelegramLinks: ${records.length} artículos por procesar.`);

    const liveResults = await Promise.allSettled(CHANNELS.map(fetchTelegramChannel));
    const livePosts = new Map(liveResults
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .filter((item) => item.telegramUrl && item.telegramOriginalText)
      .map((item) => [item.telegramUrl, item]));
    const telegramHouseAd = await loadTelegramHouseAd();

    let edited = 0;
    let failedPermanent = 0;
    let failedTransient = 0;

    for (const record of records) {
      try {
        let live = livePosts.get(record.telegram_url);
        if (!live?.telegramOriginalText) {
          live = await fetchTelegramPublicPost(record.telegram_url);
          if (live?.telegramOriginalText) {
            logger.info(`[rssAutoPublisher] backfillTelegramLinks: texto recuperado desde Telegram para ${record.telegram_url}.`);
          }
        }
        if (!live?.telegramOriginalText) {
          failedTransient++;
          logger.warn(`[rssAutoPublisher] backfillTelegramLinks: texto vivo no disponible por feed ni Telegram para ${record.telegram_url}; no se edita para proteger Inside Ads.`);
          continue;
        }
        // El backfill manual con `force` es una orden explícita del creador y
        // puede procesar registros importados hoy aunque el post sea antiguo.
        // El ciclo automático conserva la espera para dar tiempo a Inside Ads.
        if (!force && shouldDelayChannelEdit(live.pubDate || record.created)) {
          failedTransient++;
          logger.info(`[rssAutoPublisher] backfillTelegramLinks: ${record.telegram_url} se aplaza para permitir Inside Ads.`);
          continue;
        }
        const { ok, permanent, communityAdAdded, insideAdsPreserved } = await appendNw3LinkToTelegramPost(
          record.telegram_url,
          record.slug,
          live.telegramOriginalText,
          record.categoria,
          undefined,
          telegramHouseAd,
          live.insideAdsButton || null,
        );
        if (ok) {
          await pocketbaseClient.collection('nw3_noticias').update(record.id, {
            nw3_iv_added: true,
            community_ad_id: communityAdAdded ? String(telegramHouseAd?.id || '') : String(record.community_ad_id || ''),
          });
          edited++;
          logger.info(`[rssAutoPublisher] backfillTelegramLinks: IV y campaña añadidos a ${record.telegram_url}${insideAdsPreserved ? ' conservando Inside Ads' : ''}`);
        } else if (permanent) {
          failedPermanent++;
          await pocketbaseClient.collection('nw3_noticias').update(record.id, { nw3_iv_failed: true });
        } else {
          failedTransient++;
        }
      } catch (err) {
        // Fallo de red o de PocketBase: transitorio, se reintenta en el próximo
        // ciclo. No aborta el resto del lote.
        failedTransient++;
        logger.warn(`[rssAutoPublisher] backfillTelegramLinks: fallo transitorio en ${record.telegram_url}: ${err.message}`);
      }

      await sleep(TELEGRAM_BACKFILL_DELAY_MS); // ≥1.5 s entre llamadas: respeta el límite de la Bot API
    }

    logger.info(`[rssAutoPublisher] backfillTelegramLinks: completado sobre ${records.length} — ${edited} editados, ${failedPermanent} fallos definitivos, ${failedTransient} transitorios.`);
    const result = { ok: true, processed: records.length, edited,
      failed_permanent: failedPermanent, failed_transient: failedTransient };
    await patchWorkerStatus({ mode: 'backfill', state: 'completed', completed_at: new Date().toISOString(), progress: result });
    return result;
  } catch (err) {
    logger.error('[rssAutoPublisher] backfillTelegramLinks error:', err.message);
    await patchWorkerStatus({ mode: 'backfill', state: 'failed', completed_at: new Date().toISOString(), error: err.message });
    return { ok: false, error: err.message };
  } finally {
    backfillRunning = false;
  }
}

// ── Núcleo ─────────────────────────────────────────────────────────────────────
async function runAutoPublish() {
  if (autoPublishRunning) {
    logger.warn('[rssAutoPublisher] Se omite un ciclo solapado; el anterior sigue activo.');
    return;
  }
  autoPublishRunning = true;
  try {
    await patchWorkerStatus({ mode: 'rss', state: 'running', started_at: new Date().toISOString(),
      error: '', progress: { processed: 0, total: 0, created: 0, published: 0, edited: 0 }, feed_errors: [] });
    if (!BOT_TOKEN) {
      logger.warn('[rssAutoPublisher] BOT_TOKEN_NW3 no está definido en .env — se crearán artículos pero se omitirá la edición en Telegram.');
    }

    // 1. Reunir todos los feeds: canales Telegram + fijos + dinámicos.
    const telegramHouseAd = BOT_TOKEN ? await loadTelegramHouseAd() : null;
    const pendingResult = await retryPendingTelegramPublications(telegramHouseAd);
    if (pendingResult.retried) {
      logger.info(`[rssAutoPublisher] Cola Telegram: ${pendingResult.published}/${pendingResult.retried} publicaciones recuperadas.`);
    }

    const dynamicFeeds = await loadDynamicFeeds();
    const settled = await Promise.allSettled([
      ...CHANNELS.map(fetchTelegramChannel),
      // publishNew: true por defecto para los feeds rss.app; cada feed puede
      // desactivarlo con `publishNew: false` (p. ej. el del propio canal).
      ...RSS_APP_FEEDS.map((f) => fetchRssFeed({ publishNew: true, ...f })),
      ...dynamicFeeds.map((f) => fetchRssFeed({
        url: f.url,
        defaultCategory: f.defaultCategory || 'Tecnología',
        label: f.label || f.url,
      })),
    ]);

    // Los feeds que fallan NO pueden pasar desapercibidos: si se caen todos,
    // allItems queda vacío y el ciclo reportaría "Sin artículos nuevos", que es
    // indistinguible de un ciclo legítimamente vacío. Se loguea cada rechazo.
    const feedLabels = [
      ...CHANNELS.map((c) => `@${c.channel}`),
      ...RSS_APP_FEEDS.map((f) => f.label || f.url),
      ...dynamicFeeds.map((f) => f.label || f.url),
    ];
    const failedFeeds = settled
      .map((r, i) => (r.status === 'rejected' ? { label: feedLabels[i] || `feed#${i}`, reason: r.reason } : null))
      .filter(Boolean);

    for (const f of failedFeeds) {
      const cause = f.reason?.cause?.code || f.reason?.message || String(f.reason);
      logger.error(`[rssAutoPublisher] Feed caído: ${f.label} — ${cause}`);
    }
    if (failedFeeds.length === settled.length && settled.length > 0) {
      logger.error(`[rssAutoPublisher] TODOS los feeds (${settled.length}) han fallado en este ciclo: no hay datos, no es que no haya novedades.`);
    }

    await patchWorkerStatus({ feed_errors: failedFeeds.map((item) => ({
      label: item.label, error: item.reason?.cause?.code || item.reason?.message || String(item.reason),
    })) });
    const allItems = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // 2. Conjunto de URLs ya conocidas en nw3_noticias (fuente_url + telegram_url).
    const existing = await pocketbaseClient.collection('nw3_noticias').getFullList({
      fields: 'fuente_url,telegram_url,slug',
    });
    const knownUrls = new Set();
    const knownSlugs = new Set();
    for (const rec of existing) {
      if (rec.fuente_url) knownUrls.add(rec.fuente_url);
      if (rec.telegram_url) knownUrls.add(rec.telegram_url);
      if (rec.slug) knownSlugs.add(rec.slug);
    }

    // 3. Filtrar nuevos y deduplicar por fuente_url dentro de la misma ejecución.
    const seenThisRun = new Set();
    const fresh = [];
    for (const item of allItems) {
      if (!item.sourceUrl || knownUrls.has(item.sourceUrl) || seenThisRun.has(item.sourceUrl)) continue;
      // Dedup también por telegram_url: si ya existe un artículo con ese post de Telegram, no crear otro.
      if (item.telegramUrl && knownUrls.has(item.telegramUrl)) continue;
      seenThisRun.add(item.sourceUrl);
      fresh.push(item);
    }

    if (fresh.length === 0) {
      logger.info('[rssAutoPublisher] Sin artículos nuevos.');
      const result = { ok: true, processed: 0, total: 0, created: 0, published: 0, edited: 0 };
      await patchWorkerStatus({ mode: 'rss', state: 'completed', completed_at: new Date().toISOString(), progress: result });
      return result;
    }

    const batch = fresh.slice(0, MAX_NEW_PER_RUN);
    if (fresh.length > MAX_NEW_PER_RUN) {
      logger.info(`[rssAutoPublisher] ${fresh.length} nuevos; se procesan ${MAX_NEW_PER_RUN} en esta ejecución (resto, en la siguiente).`);
    }

    let created = 0;
    let edited = 0;
    let published = 0;
    const recentResults = [];

    // 4. Crear cada artículo y, según su origen, publicar un post nuevo (feeds
    //    rss.app) o editar el post original del canal (canales de Telegram).
    for (const item of batch) {
      try {
        // Descarta contenido patrocinado/publicitario: ni se crea en PocketBase
        // ni se publica/edita en Telegram.
        // En posts de IFTTT, “publicidad” puede proceder del bloque añadido por
        // Inside Ads y no del artículo fuente; no debe impedir su importación.
        if (!item.isIfttt && isSponsored(item.title, item.fullText || item.excerpt)) {
          logger.warn(`[rssAutoPublisher] Contenido patrocinado descartado: "${item.title}" (${item.label})`);
          continue;
        }

        // Slug único: base + hash de la fuente; si colisiona, sufijo incremental.
        let slug = `${generarSlug(item.title)}-${shortHash(item.sourceUrl)}`;
        let n = 2;
        while (knownSlugs.has(slug)) {
          slug = `${generarSlug(item.title)}-${shortHash(item.sourceUrl)}-${n++}`;
        }
        knownSlugs.add(slug);

        const titulo = item.title.length > 200 ? `${item.title.slice(0, 199)}…` : item.title;

        // Enriquecer con el cuerpo completo del artículo original: si se puede
        // descargar y extraer ≥200 caracteres, se usa como base de la reescritura;
        // si no, se recurre al extracto del feed.
        const fullContent = await fetchArticleContent(item.sourceUrl);
        const baseText = fullContent || item.excerpt;

        // Con el texto completo recalculamos la categoría (tiene más señal que el extracto).
        const categoria = fullContent
          ? detectCategory(`${titulo} ${fullContent}`, item.category)
          : item.category;

        const contenidoReescrito = rewriteText(baseText, categoria);
        // Hashtags: categoría + #NW3 + entidades del contenido (máx. 5 en total).
        const hashtags = buildHashtagsFromContent(categoria, `${titulo}\n${baseText}`);
        // Imagen del feed (URL remota válida), si el artículo la trae.
        const imagen = safeImageUrl(item.image);

        // Feeds rss.app: publicar como post NUEVO y usar su enlace como telegram_url.
        let telegramUrl = item.publishNew ? '' : (item.telegramUrl || '');
        const createdRecord = await createNewsRecordWithRetry({
          titulo,
          slug,
          categoria,
          fecha: pubDateToDisplay(item.pubDate),
          contenido: `${contenidoReescrito}\n\n${hashtags}`,
          fuente_label: item.label || '',
          fuente_url: item.sourceUrl,
          imagen,
          telegram_url: telegramUrl,
          year: yearOf(item.pubDate),
          destacado: false,
          nw3_iv_added: false,
          community_ad_id: '',
          telegram_views: 0,
          telegram_views_synced: false,
          telegram_publish_status: item.publishNew ? 'pending' : 'not_applicable',
          telegram_publish_attempts: 0,
          telegram_publish_error: '',
          telegram_publish_updated: new Date().toISOString(),
          telegram_publish_channel: item.publishChannel || PUBLISH_CHANNEL,
        });
        created++;
        knownUrls.add(item.sourceUrl);
        if (telegramUrl) knownUrls.add(telegramUrl);

        if (tokenForPublishChannel(item.publishChannel) && item.publishNew) {
          telegramUrl = await publishStoredRecordToTelegram({
            ...createdRecord,
            titulo,
            slug,
            categoria,
            contenido: `${contenidoReescrito}\n\n${hashtags}`,
            telegram_publish_channel: item.publishChannel || PUBLISH_CHANNEL,
            telegram_publish_attempts: 0,
          }, telegramHouseAd);
          if (telegramUrl) {
            knownUrls.add(telegramUrl);
            published++;
            logger.info(`[rssAutoPublisher] Publicado en Telegram: ${telegramUrl}`);
          }
          await sleep(TELEGRAM_CALL_DELAY_MS);
        }
        logger.info(`[rssAutoPublisher] Artículo creado: ${slug} (${item.label})`);

        // Canales de Telegram: editar el post original añadiendo el enlace a NW3.
        if (BOT_TOKEN && !item.publishNew && item.telegramUrl) {
          if (shouldDelayChannelEdit(item.pubDate)) {
            logger.info(`[rssAutoPublisher] Edición aplazada para que Inside Ads procese ${item.telegramUrl}.`);
            continue;
          }
          const { ok, communityAdAdded, insideAdsPreserved } = await appendNw3LinkToTelegramPost(
            item.telegramUrl, slug, item.telegramOriginalText || item.fullText, categoria, hashtags, telegramHouseAd,
          );
          if (ok) {
            await pocketbaseClient.collection('nw3_noticias').update(createdRecord.id, {
              nw3_iv_added: true,
              community_ad_id: communityAdAdded ? String(telegramHouseAd?.id || '') : '',
            });
            edited++;
            logger.info(`[rssAutoPublisher] Enlace NW3 y campaña añadidos: ${item.telegramUrl}${insideAdsPreserved ? ' conservando Inside Ads' : ''}`);
          }
          await sleep(TELEGRAM_CALL_DELAY_MS);
        }
        recentResults.push({ title: titulo, source: item.label, telegram_url: telegramUrl || '', ok: true });
      } catch (err) {
        logger.error(`[rssAutoPublisher] Error procesando "${item.title}": ${err.message}`);
        recentResults.push({ title: item.title, source: item.label, ok: false, error: err.message });
      }
    }

    logger.info(`[rssAutoPublisher] Ejecución completada: ${created} artículos creados, ${published} posts publicados, ${edited} posts editados en Telegram.`);
    const result = { ok: true, processed: batch.length, total: fresh.length, created, published, edited };
    await patchWorkerStatus({ mode: 'rss', state: 'completed', completed_at: new Date().toISOString(), progress: result,
      last_result: recentResults.at(-1) || null, recent_results: recentResults.slice(-10) });
    return result;
  } catch (err) {
    logger.error('[rssAutoPublisher] Error:', err.message);
    await patchWorkerStatus({ mode: 'rss', state: 'failed', completed_at: new Date().toISOString(), error: err.message });
    return { ok: false, error: err.message };
  } finally {
    autoPublishRunning = false;
  }
}

export function startRssAutoPublisher(intervalMs = INTERVAL_MS) {
  runAutoPublish();
  return setInterval(runAutoPublish, intervalMs);
}

// Backfill de Instant View como job periódico propio. No se espera al primer
// ciclo: arranca en segundo plano para no retrasar al resto de jobs del worker.
export function startTelegramLinkBackfill(intervalMs = IV_BACKFILL_INTERVAL_MS) {
  const run = () => backfillTelegramLinks().catch((err) =>
    logger.error(`[rssAutoPublisher] backfillTelegramLinks: ${err.message}`));
  run();
  return setInterval(run, intervalMs);
}

export function startOfficialTelegramViewsSync(intervalMs = TELEGRAM_VIEWS_SYNC_INTERVAL_MS) {
  const run = () => syncOfficialTelegramViews().catch((error) =>
    logger.error(`[rssAutoPublisher] syncOfficialTelegramViews: ${error.message}`));
  run();
  return setInterval(run, intervalMs);
}

async function processRssWorkerCommand() {
  const commandRecord = await readWorkerSetting(WORKER_COMMAND_KEY);
  const command = commandRecord?.value || {};
  if (!command.id || command.state !== 'pending') return;

  await pocketbaseClient.collection('nw3_settings').update(commandRecord.id, {
    value: { ...command, state: 'accepted', accepted_at: new Date().toISOString() },
  });
  await patchWorkerStatus({ command_id: command.id, command_action: command.action });

  let result;
  if (command.action === 'run_now') result = await runAutoPublish();
  else if (command.action === 'backfill') result = await backfillTelegramLinks({
    force: command.force !== false, limit: command.limit, commandId: command.id,
  });
  else result = { ok: false, error: 'unknown_command' };

  await pocketbaseClient.collection('nw3_settings').update(commandRecord.id, {
    value: { ...command, state: result?.ok === false ? 'failed' : 'completed',
      completed_at: new Date().toISOString(), result },
  });
}

export function startRssWorkerControl(intervalMs = WORKER_CONTROL_INTERVAL_MS) {
  const poll = () => processRssWorkerCommand().catch((error) =>
    logger.warn(`[rssAutoPublisher] Control del worker no disponible: ${error.message}`));
  poll();
  return setInterval(poll, intervalMs);
}

export {
  backfillTelegramLinks,
  runAutoPublish,
  fetchArticleContent,
  detectCategory,
  buildHashtagsFromContent,
  sourceUrlFromTelegramPost,
  summarize,
  cleanTelegramSummaryText,
  cleanTelegramEditedBase,
  htmlToPlainText,
  isWorkerPublishedRecord,
  shouldDelayChannelEdit,
  hasInsideAdsPromotion,
  extractInsideAdsPromotion,
  extractInsideAdsButton,
  parseTelegramPublicPost,
  buildTelegramPostKeyboard,
  formatTelegramHouseAd,
  formatTelegramHouseAdMarkdown,
  formatTelegramNewsRichMarkdown,
  formatTelegramBackfillRichMarkdown,
  telegramHouseAdTrackingUrl,
  parseTelegramViewCount,
  fetchOfficialTelegramViews,
  syncOfficialTelegramViews,
  telegramPendingFilter,
  telegramPublishFailureStatus,
};
