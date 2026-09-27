import React, { useEffect, useState } from 'react';
import api from '@/lib/apiServerClient';
import { Button } from '@/components/ui/button';

export default function MoonbotBotExplorer({ initialUsername = '', performance = [] }) {
  const [bots, setBots] = useState([]);
  const [botId, setBotId] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState(null);
  const [chat, setChat] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.fetch('/moonbot-admin/bot-conversations', { signal: controller.signal })
      .then(async response => {
        const data = await api.readJson(response);
        if (!response.ok || !data.ok) throw new Error(data.error || 'No se pueden consultar los bots');
        if (controller.signal.aborted) return;
        setBots(data.bots || []);
        setBotId(String(data.bots?.find(bot => bot.username === initialUsername)?.id || data.bots?.[0]?.id || ''));
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [initialUsername]);
  useEffect(() => {
    setListing(null); setChat(null); setDetail(null); setError('');
    if (!botId) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ bot_id: botId, q: query, type: kind, page: String(page) });
        const response = await api.fetch(`/moonbot-admin/bot-conversations?${params}`, { signal: controller.signal });
        const data = await api.readJson(response);
        if (!response.ok || !data.ok) throw new Error(data.error || 'No se pueden consultar los chats');
        if (!controller.signal.aborted) setListing(data);
      } catch (reason) { if (!controller.signal.aborted) setError(reason.message); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [botId, query, kind, page, refresh]);
  useEffect(() => {
    setDetail(null); setError('');
    if (!chat) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ bot_id: botId, chat_id: chat.id });
    api.fetch(`/moonbot-admin/bot-conversations?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = await api.readJson(response);
        if (!response.ok || !data.ok) throw new Error(data.error || 'No se puede abrir este chat');
        if (!controller.signal.aborted) setDetail(data);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [botId, chat]);
  const bot = bots.find(item => item.id === botId);
  const metrics = performance.find(item => item.username === bot?.username);
  return <section className="mt-6 space-y-4 rounded-xl border p-4" aria-label="Información y chats por bot">
    <h3 className="text-lg font-semibold">Información y chats por bot</h3>
    <p className="text-sm text-muted-foreground">Consulta master de solo lectura. Muestra los chats conocidos por este Moonbot y el historial que conserva, no todas las conversaciones de Telegram.</p>
    <label className="block text-sm">Seleccionar bot<select className="ml-3 rounded border bg-background p-2" value={botId} onChange={event => { setBotId(event.target.value); setPage(1); }}>
      {!bots.length && <option value="">Sin bots disponibles</option>}
      {bots.map(item => <option key={item.id} value={item.id}>@{item.username}</option>)}
    </select></label>
    {bot && <div className="rounded-lg bg-muted/30 p-3 text-sm"><b>@{bot.username}</b> · ID {bot.id} · {bot.chats} chats conocidos
      <p>Estado: {metrics?.status || 'No medido'} · Latencia: {metrics?.latency_ms == null ? 'Sin medición' : `${metrics.latency_ms} ms`} · Errores API: {metrics?.api_errors ?? 'Sin medición'}</p></div>}
    <div className="flex flex-wrap gap-2">
      <input aria-label="Buscar chat del bot" className="rounded border bg-background p-2" placeholder="Nombre o ID del chat" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
      <select aria-label="Tipo de conversación" className="rounded border bg-background p-2" value={kind} onChange={event => { setKind(event.target.value); setPage(1); }}><option value="all">Todos los chats</option><option value="private">Usuarios · chats privados</option><option value="community">Grupos y canales</option></select>
      <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>Actualizar chats</Button>
    </div>
    {error && <p role="alert" className="text-amber-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2"><p className="text-sm">{listing ? `${listing.total} conversaciones` : botId ? 'Cargando chats…' : 'Selecciona un bot'}</p>
        {listing?.chats.map(item => <button key={item.id} className={`block w-full rounded border p-3 text-left ${chat?.id === item.id ? 'border-cyan-500 bg-cyan-500/10' : ''}`} onClick={() => setChat(item)}><b className="block break-words">{item.name}</b><small>{item.type === 'private' ? 'Chat privado' : 'Grupo / canal'} · {item.id}</small></button>)}
        {listing && <div className="flex items-center gap-2"><Button variant="outline" disabled={listing.page <= 1} onClick={() => setPage(listing.page - 1)}>Anterior</Button><span>{listing.page}/{listing.pages}</span><Button variant="outline" disabled={listing.page >= listing.pages} onClick={() => setPage(listing.page + 1)}>Siguiente</Button></div>}
      </div>
      <div className="rounded-lg border p-4" aria-label="Historial del chat seleccionado">
        {chat ? <><h4 className="font-semibold">{chat.name}</h4><p className="text-sm">{chat.id}</p>
          {detail && <p className="my-3 rounded border border-amber-500/30 p-3 text-sm">{detail.notice}</p>}
          {!detail && !error && <p>Cargando historial…</p>}
          {detail?.history.map((message, index) => <article key={index} className="my-2 rounded border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{message.sender || 'Usuario'} · {message.time}</p><p className="whitespace-pre-wrap break-words">{message.text || 'Mensaje sin texto registrado'}</p></article>)}
          {detail && !detail.history.length && <p>No hay mensajes conservados para este chat.</p>}
        </> : <p>Selecciona una conversación para consultar su historial.</p>}
      </div>
    </div>
  </section>;
}
