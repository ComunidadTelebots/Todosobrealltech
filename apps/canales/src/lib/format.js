// Formateo de números para mostrar con JetBrains Mono.

/** 48210 -> "48,2K" · 1200000 -> "1,2M" */
export function compact(n) {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return trim(n / 1_000_000) + 'M'
  if (abs >= 1_000) return trim(n / 1_000) + 'K'
  return String(Math.round(n))
}

function trim(x) {
  // una decimal, con coma decimal (es-ES), sin ".0"
  const s = x.toFixed(1).replace(/\.0$/, '')
  return s.replace('.', ',')
}

/** 48210 -> "48.210" (separador de miles es-ES) */
export function thousands(n) {
  if (n == null || isNaN(n)) return '—'
  return Math.round(n).toLocaleString('es-ES')
}

/** 3.4 -> "+3,4%" · -1.2 -> "−1,2%" */
export function pct(n, { sign = true } = {}) {
  if (n == null || isNaN(n)) return '—'
  const s = n.toFixed(1).replace('.', ',')
  if (!sign) return s + '%'
  if (n > 0) return '+' + s + '%'
  if (n < 0) return '−' + s.replace('-', '') + '%'
  return s + '%'
}

/** "2026-07-12" -> "12 jul" */
export function shortDate(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** posts/día -> texto de frecuencia legible */
export function frequency(postsPerDay) {
  if (postsPerDay >= 1) return `${postsPerDay.toFixed(1).replace('.', ',')}/día`
  const perWeek = Math.round(postsPerDay * 7)
  return `${perWeek}/sem`
}
