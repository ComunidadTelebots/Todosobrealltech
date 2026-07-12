import { useParams, Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getChannel } from '../api.js'
import { useAsync } from '../lib/useAsync.js'
import { Avatar, CategoryPill, GrowthBadge, Metric } from '../components/ui.jsx'
import { compact, thousands, pct, shortDate, frequency } from '../lib/format.js'

export function Channel() {
  const { username } = useParams()
  const { data: c, loading, error } = useAsync(() => getChannel(username), [username])

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
  if (error || !c)
    return (
      <div className="rounded-2xl border border-line bg-card p-10 text-center">
        <p className="text-muted">Canal no encontrado.</p>
        <Link to="/" className="mt-3 inline-block text-cyan hover:underline">
          ← Volver al directorio
        </Link>
      </div>
    )

  const first = c.series[0].subs
  const last = c.series[c.series.length - 1].subs
  const gained = last - first

  return (
    <div className="rise">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
        ← Directorio
      </Link>

      {/* Cabecera del canal */}
      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-6 backdrop-blur-sm sm:flex-row sm:items-center">
        <Avatar channel={c} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h1>
            {c.verified && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label="verificado">
                <path d="M12 2l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.2 15.6 4.1 12l-.9-2.9 2.4-1.7 1-2.8 3-.1L12 2z" fill="#36b6f0" />
                <path d="M8.5 12l2.2 2.2 4.3-4.4" stroke="#04121f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <CategoryPill id={c.category} />
          </div>
          <div className="mt-1 font-mono text-sm text-muted">@{c.username}</div>
          <p className="mt-2 max-w-2xl text-sm text-muted">{c.desc}</p>
        </div>
        <a
          href={`https://t.me/${c.username}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-cyan px-5 py-2.5 text-sm font-semibold text-bg shadow-glow transition hover:-translate-y-0.5"
        >
          Abrir en Telegram
        </a>
      </div>

      {/* Métricas detalladas */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Suscriptores" value={thousands(c.subscribers)} hint={<GrowthBadge value={c.growth30d} className="text-xs" />} />
        <Metric label="Vistas / post" value={compact(c.viewsPerPost)} hint="media reciente" />
        <Metric label="Engagement" value={pct(c.engagement, { sign: false })} hint="vistas / suscriptores" />
        <Metric label="Frecuencia" value={frequency(c.postsPerDay)} hint="ritmo de publicación" />
        <Metric label="Nuevos 30d" value={`+${compact(gained)}`} hint="suscriptores ganados" />
      </div>

      {/* Gráfica de evolución de suscriptores */}
      <section className="mt-4 rounded-2xl border border-line bg-card p-5 backdrop-blur-sm sm:p-6">
        <div className="mb-1 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Evolución de suscriptores</h2>
            <p className="font-mono text-xs text-muted">Últimos 30 días</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-teal">{compact(last)}</div>
            <GrowthBadge value={c.growth30d} className="justify-end text-xs" />
          </div>
        </div>
        <SubscribersChart series={c.series} />
      </section>

      {/* Últimos posts */}
      <section className="mt-4">
        <h2 className="mb-3 font-display text-lg font-bold">Últimos posts</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-card backdrop-blur-sm">
          {c.posts.map((p, i) => {
            const eng = ((p.views / c.subscribers) * 100).toFixed(0)
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${i ? 'border-t border-line/60' : ''}`}
              >
                <div className="w-14 flex-shrink-0 font-mono text-xs text-muted">{shortDate(p.date)}</div>
                <div className="min-w-0 flex-1 truncate text-sm text-ink">{p.text}</div>
                <div className="hidden w-28 flex-shrink-0 text-right font-mono text-xs text-muted sm:block">
                  {compact(p.reactions)} react · {compact(p.forwards)} rep
                </div>
                <div className="w-20 flex-shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold text-ink">{compact(p.views)}</div>
                  <div className="font-mono text-[11px] text-teal">{eng}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function SubscribersChart({ series }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {/* Serie única → un solo tono secuencial teal→cyan con gradiente vertical */}
            <linearGradient id="subsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ee0c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#36b6f0" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="subsStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3ee0c7" />
              <stop offset="100%" stopColor="#36b6f0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: '#8794ad', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: '#8794ad', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={46}
            domain={['dataMin - 200', 'dataMax + 200']}
          />
          <Tooltip
            cursor={{ stroke: '#3ee0c7', strokeWidth: 1, strokeDasharray: '4 4' }}
            labelFormatter={(l) => shortDate(l)}
            formatter={(v) => [thousands(v), 'Suscriptores']}
            contentStyle={{ color: '#e9f0fb' }}
            labelStyle={{ color: '#8794ad', fontFamily: 'JetBrains Mono', fontSize: 11 }}
            itemStyle={{ color: '#3ee0c7', fontFamily: 'JetBrains Mono' }}
          />
          <Area
            type="monotone"
            dataKey="subs"
            stroke="url(#subsStroke)"
            strokeWidth={2}
            fill="url(#subsFill)"
            activeDot={{ r: 4, fill: '#3ee0c7', stroke: '#070b14', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
