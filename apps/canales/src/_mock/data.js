// ─────────────────────────────────────────────────────────────────────────────
//  DATOS MOCK — privado. NINGÚN componente debe importar este fichero.
//  La única frontera de datos es src/api.js, que consume esto y lo expone
//  mediante funciones async. Para conectar la API real: editar SOLO api.js.
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'tech', name: 'Tecnología', accent: 'cyan' },
  { id: 'web3', name: 'Web3', accent: 'violet' },
  { id: 'gaming', name: 'Gaming', accent: 'green' },
  { id: 'privacidad', name: 'Privacidad', accent: 'teal' },
  { id: 'cripto', name: 'Cripto', accent: 'amber' },
  { id: 'comunidad', name: 'Comunidad', accent: 'blue' },
]

// PRNG determinista (Mulberry32) sembrado por el @username, para que las series
// y los posts sean estables entre recargas y coherentes entre vistas.
function seedFrom(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000
// Fecha ancla fija (no usamos Date.now para que el mock sea reproducible).
const TODAY = new Date('2026-07-12T00:00:00Z').getTime()
const isoDay = (ts) => new Date(ts).toISOString().slice(0, 10)

// Reconstruye 30 días de historia de suscriptores terminando en `subscribers`,
// consistente con el crecimiento a 30 días declarado.
function buildSeries(username, subscribers, growth30d, days = 30) {
  const rnd = mulberry32(seedFrom(username))
  const start = Math.round(subscribers / (1 + growth30d / 100))
  const totalGain = subscribers - start
  const series = []
  let acc = 0
  const weights = []
  for (let i = 0; i < days; i++) weights.push(0.6 + rnd() * 0.8)
  const wsum = weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < days; i++) {
    acc += weights[i]
    const subs = Math.round(start + (totalGain * acc) / wsum)
    series.push({ date: isoDay(TODAY - (days - 1 - i) * DAY), subs })
  }
  series[series.length - 1].subs = subscribers
  return series
}

const POST_TOPICS = {
  tech: ['Filtración de specs', 'Tutorial self-hosting', 'Análisis de la actualización', 'Comparativa de herramientas', 'Guía paso a paso', 'Hilo técnico'],
  web3: ['Airdrop confirmado', 'Análisis on-chain', 'Nuevo protocolo DeFi', 'Alerta de rug pull', 'Resumen de gobernanza', 'Métricas de la red'],
  gaming: ['Filtración del próximo AAA', 'Gameplay comentado', 'Parche y notas', 'Récord speedrun', 'Review sin spoilers', 'Directo de esta noche'],
  privacidad: ['Cómo cifrar tu tráfico', 'Alerta de vigilancia', 'Guía de anonimato', 'Nuevo bloqueo y cómo saltarlo', 'Auditoría de una app', 'VPN vs proxy'],
  cripto: ['Movimiento de ballenas', 'Análisis técnico BTC', 'Calendario de listados', 'Resumen macro', 'Alerta de volatilidad', 'Hilo de fundamentos'],
  comunidad: ['Novedades del bot', 'AMA de la semana', 'Encuesta a la comunidad', 'Changelog', 'Nuevo mirror disponible', 'Resumen semanal'],
}

function buildPosts(username, category, viewsPerPost, count = 6) {
  const rnd = mulberry32(seedFrom(username + 'posts'))
  const topics = POST_TOPICS[category] || POST_TOPICS.tech
  const posts = []
  for (let i = 0; i < count; i++) {
    const jitter = 0.6 + rnd() * 0.95 // vistas alrededor de la media
    const views = Math.round(viewsPerPost * jitter)
    posts.push({
      id: `${username}-${i}`,
      date: isoDay(TODAY - i * Math.round(1 + rnd() * 2) * DAY),
      text: topics[i % topics.length],
      views,
      reactions: Math.round(views * (0.02 + rnd() * 0.05)),
      forwards: Math.round(views * (0.008 + rnd() * 0.02)),
    })
  }
  return posts
}

// Definiciones base (números introducidos a mano para que sean plausibles).
// El resto (engagement, series, posts) se deriva de aquí.
const BASE = [
  { username: 'todosobrealltech',      name: 'TodoSobreAllTech',       category: 'tech',       subscribers: 48210, growth30d: 3.4, viewsPerPost: 21400, postsPerDay: 3.1, verified: true,  color: ['#36b6f0', '#5b8af1'], desc: 'Todo sobre tecnología, privacidad y autohospedaje. El canal insignia de la red.' },
  { username: 'noticiasweb3',          name: 'Noticias Web3',          category: 'web3',       subscribers: 31740, growth30d: 5.8, viewsPerPost: 15200, postsPerDay: 4.2, verified: true,  color: ['#9b6cf0', '#5b8af1'], desc: 'Cobertura diaria de Web3, DeFi y el ecosistema descentralizado.' },
  { username: 'comunidadtelebots',     name: 'ComunidadTelebots',      category: 'comunidad',  subscribers: 12680, growth30d: 2.1, viewsPerPost: 7300,  postsPerDay: 1.4, verified: true,  color: ['#3ee0c7', '#36b6f0'], desc: 'La comunidad detrás de los bots y las webs. Novedades, changelog y AMAs.' },
  { username: 'resistenciaalacensura', name: 'Resistencia a la Censura', category: 'privacidad', subscribers: 27450, growth30d: 6.9, viewsPerPost: 13800, postsPerDay: 2.3, verified: false, color: ['#3ee0c7', '#6de08c'], desc: 'Herramientas y guías para saltar bloqueos y proteger tu privacidad.' },
  { username: 'todosobregameplays',    name: 'TodoSobreGameplays',     category: 'gaming',     subscribers: 19340, growth30d: 4.1, viewsPerPost: 9600,  postsPerDay: 2.8, verified: false, color: ['#6de08c', '#3ee0c7'], desc: 'Gameplays, filtraciones y análisis sin spoilers de los juegos del momento.' },
  { username: 'gamergitbug',           name: 'gamergitbug',            category: 'gaming',     subscribers: 8120,  growth30d: 9.2, viewsPerPost: 5400,  postsPerDay: 1.9, verified: false, color: ['#f0688c', '#9b6cf0'], desc: 'Bugs, exploits y rincones raros de los videojuegos. Canal personal.' },

  // Relleno para poblar directorio, ranking y buscador.
  { username: 'inteligenciartificial', name: 'IA en Español',          category: 'tech',       subscribers: 61200, growth30d: 4.6, viewsPerPost: 27800, postsPerDay: 3.6, verified: true,  color: ['#36b6f0', '#3ee0c7'], desc: 'Modelos, papers y herramientas de IA explicados en español.' },
  { username: 'criptonoticias24',      name: 'Cripto Noticias 24h',    category: 'cripto',     subscribers: 54300, growth30d: 2.7, viewsPerPost: 22100, postsPerDay: 5.4, verified: true,  color: ['#ffb43c', '#f0688c'], desc: 'Mercado cripto en tiempo real: precios, listados y análisis.' },
  { username: 'gamingleaks',           name: 'Gaming Leaks ES',        category: 'gaming',     subscribers: 42870, growth30d: 1.8, viewsPerPost: 18400, postsPerDay: 2.1, verified: false, color: ['#6de08c', '#5b8af1'], desc: 'Las filtraciones más comentadas de la industria del videojuego.' },
  { username: 'devsenespanol',         name: 'Devs en Español',        category: 'tech',       subscribers: 38940, growth30d: 3.9, viewsPerPost: 12900, postsPerDay: 1.7, verified: false, color: ['#5b8af1', '#36b6f0'], desc: 'Programación, arquitectura y carrera para desarrolladores hispanohablantes.' },
  { username: 'web3latam',             name: 'Web3 LATAM',             category: 'web3',       subscribers: 17650, growth30d: 7.4, viewsPerPost: 8100,  postsPerDay: 2.5, verified: false, color: ['#9b6cf0', '#36b6f0'], desc: 'El ecosistema Web3 desde Latinoamérica: proyectos, eventos y oportunidades.' },
  { username: 'privacidadtotal',       name: 'Privacidad Total',       category: 'privacidad', subscribers: 22110, growth30d: 1.2, viewsPerPost: 9900,  postsPerDay: 1.1, verified: false, color: ['#3ee0c7', '#5b8af1'], desc: 'OPSEC, cifrado y minimización de huella digital para todos los públicos.' },
  { username: 'selfhostedes',          name: 'Self-Hosted ES',         category: 'tech',       subscribers: 9840,  growth30d: 5.1, viewsPerPost: 4600,  postsPerDay: 0.9, verified: false, color: ['#36b6f0', '#6de08c'], desc: 'Monta tus propios servicios: Docker, NAS, Traefik y homelab.' },
  { username: 'defialertas',           name: 'DeFi Alertas',           category: 'cripto',     subscribers: 14520, growth30d: 8.3, viewsPerPost: 6700,  postsPerDay: 4.8, verified: false, color: ['#ffb43c', '#3ee0c7'], desc: 'Alertas de yield, nuevos pools y movimientos de ballenas en DeFi.' },
]

// Dataset completo, ya derivado.
export const CHANNELS = BASE.map((c) => {
  const series = buildSeries(c.username, c.subscribers, c.growth30d)
  return {
    ...c,
    engagement: +((c.viewsPerPost / c.subscribers) * 100).toFixed(1), // vistas/subs en %
    initials: c.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(),
    series,
    posts: buildPosts(c.username, c.category, c.viewsPerPost),
  }
})

export function computeGlobalStats() {
  const totalSubs = CHANNELS.reduce((a, c) => a + c.subscribers, 0)
  const totalViews = CHANNELS.reduce((a, c) => a + c.viewsPerPost * c.postsPerDay, 0)
  const avgGrowth = CHANNELS.reduce((a, c) => a + c.growth30d, 0) / CHANNELS.length
  return {
    channels: CHANNELS.length,
    categories: CATEGORIES.length,
    totalSubscribers: totalSubs,
    dailyViews: Math.round(totalViews),
    avgGrowth: +avgGrowth.toFixed(1),
  }
}
