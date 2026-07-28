import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, CopyPlus, Palette, Pencil, Plus, Radio, RotateCcw, Search, Sparkles, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const empty = { title: '', description: '', url: '', image: '', placement: 'all', priority: 50, enabled: true, cta: 'Abrir', background: '#eef7ff', foreground: '#155f9b', accent: '#1982d1', starts_at: '', ends_at: '', max_clicks: 0 };
const formats = { all: 'Todos los huecos', top: 'Superior panorámico', right: 'Lateral vertical', inline: 'Entre noticias' };
const recommendations = {
  top: { title: 'Únete a nuestra comunidad', description: 'Noticias, tecnología y conversación en un mismo canal.', cta: 'Unirme ahora', background: '#ecfeff', foreground: '#155e75', accent: '#0891b2', priority: 80 },
  right: { title: 'Contenido recomendado', description: 'Descubre uno de los espacios destacados de nuestra red.', cta: 'Descubrir', background: '#f0fdf4', foreground: '#166534', accent: '#16a34a', priority: 70 },
  inline: { title: 'Sigue leyendo en Telegram', description: 'Recibe las próximas novedades directamente en Telegram.', cta: 'Seguir canal', background: '#eff6ff', foreground: '#1e3a8a', accent: '#2563eb', priority: 75 },
};
const campaignStatus = (ad) => { const now = Date.now(); if (ad.goal_reached) return 'Objetivo alcanzado'; if (ad.approval_status === 'pending') return 'Pendiente de aprobación'; if (ad.approval_status === 'rejected') return 'Rechazada'; if (!ad.enabled) return 'Pausada'; if (ad.starts_at && Date.parse(ad.starts_at) > now) return 'Programada'; if (ad.ends_at && Date.parse(ad.ends_at) < now) return 'Finalizada'; return 'Activa'; };
const placementSummary = (ad) => Object.entries(ad.clicks_by_placement || {}).sort((a, b) => b[1] - a[1]).map(([place, clicks]) => `${formats[place] || place}: ${clicks}`).join(' · ');
const countrySummary = (values = {}) => Object.entries(values).sort((a, b) => b[1] - a[1]).map(([country, total]) => `${country}: ${total}`).join(' · ');

function AdPreview({ ad }) {
  const shape = ad.placement === 'right' ? 'max-w-[250px] min-h-52 flex-col text-center' : 'w-full min-h-24';
  return <div className={`flex items-center gap-3 overflow-hidden rounded-xl border p-4 shadow-sm ${shape}`} style={{ background: ad.background, color: ad.foreground, borderColor: `${ad.accent}55` }}>
    {ad.image ? <img src={ad.image} alt="" className={ad.placement === 'right' ? 'h-24 w-full rounded-lg object-cover' : 'h-16 w-16 rounded-lg object-cover'} /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg" style={{ background: `${ad.accent}22` }}><Palette /></div>}
    <div className="min-w-0 flex-1"><small className="text-[10px] uppercase tracking-wider opacity-70">{ad.automatic ? 'Canal del master · automático' : 'Recomendado'}</small><strong className="block text-lg">{ad.title || 'Tu anuncio personalizado'}</strong><span className="block whitespace-pre-line text-sm opacity-80"><SafeMarkdownText text={ad.description || 'Añade aquí una descripción breve.'}/></span></div>
    <span className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: ad.accent }}>{ad.cta || 'Abrir'}</span>
  </div>;
}

function SafeMarkdownText({ text }) {
  const token = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\n)/g;
  return String(text).split(token).filter(Boolean).map((part, index) => {
    if (part === '\n') return <br key={index}/>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a className="underline" key={index} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">{link[1]}</a>;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function HouseAdsManager({ groups = [] }) {
  const [ads, setAds] = useState([]), [draft, setDraft] = useState(empty), [error, setError] = useState(''), [advice, setAdvice] = useState(''), [uploading, setUploading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const isCreator = pb.authStore.model?.role === 'creator';
  const preview = useMemo(() => ({ ...empty, ...draft }), [draft]);
  const communitiesByBot = useMemo(() => {
    const query = communitySearch.trim().toLocaleLowerCase('es');
    const visible = groups.filter((group) => {
      const bots = Array.isArray(group.bots) ? group.bots.map((bot) => bot.username || bot.name || bot.id).join(' ') : '';
      return !query || `${group.name || ''} ${group.username || ''} ${group.id || ''} ${group.bot_username || ''} ${bots}`.toLocaleLowerCase('es').includes(query);
    });
    return visible.reduce((result, group) => {
      const bot = group.bot_username || group.bots?.[0]?.username || group.bots?.[0]?.name || 'Moonbot';
      const key = String(bot).replace(/^@/, '');
      if (!result[key]) result[key] = { channels: [], groups: [] };
      result[key][group.ctype === 'channel' ? 'channels' : 'groups'].push(group);
      return result;
    }, {});
  }, [groups, communitySearch]);
  const request = async (body) => { const response = await apiServerClient.fetch('/house-ads', { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAds(data.ads || []); };
  useEffect(() => { let active = true; const load = () => apiServerClient.fetch('/house-ads').then((r) => r.json()).then((d) => { if (active) setAds(d.ads || []); }).catch(() => { if (active) setError('No se pudo cargar el catálogo'); }); load(); const timer = window.setInterval(load, 30000); return () => { active = false; window.clearInterval(timer); }; }, []);
  const save = async () => { try { setError(''); await request({ action: 'upsert', ad: draft }); setDraft(empty); setAdvice(''); } catch (e) { setError(e.message); } };
  const field = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const selectCommunity = (id) => {
    const group = groups.find((item) => String(item.id) === id);
    if (!group) return;
    const username = String(group.username || group.public_username || '').replace(/^@/, '');
    const photo = group.photo_url || group.photo || group.image || '';
    setDraft((current) => ({ ...current, title: group.name || current.title, description: current.description || `Únete a ${group.name || 'nuestra comunidad'} en Telegram.`, url: username ? `https://t.me/${username}` : current.url, image: photo || current.image, cta: group.ctype === 'channel' ? 'Seguir canal' : 'Unirme al grupo' }));
    setAdvice(username ? `Destino seleccionado: ${group.name}.` : `${group.name} no tiene enlace público detectado; escribe su enlace de invitación.`);
  };
  const uploadImage = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 4 * 1024 * 1024) { setError('Usa una imagen JPG, PNG, WebP o GIF de menos de 4 MB.'); return; }
    setUploading(true); setError('');
    const reader = new FileReader();
    reader.onerror = () => { setUploading(false); setError('No se pudo leer la imagen.'); };
    reader.onload = async () => { try { const response = await apiServerClient.fetch('/house-ads/media', { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: reader.result }) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo subir la imagen'); field('image', data.url); } catch (cause) { setError(cause.message); } finally { setUploading(false); } };
    reader.readAsDataURL(file);
  };
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
    {ads.some((ad) => ad.automatic) && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"><p className="mb-2 text-sm font-semibold">Publicidad de canales del master</p><div className="flex flex-wrap gap-2">{ads.filter((ad) => ad.automatic).map((ad) => <Button key={ad.id} size="sm" variant={ad.enabled ? 'default' : 'outline'} onClick={() => request({ action: 'upsert', ad: { ...ad, enabled: !ad.enabled, goal_reached: false } })}>{ad.enabled ? `Detener · ${ad.title}` : `Activar · ${ad.title}`}</Button>)}</div></div>}
    <div className="mb-4 rounded-xl border bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Añadir una comunidad de Telegram</p><p className="text-xs text-muted-foreground">Elige visualmente un canal o grupo administrado. Se agrupan por bot asociado.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar comunidad o bot" value={communitySearch} onChange={(event) => setCommunitySearch(event.target.value)}/></div></div>
      {Object.keys(communitiesByBot).length ? <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{Object.entries(communitiesByBot).map(([bot, sections], botIndex) => <details key={bot} open={botIndex === 0 || Boolean(communitySearch)} className="rounded-lg border bg-background"><summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">@{bot} · {sections.channels.length + sections.groups.length} comunidades</summary><div className="space-y-3 border-t p-3">{[['channels', 'Canales'], ['groups', 'Grupos']].map(([type, label]) => sections[type].length ? <div key={type}><p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{type === 'channels' ? <Radio className="h-3.5 w-3.5"/> : <Users className="h-3.5 w-3.5"/>}{label} · {sections[type].length}</p><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{sections[type].map((group) => { const username = String(group.username || group.public_username || '').replace(/^@/, ''); const selected = draft.title === group.name && (!username || draft.url === `https://t.me/${username}`); return <button key={`${bot}-${group.id}`} type="button" onClick={() => selectCommunity(String(group.id))} className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left transition hover:border-primary hover:bg-primary/5 ${selected ? 'border-primary bg-primary/10' : ''}`}><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-100 text-sky-700">{group.photo_url || group.photo || group.image ? <img src={group.photo_url || group.photo || group.image} alt="" className="h-full w-full object-cover"/> : type === 'channels' ? <Radio className="h-4 w-4"/> : <Users className="h-4 w-4"/>}</div><span className="min-w-0"><strong className="block truncate text-xs">{group.name || group.id}</strong><span className="block truncate text-[11px] text-muted-foreground">{username ? `@${username}` : 'Requiere enlace de invitación'}{Number(group.subscribers || group.members || group.member_count) > 0 ? ` · ${Number(group.subscribers || group.members || group.member_count).toLocaleString('es-ES')} miembros` : ''}</span></span></button>; })}</div></div> : null)}</div></details>)}</div> : <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No hay comunidades que coincidan con la búsqueda.</p>}
    </div>
    <div className="mb-3 grid gap-3 md:grid-cols-2"><label className="block text-xs text-muted-foreground">Selector rápido<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="" onChange={(event) => selectCommunity(event.target.value)}><option value="">Selecciona un grupo o canal</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.ctype === 'channel' ? 'Canal' : 'Grupo'} · {group.name || group.id}</option>)}</select></label><label className="block text-xs text-muted-foreground">Objetivo de clics (0 = ilimitado)<Input type="number" min="0" value={draft.max_clicks} onChange={(e) => field('max_clicks', Number(e.target.value))}/></label></div>
    <div className="grid gap-5 xl:grid-cols-2"><div><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Título" value={draft.title} onChange={(e) => field('title', e.target.value)}/><Input placeholder="Enlace https://t.me/..." value={draft.url} onChange={(e) => field('url', e.target.value)}/><Input placeholder="Descripción" value={draft.description} onChange={(e) => field('description', e.target.value)}/><div className="space-y-1"><Input placeholder="Imagen opcional https://..." value={draft.image} onChange={(e) => field('image', e.target.value)}/><label className="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs hover:bg-muted"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0])}/>{uploading ? 'Subiendo imagen…' : 'Elegir foto del dispositivo'}</label></div><select className="h-10 rounded-md border bg-background px-3" value={draft.placement} onChange={(e) => field('placement', e.target.value)}>{Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input placeholder="Texto del botón" maxLength={24} value={draft.cta} onChange={(e) => field('cta', e.target.value)}/><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Fondo <input type="color" value={draft.background} onChange={(e) => field('background', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Texto <input type="color" value={draft.foreground} onChange={(e) => field('foreground', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Botón <input type="color" value={draft.accent} onChange={(e) => field('accent', e.target.value)}/></label><Input title="Prioridad 0-100" type="number" min="0" max="100" value={draft.priority} onChange={(e) => field('priority', Number(e.target.value))}/><label className="text-xs text-muted-foreground">Inicio opcional<Input type="datetime-local" value={draft.starts_at} onChange={(e) => field('starts_at', e.target.value)}/></label><label className="text-xs text-muted-foreground">Fin opcional<Input type="datetime-local" value={draft.ends_at} onChange={(e) => field('ends_at', e.target.value)}/></label></div><div className="mt-3 flex gap-2"><Button disabled={!draft.title || !draft.url || uploading} onClick={save}><Plus className="mr-2 h-4 w-4"/>{draft.id ? 'Guardar cambios' : 'Publicar anuncio'}</Button>{draft.id && <Button variant="outline" onClick={() => setDraft(empty)}>Cancelar</Button>}</div></div>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa · {formats[draft.placement]}</p><div className="grid min-h-64 place-items-center rounded-xl bg-muted/40 p-4"><AdPreview ad={preview}/></div></div></div>
    <div className="mt-5 grid gap-2 md:grid-cols-2">{ads.map((ad) => { const impressions = ad.impressions || 0, ctr = impressions ? ((ad.clicks || 0) * 100 / impressions).toFixed(2) : '0.00', tracking = `https://todosobreall.tech/hcgi/api/community-cards/${ad.id}/click?placement=external`; return <div key={ad.id} className="rounded-lg border p-3 text-sm"><AdPreview ad={{ ...empty, ...ad }}/><p className="mt-2 text-muted-foreground"><b>{campaignStatus(ad)}</b> · {formats[ad.placement] || ad.placement} · {impressions} impresiones · {ad.clicks || 0} clics · CTR {ctr}%{ad.max_clicks > 0 && ` · objetivo ${ad.clicks || 0}/${ad.max_clicks}`}</p>{placementSummary(ad) && <p className="mt-1 text-xs text-muted-foreground">Clics por ubicación: {placementSummary(ad)}</p>}{countrySummary(ad.clicks_by_country) && <p className="mt-1 text-xs text-muted-foreground"><b>País de los clics:</b> {countrySummary(ad.clicks_by_country)}</p>}{countrySummary(ad.impressions_by_country) && <p className="mt-1 text-xs text-muted-foreground">País de las impresiones: {countrySummary(ad.impressions_by_country)}</p>}<div className="mt-2 flex flex-wrap gap-2">{isCreator && ad.approval_status === 'pending' && <><Button size="sm" onClick={() => request({ action: 'approve', id: ad.id })}><Check className="mr-1 h-4 w-4"/>Aprobar</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'reject', id: ad.id })}><X className="mr-1 h-4 w-4"/>Rechazar</Button></>}<Button size="sm" variant="outline" onClick={() => request({ action: 'upsert', ad: { ...ad, enabled: !ad.enabled, goal_reached: false } })}>{ad.enabled ? 'Pausar' : 'Activar'}</Button><Button size="sm" variant="outline" onClick={() => { setDraft({ ...empty, ...ad }); document.getElementById('moon-house-ads')?.scrollIntoView({ behavior: 'smooth' }); }}><Pencil className="mr-1 h-4 w-4"/>Editar</Button><Button size="sm" variant="outline" onClick={() => request({ action: 'clone', id: ad.id })}><CopyPlus className="mr-1 h-4 w-4"/>Duplicar</Button><Button size="sm" variant="outline" onClick={() => request({ action: 'reset_metrics', id: ad.id })}><RotateCcw className="mr-1 h-4 w-4"/>Métricas</Button><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(tracking)}><Copy className="mr-1 h-4 w-4"/>Enlace</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'delete', id: ad.id })}><Trash2 className="h-4 w-4"/></Button></div></div>; })}</div>
  </section>;
}
