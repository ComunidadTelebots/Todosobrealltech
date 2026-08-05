import React, { useCallback, useEffect, useState } from 'react';
import { Activity, History, Loader2, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const dateText = (value) => value ? new Date(value).toLocaleString('es-ES') : 'Todavía no ejecutado';

export default function RssWorkerControlPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const isMaster = pb.authStore.record?.role === 'creator';

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await apiServerClient.fetch('/noticias/worker');
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || 'No se pudo consultar el worker');
      setData(payload);
    } catch (error) {
      if (!quiet) toast.error(error.message);
    } finally { if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => load(true), data?.status?.state === 'running' ? 4000 : 15000);
    return () => clearInterval(interval);
  }, [data?.status?.state, load]);

  const run = async (action, targetUrl = '') => {
    if (action === 'backfill' && !targetUrl && !window.confirm('Se revisarán publicaciones anteriores accesibles y se aplicará el diseño actual conservando Inside Ads. ¿Continuar?')) return;
    setSending(targetUrl ? 'backfill_one' : action);
    try {
      const response = await apiServerClient.fetch('/noticias/worker', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, limit: targetUrl ? 1 : 100, telegram_url: targetUrl }) });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || 'No se pudo enviar la tarea');
      toast.success(targetUrl ? 'Publicación enviada directamente al worker' : action === 'backfill' ? 'Backfill histórico enviado al worker' : 'Ejecución RSS enviada al worker');
      await load(true);
    } catch (error) { toast.error(error.message); }
    finally { setSending(''); }
  };

  if (loading) return <div className="rounded-xl border p-5 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Cargando estado del worker…</div>;
  const status = data?.status || {};
  const progress = status.progress || {};
  const commandBusy = ['pending', 'accepted'].includes(data?.command?.state) || status.state === 'running';
  const percent = progress.total ? Math.min(100, Math.round((Number(progress.processed || 0) / Number(progress.total)) * 100)) : 0;

  return <section className="rounded-xl border bg-background p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-semibold"><Activity className="h-5 w-5 text-emerald-600"/>Control del worker de noticias</h3>
        <p className="text-sm text-muted-foreground">Seguimiento real de RSS, publicaciones de Telegram y backfill histórico.</p></div>
      <div className="flex gap-2"><Badge variant={status.state === 'failed' ? 'destructive' : 'secondary'}>{status.state || 'waiting'}</Badge>
        <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Noticias totales</span><b className="block text-xl">{data?.counts?.total || 0}</b></div>
      <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Gaming</span><b className="block text-xl">{data?.counts?.gaming || 0}</b></div>
      <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Pendientes de publicar</span><b className="block text-xl">{data?.counts?.pending || 0}</b></div>
      <div className="rounded-lg bg-muted p-3"><span className="text-xs text-muted-foreground">Backfill pendiente</span><b className="block text-xl">{data?.counts?.backfill_pending || 0}</b></div>
    </div>
    {status.state === 'running' && <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>{status.mode === 'backfill' ? 'Aplicando diseño histórico' : 'Procesando feeds'}</span><span>{progress.processed || 0}/{progress.total || 0}</span></div><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }}/></div></div>}
    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
      <div className="rounded-lg border p-3"><b>Último resultado</b><p className="mt-1 text-muted-foreground">{status.last_result?.title || 'Sin resultados todavía'}</p><p className="text-xs text-muted-foreground">Finalizado: {dateText(status.completed_at)}</p></div>
      <div className="rounded-lg border p-3"><b>Diseño aplicado</b><p className="mt-1 text-muted-foreground">Titular → frase breve → hashtags → enlace NW3 → comunidad breve → Inside Ads.</p><p className="text-xs text-muted-foreground">Botones: Leer noticia · Inside Ads (si existe) · acción comunitaria.</p></div>
    </div>
    {!!status.recent_results?.length && <div className="mt-4 rounded-lg border p-3 text-sm"><b>Resultados recientes</b><div className="mt-2 space-y-1">{status.recent_results.slice().reverse().map((item, index) => <div key={`${item.telegram_url || item.title}-${index}`} className="flex items-center justify-between gap-3 border-t py-2 first:border-0"><span className="min-w-0 truncate">{item.title}</span>{item.telegram_url ? <a className="shrink-0 text-sky-600 hover:underline" href={item.telegram_url} target="_blank" rel="noreferrer">Ver post</a> : <Badge variant={item.ok ? 'secondary' : 'destructive'}>{item.ok ? 'Creada' : 'Error'}</Badge>}</div>)}</div></div>}
    {!!status.feed_errors?.length && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Feeds con error en el último ciclo</b><ul className="mt-1 list-inside list-disc">{status.feed_errors.map((item) => <li key={item.label}>{item.label}: {item.error}</li>)}</ul></div>}
    {isMaster && <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2"><Button onClick={() => run('run_now')} disabled={commandBusy || !!sending}><Play className="mr-2 h-4 w-4"/>Ejecutar RSS ahora</Button><Button variant="outline" onClick={() => run('backfill')} disabled={commandBusy || !!sending}><History className="mr-2 h-4 w-4"/>Actualizar publicaciones anteriores</Button></div>
      <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row"><input className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" type="url" placeholder="https://t.me/TodoSobreAllTech/228347" value={telegramUrl} onChange={(event) => setTelegramUrl(event.target.value)} /><Button variant="outline" onClick={() => run('backfill', telegramUrl.trim())} disabled={commandBusy || !!sending || !/^https:\/\/t\.me\/(?:s\/)?[A-Za-z0-9_]+\/\d+$/.test(telegramUrl.trim())}>{sending === 'backfill_one' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Actualizar solo este mensaje</Button></div>
    </div>}
  </section>;
}
