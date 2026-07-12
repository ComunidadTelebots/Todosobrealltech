// Sparkline SVG puro (sin dependencias) para la columna de tendencia del directorio.
export function Sparkline({ data, width = 96, height = 30, up = true }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />
  const ys = data.map((d) => (typeof d === 'number' ? d : d.subs))
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const span = max - min || 1
  const stepX = width / (ys.length - 1)
  const pts = ys.map((y, i) => [i * stepX, height - ((y - min) / span) * (height - 4) - 2])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const stroke = up ? '#3ee0c7' : '#f0688c'
  const id = `spark-${up ? 'u' : 'd'}`
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
