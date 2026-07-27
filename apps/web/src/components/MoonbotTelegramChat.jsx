import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Search, Send } from 'lucide-react';
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

const MoonbotTelegramChat = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadGroups = async () => {
    setLoading(true); setError('');
    try {
      const data = await call(`/moonbot-admin/groups?q=${encodeURIComponent(query)}&type=all&page=${page}&per_page=40`);
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
  useEffect(() => { const timer = window.setTimeout(loadGroups, 250); return () => window.clearTimeout(timer); }, [page, query]);
  useEffect(() => {
    if (!selected) return undefined;
    loadHistory(selected);
    const timer = window.setInterval(() => loadHistory(selected, true), 5000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [detail?.history?.length]);

  const send = async () => {
    const message = text.trim();
    if (!selected || !message || message.length > 4096) return;
    setSending(true); setError('');
    try {
      await call(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({ action: 'send_message', text: message, markdown: true }) });
      setText(''); await loadHistory(selected, true);
    } catch (cause) { setError(cause.message); }
    finally { setSending(false); }
  };

  return <Card className="mt-8 border-cyan-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-cyan-600" />Chat de Telegram</CardTitle><CardDescription>Lee el historial registrado y escribe como el bot asociado a cada comunidad.</CardDescription></CardHeader><CardContent>
    {error && <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</div>}
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border lg:grid-cols-[320px_1fr]">
      <aside className="border-b bg-muted/10 lg:border-b-0 lg:border-r"><div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar grupo, canal o bot"/></div></div><div className={`max-h-[500px] space-y-1 overflow-auto p-2 ${loading ? 'opacity-60' : ''}`}>{groups.map((group) => <button key={group.id} onClick={() => setSelected(group)} className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === group.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent hover:bg-muted/50'}`}><div className="flex justify-between gap-2"><b className="truncate text-sm">{group.name}</b><Badge variant="outline">{group.ctype === 'channel' ? 'Canal' : 'Grupo'}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{group.id} · @{group.bot_username || group.bots?.[0]?.username || 'Moonbot'}</p></button>)}</div><div className="flex items-center justify-between border-t p-2"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-xs">{page}/{pages}</span><Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div></aside>
      <section className="flex min-h-[620px] flex-col">{selected ? <><header className="flex items-center justify-between border-b p-4"><div><h3 className="font-semibold">{selected.name}</h3><p className="text-xs text-muted-foreground">Escribiendo mediante @{selected.bot_username || selected.bots?.[0]?.username || 'Moonbot'}</p></div><Button size="sm" variant="outline" onClick={() => loadHistory()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Actualizar</Button></header><div className="flex-1 space-y-3 overflow-auto bg-muted/10 p-4">{detail?.history?.map((message, index) => { const own = message.sender === 'Bot'; return <div key={`${message.time}-${index}`} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${own ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}><div className="mb-1 flex gap-3 text-xs opacity-70"><b>{message.sender || 'Usuario'}</b><span>{message.time}</span></div><p className="whitespace-pre-wrap break-words">{message.text || (message.has_media ? 'Contenido multimedia' : '')}</p></div></div>; })}{!detail?.history?.length && <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay mensajes registrados.</div>}<div ref={bottomRef}/></div><footer className="border-t p-3"><div className="mb-2 flex gap-1"><Button size="sm" variant="ghost" onClick={() => setText((value) => `${value}**texto**`)}>Negrita</Button><Button size="sm" variant="ghost" onClick={() => setText((value) => `${value}_texto_`)}>Cursiva</Button><Button size="sm" variant="ghost" onClick={() => setText((value) => `${value}\`código\``)}>Código</Button><span className="ml-auto text-xs text-muted-foreground">{text.length}/4096</span></div><div className="flex gap-2"><textarea className="min-h-20 flex-1 resize-none rounded-md border bg-background p-3 text-sm" value={text} maxLength={4096} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Escribe un mensaje Markdown…"/><Button className="self-end" disabled={sending || !text.trim()} onClick={send}><Send className="mr-2 h-4 w-4"/>{sending ? 'Enviando' : 'Enviar'}</Button></div></footer></> : <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">Selecciona una comunidad para abrir su conversación.</div>}</section>
    </div>
  </CardContent></Card>;
};

export default MoonbotTelegramChat;
