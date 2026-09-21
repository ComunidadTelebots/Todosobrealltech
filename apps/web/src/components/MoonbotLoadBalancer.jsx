import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Box, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiServerClient from '@/lib/apiServerClient';
import MoonbotTrafficPanel from '@/components/MoonbotTrafficPanel.jsx';
import MoonbotTelegramFlow from '@/components/MoonbotTelegramFlow.jsx';
import TelegramNetworkPanel from '@/components/TelegramNetworkPanel.jsx';

const labels = { running: 'En ejecución', exited: 'Detenido', created: 'Preparado', unavailable: 'Sin conexión', restarting: 'Reiniciando' };
const events = { started: 'Cambio iniciado', completed: 'Cambio completado', rolled_back: 'Origen restaurado', failed: 'Cambio rechazado', recovery_required: 'Recuperación manual necesaria' };
const metric = (value) => value == null ? '—' : value;

export default function MoonbotLoadBalancer({ client = apiServerClient, readOnly = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [target, setTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const requestRunning = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    if (requestRunning.current) return;
    requestRunning.current = true;
    setLoading(true);
    try {
      const response = await client.fetch('/moonbot-admin/cluster', { signal: AbortSignal.timeout(12000) });
      const payload = await client.readJson(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se puede consultar el clúster');
      if (!mounted.current) return;
      setData(payload); setError('');
      if (payload.balancer) setHistory((previous) => [...previous.slice(-29), { time: payload.observedAt, sources: payload.balancer.processed_sources }]);
    } catch (reason) { if (mounted.current) setError(reason.message); }
    finally { requestRunning.current = false; if (mounted.current) setLoading(false); }
  }, [client]);
  useEffect(() => {
    mounted.current = true;
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [load]);

  const switchNode = async () => {
    if (readOnly) return;
    setSwitching(true); setNotice('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/cluster/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: data.active, to: target.id }) });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo completar el cambio');
      setNotice(`Conmutación verificada: ${payload.active} está activo.`);
    } catch (reason) { setNotice(reason.message); }
    finally { setSwitching(false); setTarget(null); await load(); }
  };
  const balancer = data?.balancer;
  const stale = Boolean(error);
  const blocked = readOnly || switching || data?.busy || stale || !data?.active;
  const maxSources = Math.max(1, ...history.map((point) => Number(point.sources) || 0));

  return <section className="mt-6 space-y-5 rounded-2xl border border-cyan-500/25 bg-background p-4 sm:p-6" aria-label="Balanceo y contenedores Moonbot">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-600">Moonbot · Control de infraestructura</p><h2 className="mt-2 text-2xl font-semibold">Balanceo y contenedores</h2><p className="mt-1 text-sm text-muted-foreground">Aprendizaje distribuido entre workers y recuperación del servicio.</p></div>
      <Button variant="outline" onClick={load} disabled={loading || switching}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
    </header>
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${stale ? 'bg-amber-500' : data ? 'bg-emerald-500' : 'bg-slate-400'}`} />{stale ? 'Datos anteriores · controles bloqueados' : data ? 'Consulta automática cada 5 s' : 'Conectando con la API'}</span>{data && <time>Última lectura: {new Date(data.observedAt).toLocaleTimeString()}</time>}</div>
    {error && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="rounded-xl border p-4 text-sm">{notice}</p>}
    {data && !data.configured && <div className="rounded-xl border border-dashed p-6"><h3 className="font-semibold">Todavía no hay contenedores configurados</h3><p className="mt-2 text-sm text-muted-foreground">Configura los nodos de Moonbot en la API para consultar su estado y habilitar la conmutación. Aquí aparecerán únicamente contenedores reales.</p></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Nodo activo', data?.active], ['Workers asignados', balancer?.workers], ['Fuentes procesadas', balancer?.processed_sources], ['Ritmo de aprendizaje', balancer?.rate],
    ].map(([label, value]) => <div key={label} className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words text-2xl font-semibold">{metric(value)}</p></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <section className="rounded-xl border p-4"><h3 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-cyan-600" />Flujo de aprendizaje</h3><div className="my-5 flex flex-wrap items-center justify-center gap-3 text-sm"><span className="rounded-lg border bg-muted/20 p-3">Fuentes de libros</span><ArrowRight className="h-4 w-4" /><span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3">Balanceador {balancer ? balancer.active ? 'activo' : 'inactivo' : 'sin datos'}</span><ArrowRight className="h-4 w-4" /><span className="rounded-lg border bg-muted/20 p-3">{metric(balancer?.workers)} workers</span></div>
        <p className="text-xs text-muted-foreground">Los workers son hilos dentro de Moonbot. El origen no publica carga ni latencia individual; su número indica asignación, no actividad instantánea.</p>
        {data?.balancerError && <p className="mt-3 text-sm text-amber-600">{data.balancerError}</p>}
        {balancer && <><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Workers planificados / máximo</dt><dd>{metric(balancer.plan?.planned_workers)} / {metric(balancer.plan?.max_workers)}</dd></div><div><dt className="text-muted-foreground">Palabras aprendidas</dt><dd>{metric(balancer.words)}</dd></div></dl><p className="mt-5 text-xs text-muted-foreground">Fuentes procesadas · últimas {history.length} lecturas de esta sesión</p><div className="mt-2 flex h-20 items-end gap-1" role="img" aria-label="Historial de fuentes procesadas">{history.map((point, index) => <div key={`${point.time}-${index}`} className="min-w-0 flex-1 rounded-t bg-cyan-500/70" style={{ height: `${Math.max(2, (Number(point.sources) || 0) / maxSources * 100)}%` }} title={`${new Date(point.time).toLocaleTimeString()}: ${point.sources} fuentes`} />)}</div></>}
      </section>
      <section className="rounded-xl border p-4"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-600" />Cambio de contenedor</h3><p className="mt-2 text-sm text-muted-foreground">Detiene el origen, arranca el destino y verifica su salud. Si falla, intenta restaurar el origen. Habrá una breve interrupción durante el cambio.</p><div className="mt-4 space-y-3">{data?.nodes.map((node) => <div key={node.id} className={`rounded-xl border p-3 ${data.active === node.id ? 'border-cyan-500/40 bg-cyan-500/5' : ''}`}><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-medium"><Box className="h-4 w-4" />{node.id}</span><span className={`text-xs ${node.healthy ? 'text-emerald-600' : 'text-amber-600'}`}>{node.healthy ? 'Salud verificada' : labels[node.status] || node.status}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{node.container}{data.active === node.id ? ' · activo' : ''}</p>{node.error && <p className="mt-1 text-xs text-amber-600">{node.error}</p>}{data.active !== node.id && <Button className="mt-3 w-full" size="sm" variant="outline" disabled={blocked || node.running || !['exited', 'created'].includes(node.status)} onClick={() => setTarget(node)}>Cambiar a {node.id}</Button>}</div>)}</div>
        {(switching || data?.busy) && <p role="status" className="mt-3 text-sm">Conmutación en curso. Esperando verificación del contenedor…</p>}
        {target && <div className="mt-4 rounded-xl border border-amber-500/40 p-4" role="region" aria-label="Confirmar cambio"><p className="text-sm">Cambiar de <b>{data.active}</b> a <b>{target.id}</b>. El destino debe tener los mismos datos y configuración de bots.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={blocked} onClick={switchNode}>Confirmar cambio</Button><Button variant="ghost" disabled={switching} onClick={() => setTarget(null)}>Cancelar</Button></div></div>}
      </section>
    </div>
    <MoonbotTelegramFlow data={data} stale={stale} />
    <MoonbotTrafficPanel data={data} />
    <TelegramNetworkPanel client={client} />
    <section><h3 className="mb-3 font-semibold">Historial de conmutaciones</h3><div className="space-y-2">{data?.events.slice(0, 10).map((event, index) => <div key={`${event.at}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-lg border px-3 py-2 text-sm"><span>{events[event.status] || event.status} · {event.from} → {event.to}</span><time className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</time></div>)}{!data?.events.length && <p className="text-sm text-muted-foreground">Sin conmutaciones registradas.</p>}</div></section>
  </section>;
}
