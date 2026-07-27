import React, { useEffect, useRef, useState } from 'react';
import { Ban, Download, MessageCircle, Paperclip, RefreshCw, Search, Send, ShieldAlert, Star, Undo2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const call = async (path, options = {}) => {
  const response = await apiServerClient.fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const SecureMedia = ({ groupId, media }) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!media?.file_id) return null;
  const load = async () => {
    setBusy(true); setFailed(false);
    try {
      const response = await apiServerClient.fetch(`/moonbot-admin/groups/${groupId}/media/${encodeURIComponent(media.file_id)}`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      if (!response.ok) throw new Error('media');
      setUrl(URL.createObjectURL(await response.blob()));
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  if (!url) return <Button size="sm" variant="outline" className="mb-2" disabled={busy} onClick={load}><Paperclip className="mr-1 h-3 w-3"/>{busy ? 'Cargando…' : failed ? 'Reintentar archivo' : `Abrir ${media.type || 'archivo'}`}</Button>;
  if (['photo', 'sticker'].includes(media.type)) return <img src={url} alt={media.name || 'Imagen de Telegram'} className="mb-2 max-h-72 max-w-full rounded-lg object-contain"/>;
  if (media.type === 'video') return <video src={url} controls className="mb-2 max-h-72 max-w-full rounded-lg"/>;
  if (['audio', 'voice'].includes(media.type)) return <audio src={url} controls className="mb-2 max-w-full"/>;
  return <a href={url} download={media.name || 'telegram-file'} className="mb-2 inline-flex items-center rounded-md border px-3 py-2 text-xs"><Download className="mr-1 h-3 w-3"/>{media.name || 'Descargar archivo'}</a>;
};

const MoonbotTelegramChat = ({ bots = [] }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [groups, setGroups] = useState([]);
  const [botFilter, setBotFilter] = useState('');
  const [senderBotId, setSenderBotId] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState('');
  const [format, setFormat] = useState('normal');
  const [mediaType, setMediaType] = useState('photo');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isRtl, setIsRtl] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [receiverUserId, setReceiverUserId] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [silent, setSilent] = useState(false);
  const [protectContent, setProtectContent] = useState(false);
  const [actionMessageId, setActionMessageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadGroups = async () => {
    setLoading(true); setError('');
    try {
      const data = await call(`/moonbot-admin/groups?q=${encodeURIComponent(query)}&bot_id=${encodeURIComponent(botFilter)}&type=all&page=${page}&per_page=40`);
      setGroups(data.groups || []); setPages(data.total_pages || 1); setPage(data.page || 1);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  };
  const loadHistory = async (group = selected, quiet = false) => {
    if (!group) return;
    if (!quiet) setLoading(true);
    try { setDetail(await call(`/moonbot-admin/groups/${group.id}`)); setError(''); }
    catch (cause) { if (!quiet) setError(cause.message); }
    finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(loadGroups, 250); return () => window.clearTimeout(timer); }, [botFilter, page, query]);
  useEffect(() => {
    if (!selected) return undefined;
    loadHistory(selected);
    const timer = window.setInterval(() => loadHistory(selected, true), 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [detail?.history?.length]);

  const send = async () => {
    const message = text.trim();
    if (!selected || !message || message.length > (format === 'normal' ? 4096 : 32768)) return;
    if (ephemeral && (format !== 'normal' || !/^\d+$/.test(receiverUserId.trim()))) {
      setError(format !== 'normal' ? 'Los mensajes efímeros usan formato normal.' : 'Indica el ID numérico del receptor.'); return;
    }
    setSending(true); setError('');
    try {
      await call(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({
        action: ephemeral ? 'send_ephemeral_message' : format === 'normal' ? 'send_message' : 'send_rich_message', text: message,
        markdown: true, format, bot_id: senderBotId, is_rtl: isRtl,
        media_type: mediaType, media_url: mediaUrl.trim(), media_id: 'web_media', receiver_user_id: receiverUserId.trim(),
        reply_to_message_id: replyTo?.message_id, disable_notification: silent, protect_content: protectContent,
      }) });
      setText(''); setMediaUrl(''); setReplyTo(null); await loadHistory(selected, true);
    } catch (cause) { setError(cause.message); }
    finally { setSending(false); }
  };
  const moderate = async (message, action, extra = {}) => {
    if (!selected || !/^\d+$/.test(String(message.uid || ''))) return;
    let reason = 'Acción desde el chat master de TodoSobreAllTech';
    if (['ban_local', 'warn', 'quarantine'].includes(action)) {
      const supplied = window.prompt('Motivo de la acción', reason);
      if (supplied === null) return;
      reason = supplied.trim() || reason;
    }
    if (action === 'ban_local' && !window.confirm(`¿Banear a ${message.sender || message.uid} en este grupo?`)) return;
    setActionBusy(`${message.uid}-${action}`); setError(''); setNotice('');
    try {
      await call(`/moonbot-admin/users/${message.uid}`, { method: 'POST', body: JSON.stringify({ action, group_id: selected.id, reason, ...extra }) });
      setNotice(`Acción «${action}» aplicada a ${message.sender || message.uid}.`);
      await loadHistory(selected, true);
    } catch (cause) { setError(cause.message); }
    finally { setActionBusy(''); }
  };
  const messageAction = async (message, operation) => {
    if (!selected || (!message.message_id && operation !== 'unpin_all')) return;
    if (operation === 'reply') { setReplyTo(message); return; }
    if (operation === 'delete' && !window.confirm('¿Borrar este mensaje de Telegram?')) return;
    const extra = {};
    if (operation === 'edit') { const value = window.prompt('Nuevo texto', message.text || ''); if (value === null) return; extra.text = value; }
    if (['copy', 'forward'].includes(operation)) { const value = window.prompt('ID del grupo o canal de destino', ''); if (!value) return; extra.target_chat_id = value; }
    setActionBusy(`${message.message_id}-${operation}`); setError('');
    try {
      await call(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({
        action: 'chat_message_action', operation, message_id: message.message_id,
        reaction: '👍', bot_id: senderBotId, ...extra,
      }) });
      await loadHistory(selected, true);
    } catch (cause) { setError(cause.message); }
    finally { setActionBusy(''); }
  };
  const sendPoll = async () => {
    if (!selected) return;
    const question = window.prompt('Pregunta de la encuesta', ''); if (!question) return;
    const raw = window.prompt('Opciones separadas por líneas', 'Sí\nNo'); if (!raw) return;
    const options = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).slice(0, 12);
    if (!options.length) return;
    setActionBusy('poll');
    try { await call(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({ action: 'send_poll', question, options, is_anonymous: true, bot_id: senderBotId }) }); setNotice('Encuesta enviada.'); }
    catch (cause) { setError(cause.message); }
    finally { setActionBusy(''); }
  };

  const selectGroup = (group) => { setSelected(group); setSenderBotId(String(group.bots?.find((bot) => String(bot.id) === botFilter)?.id || group.bots?.[0]?.id || '')); };
  const applyRichPreset = (preset) => {
    const presets = {
      details: '<details open><summary>Resumen</summary><p>Contenido ampliado</p></details>',
      list: '<ul><li>Primera tarea</li><li>Segunda tarea</li></ul>',
      quote: '<aside>Mensaje destacado<cite>Moonbot</cite></aside>',
      math: '<tg-math-block>E = mc^2</tg-math-block>',
    };
    if (presets[preset]) { setFormat('html'); setText(presets[preset]); }
  };

  return <Card className="mt-8 border-cyan-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-cyan-600" />Chat de Telegram</CardTitle><CardDescription>Lee todos tus grupos y canales y elige cuál de tus {bots.length} bots envía cada mensaje.</CardDescription><div className="flex flex-wrap gap-2 pt-2">{bots.map((bot) => <Badge key={bot.id || bot.username} variant={botFilter === String(bot.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => { setBotFilter(botFilter === String(bot.id) ? '' : String(bot.id)); setPage(1); setSelected(null); }}>{bot.name || `@${bot.username}`} · {bot.groups || 0} grupos</Badge>)}</div></CardHeader><CardContent>
    {error && <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</div>}{notice && <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{notice}</div>}
    {selected && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-3"><Input className="max-w-48" inputMode="numeric" value={actionMessageId} onChange={(event) => setActionMessageId(event.target.value)} placeholder="ID del mensaje"/><Button size="sm" variant="outline" onClick={() => setReplyTo(/^\d+$/.test(actionMessageId) ? { message_id: Number(actionMessageId), sender: `#${actionMessageId}` } : null)}>Responder</Button>{['edit', 'react', 'clear_reactions', 'copy', 'forward', 'pin', 'unpin', 'delete'].map((operation) => <Button key={operation} size="sm" variant={operation === 'delete' ? 'destructive' : 'ghost'} disabled={!/^\d+$/.test(actionMessageId) || !!actionBusy} onClick={() => messageAction({ message_id: Number(actionMessageId) }, operation)}>{({ edit: 'Editar', react: '👍', clear_reactions: 'Limpiar reacciones', copy: 'Copiar', forward: 'Reenviar', pin: 'Fijar', unpin: 'Desfijar', delete: 'Borrar' })[operation]}</Button>)}<Button size="sm" variant="ghost" disabled={!!actionBusy} onClick={() => messageAction({}, 'unpin_all')}>Desfijar todo</Button><Button size="sm" variant="outline" disabled={!!actionBusy} onClick={sendPoll}>Encuesta</Button><label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={silent} onChange={(event) => setSilent(event.target.checked)}/>Sin sonido</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={protectContent} onChange={(event) => setProtectContent(event.target.checked)}/>Impedir reenvío</label>{replyTo && <Badge variant="secondary">Respondiendo a #{replyTo.message_id} <button className="ml-2" onClick={() => setReplyTo(null)}>×</button></Badge>}</div>}
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border lg:grid-cols-[320px_1fr]">
      <aside className="border-b bg-muted/10 lg:border-b-0 lg:border-r"><div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar grupo, canal o bot"/></div></div><div className={`max-h-[500px] space-y-1 overflow-auto p-2 ${loading ? 'opacity-60' : ''}`}>{groups.map((group) => <button key={group.id} onClick={() => selectGroup(group)} className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === group.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent hover:bg-muted/50'}`}><div className="flex justify-between gap-2"><b className="truncate text-sm">{group.name}</b><Badge variant="outline">{group.ctype === 'channel' ? 'Canal' : 'Grupo'}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{group.id}</p><div className="mt-2 flex flex-wrap gap-1">{group.bots?.map((bot) => <Badge key={bot.id} variant="secondary">@{bot.username}</Badge>)}</div></button>)}</div><div className="flex items-center justify-between border-t p-2"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-xs">{page}/{pages}</span><Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div></aside>
      <section className="flex min-h-[620px] flex-col">{selected ? <><header className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h3 className="font-semibold">{selected.name}</h3><p className="text-xs text-muted-foreground">{selected.bots?.length || 0} bots tuyos disponibles en esta comunidad</p>{detail?.community?.active && <Badge className="mt-1" variant="secondary">Comunidad Telegram 10.2</Badge>}</div><div className="flex gap-2"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={senderBotId} onChange={(event) => setSenderBotId(event.target.value)}>{selected.bots?.map((bot) => <option key={bot.id} value={bot.id}>Enviar como @{bot.username}</option>)}</select><Button size="sm" variant="outline" onClick={() => loadHistory()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Actualizar</Button></div></header><div className="flex-1 space-y-3 overflow-auto bg-muted/10 p-4">{detail?.history?.map((message, index) => { const own = message.sender === 'Bot'; const manageable = !own && /^\d+$/.test(String(message.uid || '')); return <div key={`${message.time}-${index}`} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${own ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}><div className="mb-1 flex gap-3 text-xs opacity-70"><b>{message.sender || 'Usuario'}</b><span>{message.time}</span></div>{message.media && <SecureMedia groupId={selected.id} media={message.media}/>}<p className="whitespace-pre-wrap break-words">{message.text || (message.has_media ? 'Contenido multimedia' : '')}</p></div>{manageable && <div className="mt-1 flex max-w-[90%] flex-wrap gap-1"><Button size="sm" variant="outline" disabled={!!actionBusy} onClick={() => moderate(message, 'mute', { minutes: 30 })}><VolumeX className="mr-1 h-3 w-3"/>Mute 30m</Button><Button size="sm" variant="destructive" disabled={!!actionBusy} onClick={() => moderate(message, 'ban_local')}><Ban className="mr-1 h-3 w-3"/>Ban</Button><Button size="sm" variant="outline" disabled={!!actionBusy} onClick={() => moderate(message, 'warn')}><ShieldAlert className="mr-1 h-3 w-3"/>Advertir</Button><Button size="sm" variant="outline" disabled={!!actionBusy} onClick={() => moderate(message, 'karma', { value: 5 })}><Star className="mr-1 h-3 w-3"/>Karma +5</Button><Button size="sm" variant="ghost" disabled={!!actionBusy} onClick={() => moderate(message, 'quarantine')}>Cuarentena</Button><Button size="sm" variant="ghost" disabled={!!actionBusy} onClick={() => moderate(message, 'unmute')}><Undo2 className="mr-1 h-3 w-3"/>Quitar mute</Button><Button size="sm" variant="ghost" disabled={!!actionBusy} onClick={() => moderate(message, 'unban_local')}>Quitar ban</Button><Button size="sm" variant="ghost" disabled={!!actionBusy} onClick={() => moderate(message, 'unwarn')}>Limpiar avisos</Button></div>}</div>; })}{!detail?.history?.length && <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay mensajes registrados.</div>}<div ref={bottomRef}/></div><footer className="border-t p-3"><div className="mb-2 flex flex-wrap gap-1"><select className="h-8 rounded-md border bg-background px-2 text-xs" value={format} onChange={(event) => setFormat(event.target.value)}><option value="normal">Mensaje normal</option><option value="markdown">Rich Markdown 10.2</option><option value="html">Rich HTML 10.2</option></select><select className="h-8 rounded-md border bg-background px-2 text-xs" defaultValue="" onChange={(event) => applyRichPreset(event.target.value)}><option value="">Plantilla 10.2…</option><option value="details">Detalles</option><option value="list">Lista</option><option value="quote">Cita</option><option value="math">Fórmula</option></select><Button size="sm" variant="ghost" onClick={() => setText((value) => `${value}**texto**`)}>Negrita</Button><label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={isRtl} onChange={(event) => setIsRtl(event.target.checked)}/>RTL</label><span className="text-xs text-muted-foreground">{text.length}/{format === 'normal' ? 4096 : 32768}</span></div><div className="mb-2 flex flex-wrap items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={ephemeral} onChange={(event) => setEphemeral(event.target.checked)}/>Solo un usuario (efímero)</label>{ephemeral && <Input className="max-w-64" inputMode="numeric" value={receiverUserId} onChange={(event) => setReceiverUserId(event.target.value)} placeholder="ID numérico del receptor"/>}</div>{format !== 'normal' && <div className="mb-2 flex gap-2"><select className="h-9 rounded-md border bg-background px-2 text-xs" value={mediaType} onChange={(event) => setMediaType(event.target.value)}><option value="photo">Foto</option><option value="video">Vídeo</option><option value="audio">Audio</option><option value="voice_note">Nota de voz</option><option value="animation">Animación</option></select><Input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="URL o file_id multimedia opcional"/></div>}<div className="flex gap-2"><textarea className="min-h-20 flex-1 resize-none rounded-md border bg-background p-3 text-sm" value={text} maxLength={format === 'normal' ? 4096 : 32768} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={format === 'normal' ? 'Escribe un mensaje…' : 'Escribe contenido Rich 10.2…'}/><Button className="self-end" disabled={sending || !text.trim() || !senderBotId} onClick={send}><Send className="mr-2 h-4 w-4"/>{sending ? 'Enviando' : 'Enviar'}</Button></div></footer></> : <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">Selecciona una comunidad para abrir su conversación.</div>}</section>
    </div>
  </CardContent></Card>;
};

export default MoonbotTelegramChat;
