import { CATEGORIES } from '../_mock/data.js'
import { pct, compact } from '../lib/format.js'

// Nota: CATEGORIES aquí se usa solo para el mapa id→nombre/acento de presentación.
// Los datos de negocio siguen llegando exclusivamente por api.js.
const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

const ACCENT = {
  cyan: 'text-cyan',
  violet: 'text-violet',
  green: 'text-green',
  teal: 'text-teal',
  amber: 'text-amber',
  blue: 'text-blue',
}
const ACCENT_BG = {
  cyan: 'bg-cyan/10 text-cyan',
  violet: 'bg-violet/10 text-violet',
  green: 'bg-green/10 text-green',
  teal: 'bg-teal/10 text-teal',
  amber: 'bg-amber/10 text-amber',
  blue: 'bg-blue/10 text-blue',
}

/** Avatar con gradiente de marca + iniciales (mono). */
export function Avatar({ channel, size = 44 }) {
  const [a, b] = channel.color || ['#3ee0c7', '#36b6f0']
  return (
    <div
      className="flex-shrink-0 grid place-items-center rounded-full font-mono font-semibold text-bg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        boxShadow: `0 6px 18px -8px ${b}`,
      }}
      aria-hidden
    >
      {channel.initials}
    </div>
  )
}

/** Etiqueta de categoría. */
export function CategoryPill({ id, className = '' }) {
  const cat = CAT_MAP[id]
  if (!cat) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ACCENT_BG[cat.accent]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cat.name}
    </span>
  )
}

/** Badge de crecimiento (verde sube / rosa baja) con flecha — nunca color solo. */
export function GrowthBadge({ value, className = '' }) {
  const up = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-sm font-medium ${up ? 'text-green' : 'text-rose'} ${className}`}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {pct(value).replace(/^[+−]/, '')}
    </span>
  )
}

/** Tarjeta de métrica global. */
export function StatTile({ label, value, sub, accent = 'teal' }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 backdrop-blur-sm sm:p-5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold sm:text-3xl ${ACCENT[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** Métrica compacta reutilizable (ficha de canal). */
export function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-1.5 font-mono text-xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export { compact }
