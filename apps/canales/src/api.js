// ═════════════════════════════════════════════════════════════════════════════
//  api.js — ÚNICA FRONTERA DE DATOS DE LA APP.
//
//  Ningún componente hace fetch ni importa el mock directamente: todos pasan por
//  las funciones de aquí. Estrategia HÍBRIDA:
//    1. Se consulta la API real del bot (CintiaBot/moonbot, endpoints públicos).
//    2. Si la API falla o aún no hay canales registrados, se cae al mock para
//       que el directorio siga poblado (modo demo).
//  Cuando haya ≥1 canal real (alguien añade @CintiaBot como admin), esos datos
//  reemplazan al mock automáticamente.
//
//  Para forzar solo-real: define VITE_API_ONLY=1.  Base configurable: VITE_API_URL.
// ═════════════════════════════════════════════════════════════════════════════

import { CHANNELS, CATEGORIES, computeGlobalStats } from './_mock/data.js'

const API_BASE =
  import.meta.env.VITE_API_URL ?? 'https://cintiabot.todosobreall.tech/api/public/stats'
const API_ONLY = import.meta.env.VITE_API_ONLY === '1'

const delay = (ms = 240) => new Promise((res) => setTimeout(res, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))
const toRow = ({ series, posts, ...row }) => row

export const SORTS = [
  { id: 'subscribers', label: 'Suscriptores' },
  { id: 'growth30d', label: 'Crecimiento' },
  { id: 'viewsPerPost', label: 'Vistas por post' },
  { id: 'engagement', label: 'Engagement' },
]

// ── Utilidades de red ─────────────────────────────────────────────────────────
async function apiGet(path, { timeout = 6000 } = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: ctl.signal })
    if (!r.ok) return null
    const data = await r.json()
    return data && data.ok ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// Normaliza un canal del backend a la forma que espera el frontend.
const GRADS = [['#36b6f0', '#5b8af1'], ['#3ee0c7', '#36b6f0'], ['#9b6cf0', '#5b8af1'], ['#6de08c', '#3ee0c7']]
function normalize(c) {
  const name = c.name || c.username || 'Canal'
  const initials = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'CH'
  const idx = Math.abs([...String(c.username || name)].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % GRADS.length
  return {
    username: c.username,
    name,
    desc: c.description ?? c.desc ?? '',
    category: c.category || 'sin-categoria',
    subscribers: c.subscribers ?? 0,
    growth30d: c.growth30d ?? 0,
    viewsPerPost: c.viewsPerPost ?? null, // null → la UI muestra "—" (no disponible vía Bot API)
    engagement: c.engagement ?? null,
    postsPerDay: c.postsPerDay ?? 0,
    verified: !!c.verified,
    collecting: !!c.collecting,
    initials,
    color: GRADS[idx],
    series: c.series || [],
    posts: c.posts || [],
  }
}

// ── Endpoints (real con fallback a mock) ────────────────────────────────────────

export async function getGlobalStats() {
  const real = await apiGet('/global')
  if (real && real.channels > 0) {
    return {
      channels: real.channels,
      categories: real.categories,
      totalSubscribers: real.totalSubscribers,
      dailyViews: real.dailyViews ?? null,
      avgGrowth: real.avgGrowth,
    }
  }
  if (API_ONLY && real) return { channels: 0, categories: 0, totalSubscribers: 0, dailyViews: null, avgGrowth: 0 }
  await delay(120)
  return computeGlobalStats()
}

export async function getCategories() {
  // Las categorías son presentación; se mantienen en el cliente.
  await delay(80)
  return clone(CATEGORIES)
}

export async function getChannels({ q = '', sort = 'subscribers', category = 'all', dir = 'desc' } = {}) {
  const params = new URLSearchParams({ q, sort, category })
  const real = await apiGet(`/channels?${params}`)
  if (real && Array.isArray(real.channels) && real.channels.length > 0) {
    return real.channels.map(normalize).map(toRow)
  }
  if (API_ONLY) return []

  // Fallback mock (mismo filtrado/orden en cliente).
  await delay(160)
  let rows = CHANNELS.map(toRow)
  if (category && category !== 'all') rows = rows.filter((c) => c.category === category)
  const needle = q.trim().toLowerCase()
  if (needle) {
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.username.toLowerCase().includes(needle) ||
        c.desc.toLowerCase().includes(needle),
    )
  }
  const sign = dir === 'asc' ? 1 : -1
  rows.sort((a, b) => ((a[sort] ?? 0) - (b[sort] ?? 0)) * sign)
  return clone(rows)
}

export async function getChannel(username) {
  const key = String(username).replace(/^@/, '')
  const real = await apiGet(`/channels/${encodeURIComponent(key)}`)
  if (real && real.channel) return normalize(real.channel)
  if (API_ONLY) return null

  await delay(160)
  const c = CHANNELS.find((x) => x.username.toLowerCase() === key.toLowerCase())
  return c ? clone(c) : null
}

export async function getRanking(categoryId, limit = 10) {
  const real = await apiGet(`/ranking?category=${encodeURIComponent(categoryId)}`)
  if (real && Array.isArray(real.ranking) && real.ranking.length > 0) {
    return real.ranking.map(normalize).map(toRow).slice(0, limit)
  }
  if (API_ONLY) return []

  await delay(160)
  return CHANNELS.filter((c) => c.category === categoryId)
    .map(toRow)
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, limit)
}
