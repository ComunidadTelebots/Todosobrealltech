import React, { useEffect, useState } from 'react';
import { Check, CircleHelp, Copy, ExternalLink, Loader2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function InsideAdsLinksPanel({ onApply }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let active = true;
    apiServerClient.fetch('/house-ads/inside-ads-presets', {
      headers: pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {},
    })
      .then((response) => apiServerClient.readJson(response).then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los enlaces Inside Ads');
        if (active) setData(payload);
      })
      .catch((error) => toast.error(error.message));
    return () => { active = false; };
  }, []);

  const copy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.id);
      toast.success(`${item.label}: enlace copiado`);
      window.setTimeout(() => setCopied((current) => current === item.id ? '' : current), 1800);
    } catch { toast.error('No se pudo copiar el enlace'); }
  };

  return <section className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold">Referidos Inside Ads</h4><p className="text-xs text-muted-foreground">Aplica un destino al borrador actual. La campaña conserva aprobación, rotación, ubicaciones y métricas.</p></div>
      <div className="flex items-center gap-2"><Button size="icon" variant="outline" asChild title="Normas y condiciones publicitarias de Inside Ads"><a href="https://www.insideads.net/advertising-restrictions.html" target="_blank" rel="noopener noreferrer"><CircleHelp className="h-4 w-4"/><span className="sr-only">Normas de Inside Ads</span></a></Button><Badge variant="outline">Solo master</Badge></div>
    </div>
    {!data ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Comprobando canales administrados…</p> : <>
      <div className="grid gap-2 md:grid-cols-2">
        {data.presets.map((item) => <article key={item.id} className="rounded-lg border bg-background p-3">
          <div className="flex items-start justify-between gap-2"><span className="min-w-0"><b className="block text-sm">{item.label}</b><code className="block truncate text-xs text-muted-foreground">{item.code}</code></span><Badge variant="secondary">{item.audience === 'channel_owner' ? 'Canal propio' : 'General'}</Badge></div>
          <div className="mt-3 space-y-2">{[['web_url', 'Web'], ['telegram_url', 'Telegram']].map(([field, label]) => {
            const link = { ...item, id: `${item.id}-${field}`, label: `${item.label} · ${label}`, url: item[field] };
            return <div key={field} className="rounded-md border p-2"><b className="text-xs">{label}</b><p className="truncate text-xs text-muted-foreground" title={link.url}>{link.url}</p><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => copy(link)}>{copied === link.id ? <Check className="mr-1 h-4 w-4 text-emerald-600"/> : <Copy className="mr-1 h-4 w-4"/>}{copied === link.id ? 'Copiado' : 'Copiar'}</Button><Button size="sm" variant="outline" asChild><a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4"/>Abrir</a></Button></div></div>;
          })}</div>
          <div className="mt-3"><Button size="sm" onClick={() => onApply?.(item)}><WandSparkles className="mr-1 h-4 w-4"/>Usar campaña</Button></div>
        </article>)}
      </div>
      {!data.owner_eligible && <p className="mt-3 text-xs text-muted-foreground">La campaña para propietarios se habilita cuando la cuenta tiene Telegram verificado y Moonbot confirma un canal con estado creator. Las visitas anónimas y publicaciones de canal usan siempre la campaña general.</p>}
      <p className="mt-3 text-xs text-muted-foreground"><b>Segmentación:</b> el referido general puede mostrarse en cualquier destino autorizado. El de propietarios solo se entrega a cuentas con canal confirmado. Después puedes limitar ambos por web, hueco, canal o grupo desde “Segmentación por chats de Telegram”.</p>
    </>}
    <p className="mt-3 text-xs text-muted-foreground">También puedes escribir cualquier URL HTTPS de un tercero en “Enlace”; el servidor rechazará esquemas inseguros.</p>
  </section>;
}
