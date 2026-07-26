import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Palette, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const empty = { title: '', description: '', url: '', image: '', placement: 'all', priority: 50, enabled: true, cta: 'Abrir', background: '#eef7ff', foreground: '#155f9b', accent: '#1982d1', starts_at: '', ends_at: '' };
const formats = { all: 'Todos los huecos', top: 'Superior panorámico', right: 'Lateral vertical', inline: 'Entre noticias' };
const recommendations = {
  top: { title: 'Únete a nuestra comunidad', description: 'Noticias, tecnología y conversación en un mismo canal.', cta: 'Unirme ahora', background: '#ecfeff', foreground: '#155e75', accent: '#0891b2', priority: 80 },
  right: { title: 'Contenido recomendado', description: 'Descubre uno de los espacios destacados de nuestra red.', cta: 'Descubrir', background: '#f0fdf4', foreground: '#166534', accent: '#16a34a', priority: 70 },
  inline: { title: 'Sigue leyendo en Telegram', description: 'Recibe las próximas novedades directamente en Telegram.', cta: 'Seguir canal', background: '#eff6ff', foreground: '#1e3a8a', accent: '#2563eb', priority: 75 },
};
const campaignStatus = (ad) => { const now = Date.now(); if (!ad.enabled) return 'Pausada'; if (ad.starts_at && Date.parse(ad.starts_at) > now) return 'Programada'; if (ad.ends_at && Date.parse(ad.ends_at) < now) return 'Finalizada'; return 'Activa'; };

function AdPreview({ ad }) {
  const shape = ad.placement === 'right' ? 'max-w-[250px] min-h-52 flex-col text-center' : 'w-full min-h-24';
  return <div className={`flex items-center gap-3 overflow-hidden rounded-xl border p-4 shadow-sm ${shape}`} style={{ background: ad.background, color: ad.foreground, borderColor: `${ad.accent}55` }}>
    {ad.image ? <img src={ad.image} alt="" className={ad.placement === 'right' ? 'h-24 w-full rounded-lg object-cover' : 'h-16 w-16 rounded-lg object-cover'} /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg" style={{ background: `${ad.accent}22` }}><Palette /></div>}
    <div className="min-w-0 flex-1"><small className="text-[10px] uppercase tracking-wider opacity-70">Recomendado</small><strong className="block text-lg">{ad.title || 'Tu anuncio personalizado'}</strong><span className="block text-sm opacity-80">{ad.description || 'Añade aquí una descripción breve.'}</span></div>
    <span className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: ad.accent }}>{ad.cta || 'Abrir'}</span>
  </div>;
}

export default function HouseAdsManager() {
  const [ads, setAds] = useState([]), [draft, setDraft] = useState(empty), [error, setError] = useState(''), [advice, setAdvice] = useState('');
  const preview = useMemo(() => ({ ...empty, ...draft }), [draft]);
  const request = async (body) => { const response = await apiServerClient.fetch('/house-ads', { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAds(data.ads || []); };
  useEffect(() => { apiServerClient.fetch('/house-ads').then((r) => r.json()).then((d) => setAds(d.ads || [])).catch(() => setError('No se pudo cargar el catálogo')); }, []);
  const save = async () => { try { setError(''); await request({ action: 'upsert', ad: draft }); setDraft(empty); setAdvice(''); } catch (e) { setError(e.message); } };
  const field = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const recommend = () => {
    const placements = ['top', 'right', 'inline'];
    const score = (placement) => ads.filter((ad) => ad.enabled !== false && ['all', placement].includes(ad.placement)).reduce((total, ad) => total + Number(ad.impressions || 0), 0);
    const placement = placements.sort((a, b) => score(a) - score(b))[0];
    const proven = [...ads].filter((ad) => ad.impressions > 0).sort((a, b) => ((b.clicks || 0) / b.impressions) - ((a.clicks || 0) / a.impressions))[0];
    setDraft((current) => ({ ...current, ...recommendations[placement], placement, url: current.url || proven?.url || '', image: current.image || proven?.image || '' }));
    setAdvice(`${formats[placement]} es el espacio con menor cobertura (${score(placement)} impresiones). ${proven ? `Se reutilizó el destino de la campaña con mejor CTR: ${proven.title}.` : 'Añade el canal o grupo de destino antes de publicar.'}`);
  };
  return <section className="mt-8 rounded-xl border p-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Creador de anuncios propios</h3><p className="text-sm text-muted-foreground">Diseña campañas para los huecos de NoticiasWeb3. Se muestran cuando AdSense no entrega anuncio.</p></div><Button variant="outline" onClick={recommend}><Sparkles className="mr-2 h-4 w-4"/>Recomendar campaña</Button></div>
    {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
    {advice && <p className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">{advice}</p>}
    <div className="grid gap-5 xl:grid-cols-2"><div><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Título" value={draft.title} onChange={(e) => field('title', e.target.value)}/><Input placeholder="Enlace https://t.me/..." value={draft.url} onChange={(e) => field('url', e.target.value)}/><Input placeholder="Descripción" value={draft.description} onChange={(e) => field('description', e.target.value)}/><Input placeholder="Imagen opcional https://..." value={draft.image} onChange={(e) => field('image', e.target.value)}/><select className="h-10 rounded-md border bg-background px-3" value={draft.placement} onChange={(e) => field('placement', e.target.value)}>{Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input placeholder="Texto del botón" maxLength={24} value={draft.cta} onChange={(e) => field('cta', e.target.value)}/><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Fondo <input type="color" value={draft.background} onChange={(e) => field('background', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Texto <input type="color" value={draft.foreground} onChange={(e) => field('foreground', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Botón <input type="color" value={draft.accent} onChange={(e) => field('accent', e.target.value)}/></label><Input title="Prioridad 0-100" type="number" min="0" max="100" value={draft.priority} onChange={(e) => field('priority', Number(e.target.value))}/><label className="text-xs text-muted-foreground">Inicio opcional<Input type="datetime-local" value={draft.starts_at} onChange={(e) => field('starts_at', e.target.value)}/></label><label className="text-xs text-muted-foreground">Fin opcional<Input type="datetime-local" value={draft.ends_at} onChange={(e) => field('ends_at', e.target.value)}/></label></div><div className="mt-3 flex gap-2"><Button disabled={!draft.title || !draft.url} onClick={save}><Plus className="mr-2 h-4 w-4"/>{draft.id ? 'Guardar cambios' : 'Publicar anuncio'}</Button>{draft.id && <Button variant="outline" onClick={() => setDraft(empty)}>Cancelar</Button>}</div></div>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa · {formats[draft.placement]}</p><div className="grid min-h-64 place-items-center rounded-xl bg-muted/40 p-4"><AdPreview ad={preview}/></div></div></div>
    <div className="mt-5 grid gap-2 md:grid-cols-2">{ads.map((ad) => { const impressions = ad.impressions || 0, ctr = impressions ? ((ad.clicks || 0) * 100 / impressions).toFixed(2) : '0.00', tracking = `https://todosobreall.tech/hcgi/api/house-ads/${ad.id}/click?placement=external`; return <div key={ad.id} className="rounded-lg border p-3 text-sm"><AdPreview ad={{ ...empty, ...ad }}/><p className="mt-2 text-muted-foreground"><b>{campaignStatus(ad)}</b> · {formats[ad.placement] || ad.placement} · {impressions} impresiones · {ad.clicks || 0} clics · CTR {ctr}%</p><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => request({ action: 'upsert', ad: { ...ad, enabled: !ad.enabled } })}>{ad.enabled ? 'Pausar' : 'Activar'}</Button><Button size="sm" variant="outline" onClick={() => { setDraft({ ...empty, ...ad }); document.getElementById('moon-house-ads')?.scrollIntoView({ behavior: 'smooth' }); }}><Pencil className="mr-1 h-4 w-4"/>Editar</Button><Button size="sm" variant="outline" onClick={() => request({ action: 'reset_metrics', id: ad.id })}><RotateCcw className="mr-1 h-4 w-4"/>Métricas</Button><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(tracking)}><Copy className="mr-1 h-4 w-4"/>Enlace</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'delete', id: ad.id })}><Trash2 className="h-4 w-4"/></Button></div></div>; })}</div>
  </section>;
}
