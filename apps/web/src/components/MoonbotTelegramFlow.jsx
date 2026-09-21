import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const duration = count => Math.max(0.7, 7 / (1 + Math.log10(1 + count)));
function Stream({ path, count, color, running }) {
  return <g><path d={path} fill="none" stroke={color} strokeWidth="2" opacity="0.25" />{running && count > 0 && [0, 1, 2].map(i => <circle key={i} r="4" fill={color}><animateMotion dur={`${duration(count)}s`} begin={`${-i * duration(count) / 3}s`} repeatCount="indefinite" path={path} /></circle>)}</g>;
}
export default function MoonbotTelegramFlow({ data, stale }) {
  const [paused, setPaused] = useState(false); const [reduced, setReduced] = useState(false); const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches); change(); media.addEventListener('change', change);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { media.removeEventListener('change', change); window.clearInterval(timer); };
  }, []);
  const operations = data?.operations;
  const expired = !data?.observedAt || now - new Date(data.observedAt).getTime() > 15000;
  const running = !paused && !reduced && !stale && !expired && !document.hidden;
  const bots = operations?.bots;
  const rows = Array.isArray(bots) ? bots.slice().sort((a, b) => (b.last60s?.calls || 0) - (a.last60s?.calls || 0)).slice(0, 8) : [];
  const totalCalls = operations?.last60s?.calls;
  const share = count => typeof totalCalls === 'number' && totalCalls > 0 && typeof count === 'number' && count >= 0 && count <= totalCalls ? count / totalCalls * 100 : null;
  const percent = count => share(count) == null ? '—' : `${share(count).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
  const visibleCalls = rows.reduce((sum, bot) => sum + (bot.last60s?.calls || 0), 0);
  const height = Math.max(220, rows.length * 85 + 60);
  const middle = height / 2;
  const value = n => n == null ? '—' : Number(n).toLocaleString('es-ES');
  return <section className="rounded-xl border border-cyan-500/30 bg-muted/10 p-4" aria-label="Flujo de Telegram por bot">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Telegram · tráfico y reparto por bot</h3><Button variant="outline" size="sm" onClick={() => setPaused(p => !p)}>{paused ? 'Reanudar animación' : 'Pausar animación'}</Button></div>
    <p className="mt-2 text-sm text-muted-foreground">Docker activo: {data?.active || 'Sin confirmar'} · Cada bot recibe sus propias actualizaciones. El cambio de Docker se gestiona en el control de contenedores.</p>
    <div className="mt-3 flex flex-wrap gap-4 text-sm"><span className="text-cyan-600">● Mensajes recibidos: {value(operations?.last60s?.received)} / 60 s</span><span className="text-violet-600">● Peticiones a la API de Telegram: {value(operations?.last60s?.calls)} / 60 s</span></div>
    <p className="mt-2 text-xs text-muted-foreground">Más peticiones → puntos más rápidos. La velocidad representa el volumen de los últimos 60 segundos, no la latencia ni mensajes individuales. Incluye getUpdates y reintentos. {stale || expired ? 'Datos sin actualizar: animación detenida.' : reduced ? 'Movimiento reducido activado.' : ''}</p>
    <p className="mt-2 text-sm"><b>Carga de tráfico por bot</b> = peticiones del bot / peticiones totales en 60 s. Es cuota de tráfico, no porcentaje de saturación. {totalCalls === 0 ? 'Sin peticiones: porcentajes no aplicables.' : `Los bots visibles representan ${percent(visibleCalls)} del tráfico.`}</p>
    <p className="mt-2 text-xs text-muted-foreground">Modo activo/reserva: el gestor cambia el Docker activo; no distribuye automáticamente bots por token entre varios Docker. Cada cliente usa su token, que permanece oculto.</p>
    <div className="mt-3 rounded-lg border border-violet-500/30 p-3"><h4 className="font-semibold">Gestor de contenedores · activo / reserva</h4><div className="mt-2 flex flex-wrap gap-2">{(data?.nodes || []).map(node => <span key={node.id} className={`rounded-lg border px-3 py-2 text-sm ${data.active === node.id ? 'border-violet-500 bg-violet-500/10' : 'bg-muted/20'}`}><b>{node.id}</b> · {data.active === node.id ? 'Activo seleccionado' : node.running ? 'En ejecución · no seleccionado' : 'Reserva detenida'}</span>)}</div><p className="mt-2 text-xs text-muted-foreground">{data?.busy ? 'Conmutación en curso.' : 'La conmutación y la comprobación de salud se controlan desde Cambio de contenedor.'} No hay medición independiente de carga para cada Docker; el porcentaje de saturación del contenedor no está disponible.</p></div>
    {!rows.length ? <p className="my-4 rounded-lg border border-dashed p-4 text-sm">{bots == null ? 'El despliegue aún no publica tráfico por bot. Actualiza Moonbot para ver las conexiones individuales.' : 'Todavía no se han observado llamadas de bots.'} API de Telegram: api.telegram.org.</p> : <>
      <div className="overflow-x-auto"><svg viewBox={`0 0 1180 ${height}`} className="mt-3 w-full min-w-[850px]" role="img" aria-label="Telegram y su Bot API conectados con los bots del Docker activo; detalle numérico en la tabla">
        <rect x="10" y={middle - 38} width="145" height="76" rx="15" fill="currentColor" opacity="0.06" /><text x="82" y={middle - 5} textAnchor="middle" fill="currentColor" fontSize="17">Telegram</text><text x="82" y={middle + 17} textAnchor="middle" fill="currentColor" fontSize="11">Grupos y chats</text>
        <path d={`M155 ${middle} H245`} stroke="currentColor" opacity="0.2" />
        <rect x="245" y={middle - 45} width="205" height="90" rx="15" fill="#06b6d4" opacity="0.13" /><text x="347" y={middle - 13} textAnchor="middle" fill="currentColor" fontSize="17">API de Telegram</text><text x="347" y={middle + 10} textAnchor="middle" fill="currentColor" fontSize="13">api.telegram.org</text><text x="347" y={middle + 29} textAnchor="middle" fill="currentColor" fontSize="11">Bot API · HTTPS</text>
        <Stream path={`M450 ${middle - 8} H515`} count={operations?.last60s?.received} color="#06b6d4" running={running} />
        <Stream path={`M515 ${middle + 8} H450`} count={totalCalls} color="#8b5cf6" running={running} />
        <rect x="515" y={middle - 48} width="220" height="96" rx="15" fill="#8b5cf6" opacity="0.12" />
        <text x="625" y={middle - 16} textAnchor="middle" fill="currentColor" fontSize="15">Moonbot · Docker activo</text>
        <text x="625" y={middle + 7} textAnchor="middle" fill="currentColor" fontSize="12">{data?.active || 'Sin confirmar'}</text>
        <text x="625" y={middle + 29} textAnchor="middle" fill="currentColor" fontSize="12">Clientes por token · {value(totalCalls)} / 60 s</text>
        {rows.map((bot, index) => { const y = 65 + index * 85; const traffic = bot.last60s || {}; return <g key={bot.id}>
          <Stream path={`M735 ${middle - 8} C810 ${middle - 8} 840 ${y - 8} 915 ${y - 8}`} count={traffic.received} color="#06b6d4" running={running} />
          <Stream path={`M915 ${y + 8} C840 ${y + 8} 810 ${middle + 8} 735 ${middle + 8}`} count={traffic.calls} color="#8b5cf6" running={running} />
          <rect x="915" y={y - 34} width="250" height="74" rx="12" fill={traffic.errors ? '#f59e0b' : '#06b6d4'} opacity="0.12" /><text x="928" y={y - 8} fill="currentColor" fontSize="14">Bot · {bot.id.slice(0, 8)}</text><text x="928" y={y + 13} fill="currentColor" fontSize="11">↓ {value(traffic.received)} mensajes · ↑ {value(traffic.calls)} llamadas</text><text x="928" y={y + 31} fill="currentColor" fontSize="14" fontWeight="bold">{percent(traffic.calls)} del tráfico total</text>
        </g>; })}
      </svg></div>
      <div className="overflow-x-auto"><table className="mt-3 w-full text-left text-sm"><caption className="py-2 text-left text-xs text-muted-foreground">Hasta 8 bots con más llamadas · identificadores anónimos estables por configuración · ventana de 60 s</caption><thead><tr>{['Bot', '% del tráfico', 'Recibidos', 'Peticiones API', 'Enviados', 'Errores', '429'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.map(bot => <tr key={bot.id} className="border-t"><td className="p-2">{bot.id.slice(0, 8)}</td><td className="p-2"><b>{percent(bot.last60s?.calls)}</b><div className="mt-1 h-2 w-24 rounded bg-muted"><div className="h-2 rounded bg-violet-500" style={{ width: `${share(bot.last60s?.calls) ?? 0}%` }} /></div></td>{['received', 'calls', 'sent', 'errors', 'limited'].map(key => <td key={key} className="p-2 tabular-nums">{value(bot.last60s?.[key])}</td>)}</tr>)}</tbody></table></div>
    </>}
    {(bots?.length > 8 || operations?.botsTruncated) && <p className="mt-2 text-xs text-amber-600">Vista parcial: se muestran 8 bots y el origen conserva hasta 64. Los totales globales pueden incluir otros bots.</p>}
  </section>;
}
