import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Copy, CopyPlus, Eye, Flag, Palette, Pencil, Plus, Radio, Rocket, RotateCcw, Search, Sparkles, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import ContentAnalyticsDialog from '@/components/ContentAnalyticsDialog.jsx';
import InsideAdsLinksPanel from '@/components/InsideAdsLinksPanel.jsx';
import CampaignGovernancePanel from '@/components/CampaignGovernancePanel.jsx';

const empty = { title: '', description: '', url: '', boost_url: '', image: '', placement: 'all', placements: ['all'], allowed_sites: ['all'], target_channel_ids: [], target_group_ids: [], excluded_channel_ids: [], excluded_group_ids: [], target_countries: [], excluded_countries: [], target_languages: [], excluded_languages: [], delivery_days: [], delivery_start: '', delivery_end: '', delivery_timezone: 'Europe/Madrid', priority: 50, enabled: true, cta: 'Abrir', background: '#eef7ff', foreground: '#155f9b', accent: '#1982d1', starts_at: '', ends_at: '', max_clicks: 0, max_impressions: 0, daily_click_cap: 0, daily_impression_cap: 0, content_categories: [], include_keywords: [], exclude_keywords: [], display_seconds: 15, frequency_cap: 3, frequency_window_hours: 24, destination_mode: 'single', community_id: '', community_items: [], display_format: 'auto', relationship_type: 'affiliate', telegram_verified: false, community_verified: false, disclosure_type: 'community', disclosure_label: '', ab_enabled: false, variants: [] };
const formats = { all: 'Todos los huecos', top: 'Superior panorámico', right: 'Lateral derecho', left: 'Lateral izquierdo', inline: 'Entre noticias', telegram_channel: 'Canal de Telegram', telegram_react_channel: 'Telegram React', hub: 'Hub de Moonbot' };
const sites = { all: 'Todos los sitios', main: 'TodoSobreAllTech', noticiasweb3: 'NoticiasWeb3', comunidadtelebots: 'ComunidadTelebots', 'resistencia-censura': 'Resistencia Censura', todosobregameplays: 'Gameplays', proxy: 'Proxies', hub: 'Hub Moonbot', telegram_channel: 'Canal Telegram', 'telegram-react': 'Telegram React' };
const recommendations = {
  top: { title: 'Únete a nuestra comunidad', description: 'Noticias, tecnología y conversación en un mismo canal.', cta: 'Unirme ahora', background: '#ecfeff', foreground: '#155e75', accent: '#0891b2', priority: 80 },
  right: { title: 'Contenido recomendado', description: 'Descubre uno de los espacios destacados de nuestra red.', cta: 'Descubrir', background: '#f0fdf4', foreground: '#166534', accent: '#16a34a', priority: 70 },
  inline: { title: 'Sigue leyendo en Telegram', description: 'Recibe las próximas novedades directamente en Telegram.', cta: 'Seguir canal', background: '#eff6ff', foreground: '#1e3a8a', accent: '#2563eb', priority: 75 },
};
const campaignStatus = (ad) => { const now = Date.now(); if (ad.goal_reached) return 'Objetivo alcanzado'; if (ad.approval_status === 'pending') return 'Pendiente de aprobación'; if (ad.approval_status === 'rejected') return 'Rechazada'; if (!ad.enabled) return 'Pausada'; if (ad.starts_at && Date.parse(ad.starts_at) > now) return 'Programada'; if (ad.ends_at && Date.parse(ad.ends_at) < now) return 'Finalizada'; return 'Activa'; };
const placementSummary = (ad) => Object.entries(ad.clicks_by_placement || {}).sort((a, b) => b[1] - a[1]).map(([place, clicks]) => `${formats[place] || place}: ${clicks}`).join(' · ');
const countrySummary = (values = {}) => Object.entries(values).sort((a, b) => b[1] - a[1]).map(([country, total]) => `${country}: ${total}`).join(' · ');
const entitySummary = (values = {}, groups = []) => Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, total]) => `${groups.find((item) => String(item.id) === String(id))?.name || id}: ${total}`).join(' · ');
const relationshipLabel = (ad = {}) => ad.relationship_type === 'official' || ad.builtin
  ? 'Comunidad oficial TodoSobreAllTech'
  : ad.relationship_type === 'verified' && ad.telegram_verified && ad.community_verified
    ? '✓ Telegram · ✓ TodoSobreAllTech'
    : 'Afiliado · intercambio de visitas';

function AdPreview({ ad }) {
  const shape = ad.placement === 'right' ? 'max-w-[250px] min-h-52 flex-col text-center' : 'w-full min-h-24';
  if (ad.community_items?.length) {
    const oneItem = ['compact', 'spotlight'].includes(ad.display_format) || ad.community_items.length === 1;
    const items = ad.community_items.slice(0, oneItem ? 1 : 4);
    const grid = oneItem ? 'grid-cols-1' : ad.placement === 'right' || ad.placement === 'left' ? 'grid-cols-2' : 'grid-cols-4';
    return <div className={`overflow-hidden rounded-xl border p-3 shadow-sm ${shape}`} style={{ background: ad.background, color: ad.foreground, borderColor: `${ad.accent}55` }}><small className="text-[10px] font-bold uppercase tracking-wider opacity-80">{relationshipLabel(ad)}</small><strong className="mb-2 block text-base">{ad.title}</strong><div className={`grid gap-1 ${grid}`}>{items.map((item) => <div key={item.id} className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white/50 p-2 ${oneItem ? '' : 'aspect-square flex-col justify-center text-center'}`}><div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-xs text-white" style={{ background: ad.accent }}>{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover"/> : String(item.title || 'T').slice(0, 1)}</div><span className={`min-w-0 flex-1 text-xs font-semibold ${oneItem ? 'truncate' : 'line-clamp-2'}`}>{item.title}</span>{item.boost_url && <Rocket className="h-3.5 w-3.5 shrink-0" aria-label="Enlace boost"/>}</div>)}</div></div>;
  }
  return <div className={`flex items-center gap-3 overflow-hidden rounded-xl border p-4 shadow-sm ${shape}`} style={{ background: ad.background, color: ad.foreground, borderColor: `${ad.accent}55` }}>
    {ad.image ? <img src={ad.image} alt="" className={ad.placement === 'right' ? 'h-24 w-full rounded-lg object-cover' : 'h-16 w-16 rounded-lg object-cover'} /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg" style={{ background: `${ad.accent}22` }}><Palette /></div>}
    <div className="min-w-0 flex-1"><small className="text-[10px] font-bold uppercase tracking-wider opacity-80">{relationshipLabel(ad)}</small><strong className="block text-lg">{ad.title || 'Tu anuncio personalizado'}</strong><span className="block whitespace-pre-line text-sm opacity-80"><SafeMarkdownText text={ad.description || 'Añade aquí una descripción breve.'}/></span></div>
    <span className="flex shrink-0 flex-col gap-1"><span className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: ad.accent }}>{ad.cta || 'Abrir'}</span>{ad.boost_url && <span className="flex items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"><Rocket className="h-3 w-3"/>Impulsar</span>}</span>
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

function CampaignDeliveryControls({ draft, field, toggleChoice }) {
  const list = (value, lower = false) => [...new Set(String(value || '').split(/[\s,;]+/).map((item) => lower ? item.toLowerCase() : item.toUpperCase()).filter(Boolean))];
  return <div className="mb-4 grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-2">
    <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4"/>Dónde se muestra</p><div className="flex flex-wrap gap-2">{Object.entries(formats).map(([value, label]) => <button key={value} type="button" onClick={() => toggleChoice('placements', value)} className={`rounded-full border px-3 py-1.5 text-xs ${draft.placements?.includes(value) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary'}`}>{label}</button>)}</div></div>
    <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4"/>Sitios y destinos únicos</p><div className="flex flex-wrap gap-2">{Object.entries(sites).map(([value, label]) => <button key={value} type="button" onClick={() => toggleChoice('allowed_sites', value)} className={`rounded-full border px-3 py-1.5 text-xs ${draft.allowed_sites?.includes(value) ? 'border-sky-600 bg-sky-600 text-white' : 'bg-background hover:border-sky-600'}`}>{label}</button>)}</div></div>
    <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-muted-foreground">Duración visible (segundos)<Input type="number" min="3" max="300" value={draft.display_seconds} onChange={(event) => field('display_seconds', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Máximo por usuario<Input type="number" min="0" max="100" value={draft.frequency_cap} onChange={(event) => field('frequency_cap', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Ventana (horas)<Input type="number" min="1" max="720" value={draft.frequency_window_hours} onChange={(event) => field('frequency_window_hours', Number(event.target.value))}/></label></div>
    <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Objetivo de impresiones (0 = ilimitado)<Input type="number" min="0" value={draft.max_impressions} onChange={(event) => field('max_impressions', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Tipo de destino<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.destination_mode} onChange={(event) => field('destination_mode', event.target.value)}><option value="single">Enlace único</option><option value="community">Comunidad con varios chats</option></select></label></div>
    <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Países incluidos (ISO)<Input value={(draft.target_countries || []).join(', ')} placeholder="ES, MX, AR" onChange={(event) => field('target_countries', list(event.target.value))}/></label><label className="text-xs text-muted-foreground">Países excluidos<Input value={(draft.excluded_countries || []).join(', ')} placeholder="RU, US" onChange={(event) => field('excluded_countries', list(event.target.value))}/></label><label className="text-xs text-muted-foreground">Idiomas incluidos<Input value={(draft.target_languages || []).join(', ')} placeholder="es, ca, en" onChange={(event) => field('target_languages', list(event.target.value, true))}/></label><label className="text-xs text-muted-foreground">Idiomas excluidos<Input value={(draft.excluded_languages || []).join(', ')} placeholder="ru, en" onChange={(event) => field('excluded_languages', list(event.target.value, true))}/></label></div>
    <div className="space-y-2"><p className="text-xs font-semibold">Días de entrega</p><div className="flex flex-wrap gap-1">{['L','M','X','J','V','S','D'].map((label, index) => <button key={label} type="button" onClick={() => { const day = index + 1; const current = new Set(draft.delivery_days || []); if (current.has(day)) current.delete(day); else current.add(day); field('delivery_days', [...current].sort()); }} className={`h-8 w-8 rounded-full border text-xs ${(draft.delivery_days || []).includes(index + 1) ? 'bg-primary text-primary-foreground' : ''}`}>{label}</button>)}</div></div>
    <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-muted-foreground">Desde<Input type="time" value={draft.delivery_start || ''} onChange={(event) => field('delivery_start', event.target.value)}/></label><label className="text-xs text-muted-foreground">Hasta<Input type="time" value={draft.delivery_end || ''} onChange={(event) => field('delivery_end', event.target.value)}/></label><label className="text-xs text-muted-foreground">Zona horaria<Input value={draft.delivery_timezone || 'UTC'} placeholder="Europe/Madrid" onChange={(event) => field('delivery_timezone', event.target.value)}/></label></div>
    <p className="text-xs text-muted-foreground lg:col-span-2"><Clock3 className="mr-1 inline h-3.5 w-3.5"/>Las fechas controlan la campaña; la duración indica cuánto permanece visible y el límite evita saturar a una misma persona.</p>
  </div>;
}

function TelegramTargeting({ draft, groups, field }) {
  const [query, setQuery] = useState('');
  const toggle = (key, id) => {
    const selected = new Set(draft[key] || []);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    field(key, [...selected]);
  };
  const visible = groups.filter((item) => `${item.name || ''} ${item.username || ''} ${item.id || ''}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  return <div className="mb-4 rounded-xl border bg-background p-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">Segmentación por chats de Telegram</p><p className="text-xs text-muted-foreground">Sin selección, la campaña puede aparecer en todos. Si eliges chats, solo se entrega cuando el canal, grupo, bot o Hub envía su ID a la API.</p></div><Input className="w-full sm:w-72" placeholder="Buscar canal, grupo o ID" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
    <div className="grid max-h-72 gap-3 overflow-y-auto md:grid-cols-2">{[['channel', 'target_channel_ids', 'Canales'], ['group', 'target_group_ids', 'Grupos del bot']].map(([type, key, label]) => <div key={key}><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</p><div className="space-y-1">{visible.filter((item) => type === 'channel' ? item.ctype === 'channel' : item.ctype !== 'channel').map((item) => { const id = String(item.id); const active = draft[key]?.includes(id); return <button key={`${key}-${id}`} type="button" onClick={() => toggle(key, id)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${active ? 'border-sky-600 bg-sky-50 text-sky-950' : 'hover:border-sky-400'}`}><span className="min-w-0"><b className="block truncate">{item.name || id}</b><span className="text-muted-foreground">{item.username ? `@${String(item.username).replace(/^@/, '')} · ` : ''}{id}</span></span>{active && <Check className="h-4 w-4 shrink-0 text-sky-600"/>}</button>; })}</div></div>)}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><b>{(draft.target_channel_ids?.length || 0) + (draft.target_group_ids?.length || 0)} destinos concretos</b>{((draft.target_channel_ids?.length || 0) + (draft.target_group_ids?.length || 0)) > 0 && <Button type="button" size="sm" variant="outline" onClick={() => { field('target_channel_ids', []); field('target_group_ids', []); }}>Mostrar en todos</Button>}</div>
    <div className="mt-3 grid gap-2 md:grid-cols-2"><label className="text-xs text-muted-foreground">Excluir canales (IDs separados por comas)<Input value={(draft.excluded_channel_ids || []).join(', ')} onChange={(event) => field('excluded_channel_ids', event.target.value.split(/[\s,;]+/).filter((id) => /^-?\d{5,24}$/.test(id)))}/></label><label className="text-xs text-muted-foreground">Excluir grupos (IDs separados por comas)<Input value={(draft.excluded_group_ids || []).join(', ')} onChange={(event) => field('excluded_group_ids', event.target.value.split(/[\s,;]+/).filter((id) => /^-?\d{5,24}$/.test(id)))}/></label></div>
  </div>;
}

const csv = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

function CampaignStrategyControls({ draft, field }) {
  return <div className="mb-4 grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-2">
    <div><p className="text-sm font-semibold">Reglas según el contenido</p><p className="mb-2 text-xs text-muted-foreground">Relaciona la campaña con la categoría y palabras del artículo o mensaje. Las exclusiones tienen prioridad.</p><Input placeholder="Categorías: ia, seguridad, gaming" value={(draft.content_categories || []).join(', ')} onChange={(event) => field('content_categories', csv(event.target.value))}/><Input className="mt-2" placeholder="Debe contener: telegram, privacidad" value={(draft.include_keywords || []).join(', ')} onChange={(event) => field('include_keywords', csv(event.target.value))}/><Input className="mt-2" placeholder="Excluir si contiene: apuestas, adulto" value={(draft.exclude_keywords || []).join(', ')} onChange={(event) => field('exclude_keywords', csv(event.target.value))}/></div>
    <div><p className="text-sm font-semibold">Presupuesto de entrega y objetivos</p><p className="mb-2 text-xs text-muted-foreground">Los límites diarios frenan la entrega del día; los objetivos totales finalizan la campaña.</p><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Clics por día<Input type="number" min="0" value={draft.daily_click_cap || 0} onChange={(event) => field('daily_click_cap', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Impresiones por día<Input type="number" min="0" value={draft.daily_impression_cap || 0} onChange={(event) => field('daily_impression_cap', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Objetivo total de clics<Input type="number" min="0" value={draft.max_clicks || 0} onChange={(event) => field('max_clicks', Number(event.target.value))}/></label><label className="text-xs text-muted-foreground">Objetivo total de impresiones<Input type="number" min="0" value={draft.max_impressions || 0} onChange={(event) => field('max_impressions', Number(event.target.value))}/></label></div></div>
  </div>;
}

function CampaignSafetyControls({ draft, field }) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState([]);
  const checkDestinations = async () => {
    setChecking(true);
    try {
      const response = await apiServerClient.fetch('/house-ads/destinations/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ channel_ids: draft.target_channel_ids || [], group_ids: draft.target_group_ids || [] }) });
      const payload = await apiServerClient.readJson(response);
      setResults(response.ok ? payload.results || [] : []);
    } finally { setChecking(false); }
  };
  const setVariant = (index, key, value) => {
    const variants = [...(draft.variants || [])];
    variants[index] = { id: index ? 'b' : 'a', weight: 50, ...(variants[index] || {}), [key]: value };
    field('variants', variants);
  };
  return <div className="mb-4 grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-2">
    <div><p className="text-sm font-semibold">Transparencia visible</p><select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.disclosure_type || 'community'} onChange={(event) => field('disclosure_type', event.target.value)}><option value="community">CampaÃ±a comunitaria</option><option value="official">Contenido oficial</option><option value="affiliate">Enlace afiliado</option><option value="inside_ads">Publicidad Â· Inside Ads</option></select><Input className="mt-2" maxLength={80} placeholder="Etiqueta personalizada opcional" value={draft.disclosure_label || ''} onChange={(event) => field('disclosure_label', event.target.value)}/></div>
    <div><p className="text-sm font-semibold">Estado de los destinos</p><p className="mb-2 text-xs text-muted-foreground">Comprueba desde Moonbot que el chat existe y que el bot sigue presente.</p><Button type="button" size="sm" variant="outline" disabled={checking || !(draft.target_channel_ids?.length || draft.target_group_ids?.length)} onClick={checkDestinations}>{checking ? 'Comprobandoâ€¦' : 'Comprobar destinos'}</Button>{results.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{results.map((item) => <span key={item.id} className={`rounded-full border px-2 py-1 text-xs ${item.bot_present ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}>{item.name || item.id}: {item.bot_present ? 'bot activo' : 'sin acceso'}</span>)}</div>}</div>
    <div className="lg:col-span-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.ab_enabled === true} onChange={(event) => field('ab_enabled', event.target.checked)}/>Activar prueba A/B</label><p className="text-xs text-muted-foreground">AsignaciÃ³n estable por visitante; no alterna el mensaje durante la misma experiencia.</p>{draft.ab_enabled && <div className="mt-2 grid gap-2 md:grid-cols-2"><Input placeholder="TÃ­tulo variante A" value={draft.variants?.[0]?.title || ''} onChange={(event) => setVariant(0, 'title', event.target.value)}/><Input placeholder="TÃ­tulo variante B" value={draft.variants?.[1]?.title || ''} onChange={(event) => setVariant(1, 'title', event.target.value)}/></div>}</div>
  </div>;
}

function CampaignAuditPanel({ events }) {
  if (!events.length) return null;
  const labels = { upsert: 'Guardó', approve: 'Aprobó', reject: 'Rechazó', toggle: 'Cambió estado', clone: 'Duplicó', delete: 'Eliminó', reset_metrics: 'Reinició métricas', verify_telegram: 'Verificó Telegram' };
  return <details className="mt-5 rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Auditoría master · {events.length} acciones</summary><div className="mt-3 max-h-72 space-y-2 overflow-auto">{events.map((event) => <div key={event.id} className="rounded-lg border bg-muted/20 p-2 text-xs"><b>{labels[event.action] || event.action}</b> · {event.after?.title || event.before?.title || event.ad_id || 'campaña'}<span className="block text-muted-foreground">{new Date(event.created_at).toLocaleString('es-ES')} · {event.actor_role}</span></div>)}</div></details>;
}

function ReportsPanel({ reports, ads, resolveReport }) {
  const open = reports.filter((report) => report.status === 'open');
  if (!open.length) return null;
  return <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><p className="mb-3 flex items-center gap-2 font-semibold"><Flag className="h-4 w-4"/>Anuncios reportados · {open.length}</p><div className="space-y-2">{open.slice(0, 20).map((report) => { const ad = ads.find((item) => String(item.id) === String(report.ad_id)); return <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-2 text-xs"><span><b>{ad?.title || report.ad_id}</b> · {report.reason} · {report.site || report.placement || 'sin destino'} · {new Date(report.created_at).toLocaleString('es-ES')}</span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => resolveReport(report.id, 'dismissed')}>Descartar</Button><Button size="sm" onClick={() => resolveReport(report.id, 'resolved')}>Resolver</Button></span></div>; })}</div></div>;
}

export default function HouseAdsManager({ groups = [] }) {
  const [ads, setAds] = useState([]), [draft, setDraft] = useState(empty), [error, setError] = useState(''), [advice, setAdvice] = useState(''), [uploading, setUploading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [analyticsAd, setAnalyticsAd] = useState(null);
  const [reports, setReports] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [previewSurface, setPreviewSurface] = useState('top');
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
  const telegramCommunities = useMemo(() => Object.values(groups.reduce((result, group) => {
    const record = group.community || {};
    const communityId = String(record.community_id || record.community?.id || '');
    if (!record.active || !communityId) return result;
    if (!result[communityId]) result[communityId] = { id: communityId, title: record.community?.title || record.community?.name || `Comunidad ${communityId}`, chats: [] };
    result[communityId].chats.push(group);
    return result;
  }, {})), [groups]);
  const request = async (body) => { const response = await apiServerClient.fetch('/house-ads', { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAds(data.ads || []); };
  useEffect(() => { let active = true; const load = () => apiServerClient.fetch('/house-ads').then((r) => r.json()).then((d) => { if (active) setAds(d.ads || []); }).catch(() => { if (active) setError('No se pudo cargar el catálogo'); }); load(); const timer = window.setInterval(load, 30000); return () => { active = false; window.clearInterval(timer); }; }, []);
  const loadReports = async () => { if (!isCreator) return; const response = await apiServerClient.fetch('/house-ads/reports', { headers: { Authorization: `Bearer ${pb.authStore.token}` } }); const data = await response.json(); if (response.ok) setReports(data.reports || []); };
  const loadAudit = async () => { if (!isCreator) return; const response = await apiServerClient.fetch('/house-ads/audit?limit=200', { headers: { Authorization: `Bearer ${pb.authStore.token}` } }); const data = await response.json(); if (response.ok) setAuditEvents(data.events || []); };
  useEffect(() => { loadReports().catch(() => {}); loadAudit().catch(() => {}); }, [isCreator]);
  const save = async () => { try { setError(''); if (!draft.placements?.length || !draft.allowed_sites?.length) throw new Error('Selecciona al menos una ubicación y un destino de publicación.'); await request({ action: 'upsert', ad: { ...draft, placement: draft.placements[0] || 'all' } }); setDraft(empty); setAdvice(''); } catch (e) { setError(e.message); } };
  const field = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleChoice = (key, value) => setDraft((current) => {
    const selected = new Set(current[key] || []);
    if (value === 'all') return { ...current, [key]: ['all'], ...(key === 'placements' ? { placement: 'all' } : {}) };
    selected.delete('all');
    if (selected.has(value)) selected.delete(value); else selected.add(value);
    const next = selected.size ? [...selected] : ['all'];
    return { ...current, [key]: next, ...(key === 'placements' ? { placement: next[0] } : {}) };
  });
  const resolveReport = async (id, status) => { const response = await apiServerClient.fetch(`/house-ads/reports/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (!response.ok) throw new Error('No se pudo actualizar la denuncia'); await loadReports(); };
  const selectCommunity = (id) => {
    const group = groups.find((item) => String(item.id) === id);
    if (!group) return;
    const username = String(group.username || group.public_username || '').replace(/^@/, '');
    const photo = group.photo_url || group.photo || group.image || '';
    setDraft((current) => ({ ...current, title: group.name || current.title, description: current.description || `Únete a ${group.name || 'nuestra comunidad'} en Telegram.`, url: username ? `https://t.me/${username}` : current.url, boost_url: username ? `https://t.me/boost/${username}` : current.boost_url, image: photo || current.image, source_chat_id: String(group.id), cta: group.ctype === 'channel' ? 'Seguir canal' : 'Unirme al grupo', destination_mode: 'single', community_id: '', community_items: [] }));
    setAdvice(username ? `Destino seleccionado: ${group.name}.` : `${group.name} no tiene enlace público detectado; escribe su enlace de invitación.`);
  };
  const selectTelegramCommunity = (community) => {
    const items = community.chats.map((group) => {
      const username = String(group.username || group.public_username || '').replace(/^@/, '');
      return username ? { id: String(group.id), title: group.name || username, url: `https://t.me/${username}`, boost_url: `https://t.me/boost/${username}`, image: group.photo_url || group.photo || group.image || '', type: group.ctype === 'channel' ? 'channel' : 'group' } : null;
    }).filter(Boolean).slice(0, 16);
    if (!items.length) { setAdvice('La comunidad está detectada, pero ninguno de sus chats tiene enlace público.'); return; }
    setDraft((current) => ({ ...current, title: community.title, description: `${items.length} espacios de esta comunidad en Telegram.`, url: items[0].url, image: '', cta: 'Abrir comunidad', destination_mode: 'community', community_id: community.id, community_items: items }));
    setAdvice(`Campaña comunitaria preparada con ${items.length} chats públicos. El espacio se dividirá automáticamente entre ellos.`);
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
    {isCreator && <InsideAdsLinksPanel onApply={(preset) => {
      setDraft((current) => ({ ...current,
        title: current.title || 'Inside Ads',
        description: current.description || (preset.audience === 'owner' ? 'Herramientas publicitarias para propietarios de canales.' : 'Descubre campañas y oportunidades publicitarias en Inside Ads.'),
        cta: current.cta === 'Abrir' ? 'Abrir Inside Ads' : current.cta,
        url: preset.web_url,
        web_url: preset.web_url,
        telegram_url: preset.telegram_url,
        audience: preset.audience,
        inside_ads_preset: preset.id,
        inside_ads_scope: preset.audience,
      }));
      setAdvice(`${preset.label} aplicado al borrador. La campaña seguirá el flujo normal de aprobación y medición.`);
    }}/>} {/* Inside Ads reutiliza el formulario y las métricas de campañas existentes. */}
    <CampaignDeliveryControls draft={draft} field={field} toggleChoice={toggleChoice}/>
    <CampaignStrategyControls draft={draft} field={field}/>
    {isCreator && <CampaignSafetyControls draft={draft} field={field}/>}
    {isCreator && <TelegramTargeting draft={draft} groups={groups} field={field}/>}
    {ads.some((ad) => ad.automatic) && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"><p className="mb-2 text-sm font-semibold">Publicidad de canales del master</p><div className="flex flex-wrap gap-2">{ads.filter((ad) => ad.automatic).map((ad) => <Button key={ad.id} size="sm" variant={ad.enabled ? 'default' : 'outline'} onClick={() => request({ action: 'toggle', id: ad.id, enabled: !ad.enabled })}>{ad.enabled ? `Detener · ${ad.title}` : `Activar · ${ad.title}`}</Button>)}</div></div>}
    {telegramCommunities.length > 0 && <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3"><p className="text-sm font-semibold">Anunciar una comunidad completa</p><p className="mb-3 text-xs text-muted-foreground">Cada campaña divide el hueco de NoticiasWeb3 entre los chats públicos de la comunidad.</p><div className="grid gap-2 md:grid-cols-2">{telegramCommunities.map((community) => <button key={community.id} type="button" onClick={() => selectTelegramCommunity(community)} className={`rounded-lg border bg-background p-3 text-left hover:border-sky-500 ${draft.community_id === community.id ? 'border-sky-500 ring-1 ring-sky-500' : ''}`}><b className="block text-sm">{community.title}</b><span className="text-xs text-muted-foreground">{community.chats.length} chats detectados · {community.chats.filter((group) => group.username || group.public_username).length} anunciables</span></button>)}</div></div>}
    <div className="mb-4 rounded-xl border bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Añadir una comunidad de Telegram</p><p className="text-xs text-muted-foreground">Elige visualmente un canal o grupo administrado. Se agrupan por bot asociado.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar comunidad o bot" value={communitySearch} onChange={(event) => setCommunitySearch(event.target.value)}/></div></div>
      {Object.keys(communitiesByBot).length ? <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{Object.entries(communitiesByBot).map(([bot, sections], botIndex) => <details key={bot} open={botIndex === 0 || Boolean(communitySearch)} className="rounded-lg border bg-background"><summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">@{bot} · {sections.channels.length + sections.groups.length} comunidades</summary><div className="space-y-3 border-t p-3">{[['channels', 'Canales'], ['groups', 'Grupos']].map(([type, label]) => sections[type].length ? <div key={type}><p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{type === 'channels' ? <Radio className="h-3.5 w-3.5"/> : <Users className="h-3.5 w-3.5"/>}{label} · {sections[type].length}</p><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{sections[type].map((group) => { const username = String(group.username || group.public_username || '').replace(/^@/, ''); const selected = draft.title === group.name && (!username || draft.url === `https://t.me/${username}`); return <button key={`${bot}-${group.id}`} type="button" onClick={() => selectCommunity(String(group.id))} className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left transition hover:border-primary hover:bg-primary/5 ${selected ? 'border-primary bg-primary/10' : ''}`}><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-100 text-sky-700">{group.photo_url || group.photo || group.image ? <img src={group.photo_url || group.photo || group.image} alt="" className="h-full w-full object-cover"/> : type === 'channels' ? <Radio className="h-4 w-4"/> : <Users className="h-4 w-4"/>}</div><span className="min-w-0"><strong className="block truncate text-xs">{group.name || group.id}</strong><span className="block truncate text-[11px] text-muted-foreground">{username ? `@${username}` : 'Requiere enlace de invitación'}{Number(group.subscribers || group.members || group.member_count) > 0 ? ` · ${Number(group.subscribers || group.members || group.member_count).toLocaleString('es-ES')} miembros` : ''}</span></span></button>; })}</div></div> : null)}</div></details>)}</div> : <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No hay comunidades que coincidan con la búsqueda.</p>}
    </div>
    <div className="mb-3 grid gap-3 md:grid-cols-2"><label className="block text-xs text-muted-foreground">Selector rápido<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="" onChange={(event) => selectCommunity(event.target.value)}><option value="">Selecciona un grupo o canal</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.ctype === 'channel' ? 'Canal' : 'Grupo'} · {group.name || group.id}</option>)}</select></label><label className="block text-xs text-muted-foreground">Objetivo de clics (0 = ilimitado)<Input type="number" min="0" value={draft.max_clicks} onChange={(e) => field('max_clicks', Number(e.target.value))}/></label></div>
    <div className="mb-3"><label className="text-xs text-muted-foreground">Formato de la campaña<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.display_format || 'auto'} onChange={(event) => field('display_format', event.target.value)}><option value="auto">Automático según espacio y destinos</option><option value="compact">Cuadro pequeño · un chat</option><option value="spotlight">Un chat ocupa todo el espacio</option><option value="cards">Dividir en hasta 4 partes iguales</option><option value="mosaic">Mosaico de hasta 4 chats</option><option value="ticker">Cinta de accesos para Telegram</option></select></label></div>
    <div className="mb-3 rounded-xl border bg-muted/20 p-3"><label className="text-xs font-semibold">Relación con TodoSobreAllTech<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.relationship_type || 'affiliate'} disabled={!isCreator} onChange={(event) => field('relationship_type', event.target.value)}><option value="affiliate">Afiliado · intercambio de visitas</option><option value="verified">Comunidad verificada</option><option value="official">Comunidad oficial TodoSobreAllTech</option></select></label>{draft.relationship_type === 'verified' && <div className="mt-3 space-y-2 text-xs"><p className={draft.telegram_verified ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}>{draft.telegram_verified ? '✓ Distintivo oficial de Telegram confirmado por TDLib' : 'Telegram se comprobará automáticamente al guardar mediante TDLib/MTProto'}</p><label className="flex items-center gap-2"><input type="checkbox" checked={draft.community_verified === true} disabled={!isCreator} onChange={(event) => field('community_verified', event.target.checked)}/>Verificado por TodoSobreAllTech</label>{draft.telegram_verification_status && <p className="text-muted-foreground">Estado Telegram: {draft.telegram_verification_status}{draft.telegram_verification_checked_at ? ` · ${new Date(draft.telegram_verification_checked_at).toLocaleString('es-ES')}` : ''}</p>}</div>}<p className="mt-2 text-xs text-muted-foreground">Solo el creador concede la verificación propia. El distintivo de Telegram nunca se introduce manualmente y una comunidad solo se muestra como verificada cuando ambas comprobaciones son válidas.</p></div>
    <div className="grid gap-5 xl:grid-cols-2"><div><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Título" value={draft.title} onChange={(e) => field('title', e.target.value)}/><Input placeholder="Enlace https://t.me/..." value={draft.url} onChange={(e) => field('url', e.target.value)}/><Input placeholder="Descripción" value={draft.description} onChange={(e) => field('description', e.target.value)}/><div className="space-y-1"><Input placeholder="Imagen opcional https://..." value={draft.image} onChange={(e) => field('image', e.target.value)}/><label className="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs hover:bg-muted"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0])}/>{uploading ? 'Subiendo imagen…' : 'Elegir foto del dispositivo'}</label></div><label className="text-xs text-muted-foreground md:col-span-2">Enlace boost opcional de Telegram<Input className="mt-1" placeholder="https://t.me/boost/canal o https://t.me/boost?c=..." value={draft.boost_url || ''} onChange={(e) => field('boost_url', e.target.value)}/><span className="mt-1 block">Se completa automáticamente al elegir un canal público. Los clics de impulso se miden por separado.</span></label><select className="h-10 rounded-md border bg-background px-3" value={draft.placement} onChange={(e) => field('placement', e.target.value)}>{Object.entries(formats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input placeholder="Texto del botón" maxLength={24} value={draft.cta} onChange={(e) => field('cta', e.target.value)}/><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Fondo <input type="color" value={draft.background} onChange={(e) => field('background', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Texto <input type="color" value={draft.foreground} onChange={(e) => field('foreground', e.target.value)}/></label><label className="flex items-center gap-2 rounded-md border px-3 text-sm">Botón <input type="color" value={draft.accent} onChange={(e) => field('accent', e.target.value)}/></label><Input title="Prioridad 0-100" type="number" min="0" max="100" value={draft.priority} onChange={(e) => field('priority', Number(e.target.value))}/><label className="text-xs text-muted-foreground">Inicio opcional<Input type="datetime-local" value={draft.starts_at} onChange={(e) => field('starts_at', e.target.value)}/></label><label className="text-xs text-muted-foreground">Fin opcional<Input type="datetime-local" value={draft.ends_at} onChange={(e) => field('ends_at', e.target.value)}/></label></div><div className="mt-3 flex gap-2"><Button disabled={!draft.title || !draft.url || uploading} onClick={save}><Plus className="mr-2 h-4 w-4"/>{draft.id ? 'Guardar cambios' : 'Publicar anuncio'}</Button>{draft.id && <Button variant="outline" onClick={() => setDraft(empty)}>Cancelar</Button>}</div></div>
      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa por superficie</p><select className="h-9 rounded-md border bg-background px-2 text-xs" value={previewSurface} onChange={(event) => setPreviewSurface(event.target.value)}>{Object.entries(formats).filter(([key]) => key !== 'all').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className={`grid min-h-64 place-items-center rounded-xl p-4 ${['telegram_channel', 'telegram_react_channel', 'hub'].includes(previewSurface) ? 'mx-auto max-w-md bg-slate-950' : 'bg-muted/40'}`}><AdPreview ad={{ ...preview, placement: previewSurface }}/></div><p className="mt-2 text-xs text-muted-foreground">Simulación visual; la entrega real respeta sitios, chats, horario, contenido, audiencia y límites.</p></div></div>
    <div className="mt-5 grid gap-2 md:grid-cols-2">{ads.map((ad) => { const impressions = ad.impressions || 0, ctr = impressions ? ((ad.clicks || 0) * 100 / impressions).toFixed(2) : '0.00', tracking = `https://todosobreall.tech/hcgi/api/community-cards/${ad.id}/click?placement=external`; return <div key={ad.id} className="rounded-lg border p-3 text-sm"><AdPreview ad={{ ...empty, ...ad }}/><p className="mt-2 text-muted-foreground"><b>{campaignStatus(ad)}</b> · {formats[ad.placement] || ad.placement} · {impressions} impresiones · {ad.clicks || 0} clics · CTR {ctr}%{ad.max_clicks > 0 && ` · objetivo ${ad.clicks || 0}/${ad.max_clicks}`}</p>{placementSummary(ad) && <p className="mt-1 text-xs text-muted-foreground">Clics por ubicación: {placementSummary(ad)}</p>}{countrySummary(ad.clicks_by_country) && <p className="mt-1 text-xs text-muted-foreground"><b>País de los clics:</b> {countrySummary(ad.clicks_by_country)}</p>}{countrySummary(ad.impressions_by_country) && <p className="mt-1 text-xs text-muted-foreground">País de las impresiones: {countrySummary(ad.impressions_by_country)}</p>}<div className="mt-2 flex flex-wrap gap-2">{isCreator && ad.approval_status === 'pending' && <><Button size="sm" onClick={() => request({ action: 'approve', id: ad.id })}><Check className="mr-1 h-4 w-4"/>Aprobar</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'reject', id: ad.id })}><X className="mr-1 h-4 w-4"/>Rechazar</Button></>}<Button size="sm" variant="outline" onClick={() => request({ action: 'toggle', id: ad.id, enabled: !ad.enabled })}>{ad.enabled ? 'Pausar' : 'Activar'}</Button><Button size="sm" variant="outline" onClick={() => { setDraft({ ...empty, ...ad }); document.getElementById('moon-house-ads')?.scrollIntoView({ behavior: 'smooth' }); }}><Pencil className="mr-1 h-4 w-4"/>Editar</Button><Button size="sm" variant="outline" onClick={() => request({ action: 'clone', id: ad.id })}><CopyPlus className="mr-1 h-4 w-4"/>Duplicar</Button><Button size="sm" variant="outline" onClick={() => setAnalyticsAd(ad)}>Estadísticas</Button><Button size="sm" variant="outline" onClick={() => request({ action: 'reset_metrics', id: ad.id })}><RotateCcw className="mr-1 h-4 w-4"/>Reiniciar métricas</Button><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(tracking)}><Copy className="mr-1 h-4 w-4"/>Enlace</Button><Button size="sm" variant="destructive" onClick={() => request({ action: 'delete', id: ad.id })}><Trash2 className="h-4 w-4"/></Button></div></div>; })}</div>
    {isCreator && <ReportsPanel reports={reports} ads={ads} resolveReport={resolveReport}/>}
    {isCreator && <CampaignAuditPanel events={auditEvents}/>}
    <CampaignGovernancePanel ads={ads}/>
    <ContentAnalyticsDialog open={!!analyticsAd} onOpenChange={(open) => !open && setAnalyticsAd(null)} kind="community_ad" targetId={analyticsAd?.id || ''} title={analyticsAd?.title || ''}/>
  </section>;
}
