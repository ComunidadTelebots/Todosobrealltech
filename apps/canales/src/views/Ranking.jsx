import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, getRanking } from '../api.js'
import { useAsync } from '../lib/useAsync.js'
import { Avatar, GrowthBadge } from '../components/ui.jsx'
import { compact } from '../lib/format.js'

export function Ranking() {
  const cats = useAsync(getCategories, [])
  const [active, setActive] = useState(null)
  const categoryId = active ?? cats.data?.[0]?.id
  const rank = useAsync(() => (categoryId ? getRanking(categoryId) : Promise.resolve([])), [categoryId])

  return (
    <div className="rise">
      <section className="mb-7">
        <div className="mb-1.5 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-teal">
          <span className="h-px w-6 bg-teal" />
          Ranking por categoría
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Los <span className="text-grad">más grandes</span> de cada categoría
        </h1>
        <p className="mt-3 max-w-xl text-muted">Top de canales ordenados por suscriptores dentro de su temática.</p>
      </section>

      {/* Tabs de categoría */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(cats.data || []).map((c) => {
          const on = categoryId === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                on ? 'bg-gradient-to-r from-teal to-cyan text-bg shadow-glow' : 'border border-line text-muted hover:text-ink'
              }`}
            >
              {c.name}
            </button>
          )
        })}
      </div>

      {/* Podio + lista */}
      {rank.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <ol className="space-y-2">
          {(rank.data || []).map((c, i) => (
            <li key={c.username}>
              <Link
                to={`/canal/${c.username}`}
                className={`flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-sm transition hover:bg-white/[0.03] ${
                  i < 3 ? 'border-line bg-gradient-to-r from-white/[0.05] to-transparent' : 'border-line/60 bg-card'
                }`}
              >
                <RankBadge pos={i + 1} />
                <Avatar channel={c} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-display text-[15px] font-bold">{c.name}</span>
                    {c.verified && <span className="text-cyan" aria-label="verificado">✦</span>}
                  </div>
                  <div className="font-mono text-xs text-muted">@{c.username}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="font-mono text-xs uppercase tracking-wide text-muted">Vistas/post</div>
                  <div className="font-mono text-sm text-ink">{compact(c.viewsPerPost)}</div>
                </div>
                <div className="w-24 text-right">
                  <div className="font-mono text-lg font-semibold text-ink">{compact(c.subscribers)}</div>
                  <GrowthBadge value={c.growth30d} className="justify-end text-xs" />
                </div>
              </Link>
            </li>
          ))}
          {(rank.data || []).length === 0 && (
            <li className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-muted">
              Aún no hay canales en esta categoría.
            </li>
          )}
        </ol>
      )}

      {/* Nota engagement */}
      <p className="mt-6 font-mono text-xs text-muted">El engagement se calcula como vistas por post ÷ suscriptores.</p>
    </div>
  )
}

function RankBadge({ pos }) {
  const medal = pos === 1 ? 'from-amber to-teal' : pos === 2 ? 'from-blue to-cyan' : pos === 3 ? 'from-violet to-blue' : null
  if (medal)
    return (
      <span
        className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br ${medal} font-mono text-sm font-bold text-bg`}
      >
        {pos}
      </span>
    )
  return (
    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-muted">
      {pos}
    </span>
  )
}
