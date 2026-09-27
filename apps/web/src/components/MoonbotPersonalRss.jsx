import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import MoonbotRssReader from './MoonbotRssReader.jsx';

async function request(path, body) {
  const response = await apiServerClient.fetch(`/moonbot-rss/${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await apiServerClient.readJson(response);
  if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo cargar RSS');
  return data;
}

export default function MoonbotPersonalRss({ master = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('all');
  const [target, setTarget] = useState('me');
  const [channels, setChannels] = useState([]);
  const [catalog, setCatalog] = useState([]);
  useEffect(() => { if (master) return; let active = true; request('catalog').then((value) => { if (active) setCatalog(value.catalog || []); }).catch(() => {}); return () => { active = false; }; }, [master]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => { if (master) return; let active = true; request('channels').then((value) => { if (active) setChannels(value.channels || []); }).catch(() => {}); return () => { active = false; }; }, [master]);
  const load = async (body) => {
    setBusy(true); setError('');
    try { setData(await request(master ? 'activity' : target, body)); if (body?.action === 'add') { setUrl(''); setTitle(''); } }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { let active = true; setData(null); setError(''); setBusy(true); request(master ? 'activity' : target).then((value) => { if (active) setData(value); }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [master, target]);
  return <section id={master ? 'rss-master' : 'rss-personal'} className="mt-6 rounded-xl border bg-card p-5 scroll-mt-24">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{master ? 'Master · Actividad RSS' : 'RSS · Suscripciones y catálogo'} <span className="text-xs text-muted-foreground">Beta</span></h2><Button variant="outline" disabled={busy} onClick={() => load()}>Actualizar</Button></div>
    <p className="my-3 text-sm text-muted-foreground">{master ? 'Ranking por publicaciones entregadas por Moonbot. No mide aperturas ni lecturas.' : 'Recibe novedades en tu chat privado de Telegram. Las fuentes se añaden pausadas: actívalas cuando quieras. La primera comprobación evita enviar noticias antiguas.'}</p>
    {!master && <label className="my-3 block text-sm">Enviar novedades a <select disabled={busy} className="ml-2 rounded border bg-background p-2" value={target} onChange={(e) => setTarget(e.target.value)}><option value="me">Mi chat privado</option>{channels.map((channel) => <option key={channel.id} value={`channels/${channel.id}`}>{channel.name}</option>)}</select><span className="block text-xs text-muted-foreground">Los canales requieren permisos de publicación del administrador y del bot.</span></label>}
    {error && <p role="alert" className="my-3 rounded-lg border border-amber-400 p-3">{error}</p>}
    {busy && <p role="status" className="text-sm">Cargando…</p>}
    {!master && data?.quota && <div className="my-3 rounded-lg border p-3 text-sm"><p>Cupo usado hoy: {data.quota.used} / {data.quota.limit} noticias · reinicio diario UTC.</p><p>{data.quota.membership === 'member' ? 'Pertenencia al canal verificada: puedes superar el cupo.' : data.quota.membership === 'unavailable' ? 'No se pudo verificar la pertenencia al canal.' : 'Para superar 50 noticias diarias, únete a @TodoSobreAllTech.'}</p>{data.quota.blocked && <p>Entregas pausadas por el límite diario.</p>}{data.quota.delivery_uncertain && <p>Entrega pendiente de revisión para evitar duplicados.</p>}<a href="https://t.me/TodoSobreAllTech" target="_blank" rel="noreferrer" className="underline">Abrir canal</a> <Button disabled={busy} variant="outline" onClick={() => load({ action: 'verify_membership' })}>Comprobar suscripción</Button></div>}
    {!master && <MoonbotRssReader request={request} channels={channels} sources={[...catalog, ...(data?.feeds || []).map((feed) => ({ ...feed, id: target === 'me' ? `own:${feed.id}` : `channel:${target.split('/')[1]}:${feed.id}`, title: `Suscripción · ${feed.title || feed.url}` }))]} />}
    {!master && catalog.length > 0 && <div className="my-4"><h3 className="font-semibold">Explorar RSS por categoría</h3><div className="my-2 flex flex-wrap gap-2"><Input className="max-w-sm" aria-label="Buscar RSS" placeholder="Buscar fuente o tema" value={search} onChange={(e) => setSearch(e.target.value)} /><select aria-label="Categoría RSS" className="rounded border bg-background p-2" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Todas las categorías</option>{[...new Set(catalog.map((item) => item.category))].sort().map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      {[...new Set(catalog.map((item) => item.category))].sort().filter((item) => category === 'all' || item === category).map((group) => { const items = catalog.filter((item) => item.category === group && `${item.title} ${item.category}`.toLowerCase().includes(search.toLowerCase())); return items.length ? <div key={group} className="my-3"><h4 className="text-sm font-semibold">{group}</h4><div className="grid gap-2 sm:grid-cols-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-3"><div><b className="text-sm">{item.title}</b><p className="text-xs text-muted-foreground">{item.language?.toUpperCase()} · RSS</p></div><Button disabled={busy || !data || (data?.feeds || []).some((feed) => feed.url === item.url)} variant="outline" onClick={() => load({ action: 'add', url: item.url, title: item.title })}>{(data?.feeds || []).some((feed) => feed.url === item.url) ? 'Añadido' : 'Suscribirme'}</Button></div>)}</div></div> : null; })}
    </div>}
    {!master && <><form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); load({ action: 'add', url: url.trim(), title: title.trim() }); }}>
      <Input aria-label="URL RSS" className="flex-1 min-w-48" type="url" placeholder="https://ejemplo.com/feed.xml" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} required />
      <Input aria-label="Nombre de la fuente" className="flex-1 min-w-40" placeholder="Nombre de la fuente" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      <Button disabled={busy || !data || !url.trim()} type="submit">Añadir RSS</Button></form>
      {data && <p className="my-2 text-xs text-muted-foreground">{data.feeds?.length || 0} / {data.limit || 20} fuentes · Suscripciones del destino seleccionado.</p>}
      <div className="mt-3 space-y-2">{data?.feeds?.map((feed) => <div className="flex flex-wrap justify-between gap-3 rounded-lg border p-3" key={feed.id}><div className="min-w-0 flex-1"><b>{feed.title || 'Fuente RSS'}</b><p className="break-all text-xs text-muted-foreground">{feed.url}</p><p className="text-sm">{feed.enabled ? 'Activa' : 'Pausada'} · {feed.published_count || 0} entregas · {feed.error_count || 0} errores</p>{feed.last_error && <p className="text-xs text-amber-600">La última comprobación falló.</p>}</div><div className="flex gap-2"><Button disabled={busy} variant="outline" onClick={() => load({ action: 'toggle', feed_id: feed.id, enabled: !feed.enabled })}>{feed.enabled ? 'Pausar' : 'Activar'}</Button><Button disabled={busy} variant="outline" onClick={() => window.confirm('¿Eliminar esta suscripción RSS?') && load({ action: 'delete', feed_id: feed.id })}>Eliminar</Button></div></div>)}</div>
      {data && !data.feeds?.length && <p className="mt-3 text-sm">Todavía no tienes suscripciones RSS personales.</p>}</>}
    {master && data && <><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[['Suscripciones', 'subscriptions'], ['Activas', 'enabled'], ['Entregas', 'published'], ['Errores', 'errors']].map(([label, key]) => <div key={key} className="rounded-lg border p-3"><b className="text-xl">{data.totals[key]}</b><p className="text-xs">{label}</p></div>)}</div><p className="my-3 text-xs text-muted-foreground">{data.period} · Hasta 30 resultados por ranking.</p>
      <h3 className="font-semibold">Fuentes más activas</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Fuente</th><th>Suscripciones</th><th>Entregas</th><th>Errores</th></tr></thead><tbody>{data.sources.map((row) => <tr key={row.id} className="border-t"><td className="py-2">{row.title}</td><td>{row.subscriptions}</td><td>{row.published}</td><td>{row.errors}</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><h3 className="font-semibold">Destinatarios más activos</h3><select aria-label="Tipo de destinatario" className="rounded border bg-background p-2" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Todos</option><option value="user">Usuarios</option><option value="community">Grupos y canales</option></select></div>
      {data.recipients.filter((row) => kind === 'all' || row.kind === kind).map((row) => <p key={row.id} className="border-b py-2 text-sm">{row.kind === 'user' ? 'Usuario' : 'Comunidad'} {row.id} · {row.subscriptions} fuentes · <b>{row.published} entregas</b> · {row.errors} errores</p>)}
      {!data.sources.length && <p className="mt-3">No hay suscripciones registradas. Las estadísticas aparecerán con la actividad real.</p>}</>}
  </section>;
}
