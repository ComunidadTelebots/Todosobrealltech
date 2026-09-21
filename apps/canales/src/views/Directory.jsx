import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getChannels, getGlobalStats, getCategories, SORTS } from '../api.js'
import { useAsync } from '../lib/useAsync.js'
import { Avatar, CategoryPill, GrowthBadge, StatTile } from '../components/ui.jsx'
import { Sparkline } from '../components/Sparkline.jsx'
import { compact, thousands, pct, frequency } from '../lib/format.js'

export function Directory() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('subscribers')
  const [category, setCategory] = useState('all')

  const stats = useAsync(getGlobalStats, [])
  const cats = useAsync(getCategories, [])
  const list = useAsync(() => getChannels({ q, sort, category }), [q, sort, category])

  return (
    <div className="rise">
      {/* Hero + métricas globales */}
      <section className="mb-8">
        <div className="mb-1.5 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-teal">
          <span className="h-px w-6 bg-teal" />
          Directorio de canales
        </div>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Estadísticas de <span className="text-grad">canales de Telegram</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Suscriptores, crecimiento, vistas por post y engagement. Datos comparables, actualizados a diario.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Canales" value={stats.data ? thousands(stats.data.channels) : '—'} accent="teal" />
          <StatTile
            label="Suscriptores"
            value={stats.data ? compact(stats.data.totalSubscribers) : '—'}
            sub="agregado de la red"
            accent="cyan"
          />
          <StatTile
            label="Vistas / día"
            value={stats.data ? compact(stats.data.dailyViews) : '—'}
            sub="estimadas"
            accent="violet"
          />
          <StatTile
            label="Crecimiento medio"
            value={stats.data ? pct(stats.data.avgGrowth) : '—'}
            sub="últimos 30 días"
            accent="green"
          />
        </div>
      </section>

      {/* Controles: buscador + orden + categorías (una fila arriba de la tabla) */}
      <section className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar canal, @username o tema…"
              className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted sm:inline">
              Ordenar
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    sort === s.id
                      ? 'bg-gradient-to-r from-teal to-cyan text-bg'
                      : 'border border-line text-muted hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtro de categoría */}
        <div className="flex flex-wrap gap-1.5">
          <CatChip active={category === 'all'} onClick={() => setCategory('all')}>
            Todas
          </CatChip>
          {(cats.data || []).map((c) => (
            <CatChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.name}
            </CatChip>
          ))}
        </div>
      </section>

      {/* Tabla */}
      <ChannelTable list={list} sort={sort} />

      {/* CTA */}
      <section className="mt-10 rounded-[28px] border border-line bg-gradient-to-br from-teal/[0.10] to-violet/[0.10] p-8 text-center backdrop-blur-sm sm:p-12">
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Añade tu canal — <span className="text-grad">haz admin al bot</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Añade a <span className="font-mono text-ink">@TelebotsStatsBot</span> como administrador de tu canal y
          aparecerá en el directorio con sus métricas en pocas horas.
        </p>
        <a
          href="https://t.me/comunidadtelebots"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal to-cyan px-6 py-3.5 font-semibold text-bg shadow-glow transition hover:-translate-y-0.5"
        >
          Añadir mi canal
        </a>
      </section>
    </div>
  )
}

function CatChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'border border-cyan/60 bg-cyan/10 text-cyan' : 'border border-line text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

const COLS = [
  { id: 'subscribers', label: 'Suscriptores', className: 'text-right' },
  { id: 'viewsPerPost', label: 'Vistas / post', className: 'text-right hidden md:table-cell' },
  { id: 'engagement', label: 'Engagement', className: 'text-right hidden lg:table-cell' },
]

function ChannelTable({ list, sort }) {
  if (list.error)
    return <p className="rounded-xl border border-rose/40 bg-rose/10 p-4 text-sm text-rose">Error al cargar los canales.</p>

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card backdrop-blur-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
            <th className="px-4 py-3 font-medium">Canal</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Tendencia 30d</th>
            {COLS.map((c) => (
              <th key={c.id} className={`px-4 py-3 font-medium ${c.className} ${sort === c.id ? 'text-teal' : ''}`}>
                {c.label}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Frecuencia</th>
          </tr>
        </thead>
        <tbody>
          {list.loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-line/60">
                <td colSpan={6} className="px-4 py-4">
                  <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.04]" />
                </td>
              </tr>
            ))}

          {!list.loading &&
            (list.data || []).map((c) => (
              <tr key={c.username} className="group border-b border-line/60 transition hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={`/canal/${c.username}`} className="flex items-center gap-3">
                    <Avatar channel={c} size={40} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-display text-[15px] font-bold group-hover:text-cyan">{c.name}</span>
                        {c.verified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" aria-label="verificado">
                            <path d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15.6 4.1 12l-.9-2.9 2.4-1.7 1-2.8 3-.1L12 2z" fill="#36b6f0" />
                            <path d="M8.5 12l2.2 2.2 4.3-4.4" stroke="#04121f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-muted">@{c.username}</span>
                        <CategoryPill id={c.category} className="hidden sm:inline-flex" />
                        {c.community?.active && <span className="rounded-full bg-teal/10 px-2 py-0.5 font-mono text-[10px] text-teal">comunidad</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Sparkline data={pointsFor(c)} up={c.growth30d >= 0} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono font-semibold text-ink">{compact(c.subscribers)}</div>
                  <GrowthBadge value={c.growth30d} className="justify-end text-xs" />
                </td>
                <td className="px-4 py-3 text-right font-mono text-ink hidden md:table-cell">{compact(c.viewsPerPost)}</td>
                <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                  <span className="text-teal">{pct(c.engagement, { sign: false })}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted hidden sm:table-cell">
                  {frequency(c.postsPerDay)}
                </td>
              </tr>
            ))}

          {!list.loading && (list.data || []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                No hay canales que coincidan con la búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// La proyección de listado no trae la serie completa; sintetizamos una tendencia
// mínima a partir de subs+crecimiento solo para la sparkline de la fila.
function pointsFor(c) {
  const end = c.subscribers
  const start = Math.round(end / (1 + c.growth30d / 100))
  const n = 12
  const pts = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const eased = t * t * (3 - 2 * t)
    pts.push(Math.round(start + (end - start) * eased))
  }
  return pts
}
