import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const actions = { update: 'Actualizar reserva', 'pause-container': 'Detener tráfico del Docker', 'resume-container': 'Arrancar como principal', 'start-worker': 'Arrancar reserva con bots pausados', 'pause-bot': 'Pausar bot', 'resume-bot': 'Reanudar bot', 'transfer-bot': 'Derivar bot' };
export default function MoonbotDeploymentControl({ data, client, readOnly, stale, refresh }) {
  const [pending, setPending] = useState(null); const [release, setRelease] = useState('');
  const [destination, setDestination] = useState(''); const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  const disabled = readOnly || !data?.canManage || data?.busy || data?.interrupted || stale || sending;
  const nodes = data?.nodes || [];
  const submit = async () => {
    setSending(true); setError('');
    try {
      const response = await client.fetch('/moonbot-admin/cluster/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) });
      const result = await client.readJson(response);
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo iniciar la operación');
      setPending(null); await refresh();
    } catch (reason) { setError(reason.message); }
    finally { setSending(false); }
  };
  return <section className="space-y-4 rounded-xl border border-violet-500/30 p-4" aria-label="Actualizaciones y control de tráfico">
    <h3 className="text-lg font-semibold">Actualizaciones y control de tráfico</h3>
    <p className="text-sm text-muted-foreground">Solo el creador puede ejecutar cambios. Prepara una versión en un Docker detenido y después actívala desde Cambio de contenedor. La imagen anterior se conserva; los datos y volúmenes se mantienen.</p>
    {data?.job && <div role="status" className="rounded-lg border bg-muted/20 p-3 text-sm"><b>{actions[data.job.action] || data.job.action} · {data.job.status === 'running' ? 'En curso' : data.job.status === 'completed' ? 'Completada' : 'Fallida'}</b><p>Nodo: {data.job.node} · Paso: {data.job.step}</p>{data.job.backup && <p>Contenedor anterior: {data.job.backup}</p>}{data.job.error && <p className="text-destructive">{data.job.error}</p>}</div>}
    {data?.interrupted && <p role="alert" className="text-amber-600">La API se reinició durante una operación. Comprueba ambos contenedores y el registro persistido antes de desbloquearla.</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <label className="block text-sm">Versión autorizada<select className="ml-2 max-w-full rounded border bg-background p-2" value={release} onChange={event => setRelease(event.target.value)}><option value="">Selecciona versión</option>{(data?.releases || []).map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    {!data?.releases?.length && <p className="text-xs text-muted-foreground">No hay versiones publicadas en el catálogo del servidor. Deben estar fijadas por digest para descargar exactamente la imagen elegida.</p>}
    <div className="grid gap-3 lg:grid-cols-2">{nodes.map(node => <article key={node.id} className="space-y-2 rounded-lg border p-3"><h4 className="font-semibold">{node.id} · {node.running ? 'En ejecución' : node.status === 'unavailable' ? 'Sin conexión' : 'Detenido'}</h4><p className="break-all text-xs text-muted-foreground">{node.image || 'Imagen no disponible'}</p><div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={disabled || node.running || !release || (data.active === node.id && !data.paused)} onClick={() => setPending({ action: 'update', node: node.id, release })}>Descargar y actualizar</Button>
      {node.running ? <Button size="sm" variant="outline" disabled={disabled} onClick={() => setPending({ action: 'pause-container', node: node.id })}>Detener tráfico</Button> : <><Button size="sm" variant="outline" disabled={disabled} onClick={() => setPending({ action: 'resume-container', node: node.id })}>Arrancar principal</Button><Button size="sm" variant="outline" disabled={disabled} onClick={() => setPending({ action: 'start-worker', node: node.id })}>Arrancar con bots pausados</Button></>}
    </div></article>)}</div>
    <h4 className="font-semibold">Bots individuales</h4>
    <p className="text-xs text-muted-foreground">Pausar deja terminar el lote en curso y bloquea nuevas peticiones de la Bot API. Derivar requiere el mismo token ya configurado en un destino arrancado y pausado. Los bots con TDLib se controlan deteniendo o trasladando su Docker completo.</p>
    <label className="block text-sm">Destino para derivar<select className="ml-2 rounded border bg-background p-2" value={destination} onChange={event => setDestination(event.target.value)}><option value="">Selecciona Docker</option>{nodes.filter(node => node.running).map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
    {(data?.traffic || []).map(group => <div key={group.node} className="space-y-2"><h5 className="text-sm font-semibold">{group.node}</h5>{group.error && <p className="text-xs text-amber-600">{group.error}</p>}{group.bots?.map(bot => <div key={bot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div className="text-sm"><b>{bot.name}</b> · {bot.id.slice(0, 8)}<p>{bot.paused ? bot.inflight ? 'Pausando' : 'Pausado' : 'Admite tráfico'} · {bot.inflight} operaciones en curso{!bot.controllable && ' · Controlar mediante Docker'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={disabled || !bot.controllable || (bot.paused && bot.inflight > 0)} onClick={() => setPending({ action: bot.paused ? 'resume-bot' : 'pause-bot', node: group.node, bot: bot.id })}>{bot.paused ? 'Reanudar' : 'Pausar'}</Button><Button size="sm" variant="outline" disabled={disabled || !bot.controllable || !destination || destination === group.node} onClick={() => setPending({ action: 'transfer-bot', node: group.node, bot: bot.id, to: destination })}>Derivar</Button></div></div>)}</div>)}
    {!data?.traffic?.length && <p className="text-sm text-muted-foreground">Arranca un nodo con el control de tráfico configurado para ver sus bots.</p>}
    {pending && <div role="region" aria-label="Confirmar operación de Moonbot" className="space-y-3 rounded-lg border border-amber-500 p-4"><b>{actions[pending.action]} · {pending.node}</b><p className="text-sm">{pending.bot ? `Bot ${pending.bot}. ` : ''}{pending.to ? `Destino: ${pending.to}. ` : ''}{pending.release ? `Versión: ${pending.release}. Se prepara detenida y no se activa automáticamente. ` : ''}Esta operación puede interrumpir el servicio. Si un traslado no se confirma, el origen permanecerá pausado para evitar duplicados.</p><div className="flex gap-2"><Button disabled={disabled} onClick={submit}>Confirmar operación</Button><Button variant="ghost" disabled={sending} onClick={() => setPending(null)}>Cancelar</Button></div></div>}
  </section>;
}
