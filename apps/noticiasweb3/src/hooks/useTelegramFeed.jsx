import { useState, useEffect } from 'react';

const CHANNELS = [
  { channel: 'TodoSobreAllTech',    defaultCategory: 'Tecnología' },
  { channel: 'resistencia_censura', defaultCategory: 'Ciberseguridad' },
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
  ],
  'Espacio': [
    'nasa', 'espacio', 'cohete', 'satélite', 'órbita', 'astronauta', 'spacex',
    'marte', 'luna', 'telescopio', 'hubble', 'james webb', 'iss', 'estación espacial',
    'lanzamiento espacial', 'exoplaneta', 'asteroide', 'cometa', 'galaxia',
    'agujero negro', 'esa ', 'cosmos', 'universo', 'supernova',
  ],
  'Móviles': [
    'iphone', 'android', 'smartphone', 'móvil', 'samsung', 'pixel', 'oneplus',
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

function apiUrl(channel) {
  const rss = `https://rsshub.app/telegram/channel/${channel}`;
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=50`;
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

function normalizeItems(items, channel, defaultCategory, excludeUrls) {
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

export function useTelegramFeed(excludeUrls) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled(
      CHANNELS.map(({ channel, defaultCategory }) =>
        fetch(apiUrl(channel))
          .then(r => r.json())
          .then(data => data.status === 'ok'
            ? normalizeItems(data.items, channel, defaultCategory, excludeUrls)
            : []
          )
      )
    ).then(results => {
      const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      setPosts(all);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, loading };
}
