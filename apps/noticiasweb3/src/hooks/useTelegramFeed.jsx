import { useState, useEffect } from 'react';

const CHANNELS = [
  { channel: 'TodoSobreAllTech',    defaultCategory: 'Tecnología' },
  { channel: 'resistencia_censura', defaultCategory: 'Ciberseguridad' },
];

// Añade feeds de rss.app aquí:
// { url: 'https://rss.app/feeds/XXXX.xml', defaultCategory: 'Tecnología', label: 'Nombre fuente' }
const RSS_APP_FEEDS = [
  { url: 'https://rss.app/feeds/O0p1q9sUZa2wfaMo.xml',          defaultCategory: 'Ciberseguridad', label: 'NetBlocks' },
  { url: 'https://rss.app/feeds/v1.1/2IXDCnAS3PkRh3bD.json',    defaultCategory: 'Ciberseguridad', label: 'Hispasec' },
  { url: 'https://rss.app/feeds/v1.1/6dDuQLH543ORu2d9.json',    defaultCategory: 'Ciberseguridad', label: 'NIST' },
  { url: 'https://rss.app/feeds/v1.1/ivImG3xZTTMBDaY8.json',    defaultCategory: 'Tecnología',     label: 'Portaltic' },
];

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

function detectCategory(text, defaultCategory) {
  const lower = ` ${text.toLowerCase()} `;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return defaultCategory;
}

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function proxyUrl(rssUrl) {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
}

function telegramApiUrl(channel) {
  return proxyUrl(`https://rsshub.app/telegram/channel/${channel}`);
}

function pubDateToDisplay(str) {
  const d = new Date(str);
  if (isNaN(d)) return '';
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} del ${d.getFullYear()}`;
}

function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function linkToId(link) {
  return link.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40);
}

// Telegram via RSSHub: no tiene título propio, lo extrae de la primera línea del cuerpo
function normalizeTelegramItems(items, channel, defaultCategory, excludeUrls) {
  return items
    .filter(item => item.link && !excludeUrls.has(item.link))
    .map(item => {
      const idMatch = item.link.match(/\/(\d+)$/);
      const postId = idMatch ? idMatch[1] : item.guid;
      const text = stripHtml(item.description || item.content || '');
      const lines = text.split('\n').filter(l => l.trim());
      const firstLine = lines[0] || '';
      const title = firstLine.length > 90 ? firstLine.slice(0, 90) + '…' : firstLine || 'Publicación del canal';
      return {
        id: `tg-${channel}-${postId}`,
        slug: `tg-${channel}-${postId}`,
        title,
        date: pubDateToDisplay(item.pubDate),
        category: detectCategory(title + ' ' + text, defaultCategory),
        year: 2026,
        destacado: false,
        body: <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>,
        source: { url: item.link, label: `@${channel} en Telegram` },
        externalUrl: item.link,
        telegramUrl: item.link,
      };
    });
}

// rss.app y feeds RSS genéricos (XML vía rss2json): tienen título propio en item.title
function normalizeRssItems(items, defaultCategory, label, excludeUrls) {
  return items
    .filter(item => item.link && !excludeUrls.has(item.link))
    .map(item => {
      const rawTitle = stripHtml(item.title || '');
      const text = stripHtml(item.description || item.content || '');
      const title = rawTitle
        ? (rawTitle.length > 120 ? rawTitle.slice(0, 120) + '…' : rawTitle)
        : (text.slice(0, 90) + '…');
      const id = `rss-${linkToId(item.link)}`;
      return {
        id,
        slug: id,
        title,
        date: pubDateToDisplay(item.pubDate),
        category: detectCategory(title + ' ' + text, defaultCategory),
        year: 2026,
        destacado: false,
        body: <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>,
        source: label ? { url: item.link, label } : null,
        externalUrl: item.link,
      };
    });
}

// JSON Feed v1.1 (rss.app *.json): fetch directo sin proxy
function normalizeJsonFeedItems(items, defaultCategory, label, excludeUrls) {
  return (items || [])
    .filter(item => item.url && !excludeUrls.has(item.url))
    .map(item => {
      const rawTitle = item.title || '';
      const text = stripHtml(item.content_html || item.content_text || '');
      const title = rawTitle.length > 120 ? rawTitle.slice(0, 120) + '…' : rawTitle || text.slice(0, 90) + '…';
      const id = `rss-${linkToId(item.url)}`;
      return {
        id,
        slug: id,
        title,
        date: pubDateToDisplay(item.date_published),
        category: detectCategory(title + ' ' + text, defaultCategory),
        year: 2026,
        destacado: false,
        body: <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>,
        source: label ? { url: item.url, label } : null,
        externalUrl: item.url,
      };
    });
}

function fetchFeed(url, defaultCategory, label, excludeUrls) {
  if (url.endsWith('.json')) {
    return fetch(url)
      .then(r => r.json())
      .then(data => normalizeJsonFeedItems(data.items, defaultCategory, label, excludeUrls));
  }
  return fetch(proxyUrl(url))
    .then(r => r.json())
    .then(data => data.status === 'ok'
      ? normalizeRssItems(data.items, defaultCategory, label, excludeUrls)
      : []
    );
}

// rssFeeds: array dinámico de { url, defaultCategory, label } cargado desde PocketBase
export function useTelegramFeed(excludeUrls, rssFeeds = []) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const rssKey = JSON.stringify(rssFeeds);

  useEffect(() => {
    setLoading(true);
    const allRssFeeds = [...RSS_APP_FEEDS, ...rssFeeds];

    const telegramFetches = CHANNELS.map(({ channel, defaultCategory }) =>
      fetch(telegramApiUrl(channel))
        .then(r => r.json())
        .then(data => data.status === 'ok'
          ? normalizeTelegramItems(data.items, channel, defaultCategory, excludeUrls)
          : []
        )
    );

    const rssFetches = allRssFeeds.map(({ url, defaultCategory, label }) =>
      fetchFeed(url, defaultCategory, label, excludeUrls)
    );

    Promise.allSettled([...telegramFetches, ...rssFetches])
      .then(results => {
        const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
        // Deduplicar por URL externa por si dos feeds traen el mismo artículo
        const seenUrls = new Set();
        const deduped = all.filter(p => {
          const url = p.externalUrl || p.telegramUrl;
          if (!url || seenUrls.has(url)) return false;
          seenUrls.add(url);
          return true;
        });
        setPosts(deduped);
      })
      .finally(() => setLoading(false));
  }, [rssKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, loading };
}
