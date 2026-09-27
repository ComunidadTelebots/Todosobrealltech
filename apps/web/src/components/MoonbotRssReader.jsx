import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MoonbotRssReader({ sources = [], channels = [], request }) {
  const [sourceId, setSourceId] = useState('');
  const [news, setNews] = useState(null);
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const read = async () => {
    setBusy(true); setMessage(''); setNews(null);
    try { setNews({ ...await request('reader', { action: 'read', source_id: sourceId }), sourceId }); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const share = async (entry) => {
    const name = channels.find((c) => c.id === channel)?.name;
    if (!channel || !window.confirm(`Publicar en ${name}:\n\n${entry.title}\n${entry.url}\n\nIncluirá un botón para abrir el lector RSS de la WebApp.`)) return;
    setBusy(true); setMessage('');
    try { const result = await request('reader', { action: 'share', source_id: news.sourceId, entry_id: entry.id, channel_id: channel }); setMessage(result.already_sent ? 'Esta noticia ya se publicó en ese canal.' : 'Noticia publicada con el enlace a la WebApp.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="my-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4" aria-label="Lector RSS integrado">
    <h3 className="text-lg font-semibold">Leer noticias aquí</h3><p className="my-2 text-sm text-muted-foreground">Leer no consume el cupo de mensajes de Telegram. Publica una noticia en un canal administrado con un botón para descubrir la WebApp.</p>
    <div className="flex flex-wrap gap-2"><select aria-label="Fuente del lector" className="min-w-0 flex-1 rounded border bg-background p-2" value={sourceId} disabled={busy} onChange={(e) => { setSourceId(e.target.value); setNews(null); setMessage(''); }}><option value="">Selecciona una fuente</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.title || 'Mi RSS'}</option>)}</select><Button disabled={!sourceId || busy} onClick={read}>Ver noticias</Button></div>
    {message && <p className="my-3 text-sm" role="status">{message}</p>}{busy && <p role="status">Procesando…</p>}
    {news && <><div className="my-3 flex flex-wrap gap-2"><input className="min-w-0 flex-1 rounded border bg-background p-2" aria-label="Buscar en las noticias" placeholder="Buscar en estas noticias" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Canal para compartir noticias" className="min-w-0 rounded border bg-background p-2" disabled={busy} value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">Compartir en un canal…</option>{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      {!channels.length && <p className="text-xs text-muted-foreground">Para compartir, vincula tu Telegram y añade el bot como administrador de tu canal con permiso de publicación.</p>}
      <div className="mt-3 max-h-[600px] space-y-3 overflow-auto">{news.entries.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())).map((item) => <article key={item.id} className="rounded-lg border bg-background p-4"><p className="text-xs text-muted-foreground">{news.source.title}{item.published_at ? ` · ${item.published_at}` : ''}</p><h4 className="my-2 font-semibold">{item.title}</h4>{item.summary && <p className="mb-3 text-sm">{item.summary}</p>}<div className="flex flex-wrap items-center gap-3"><a className="text-sm underline" href={item.url} target="_blank" rel="noopener noreferrer">Leer original</a><Button size="sm" disabled={!channel || busy} onClick={() => share(item)}>Publicar en canal + WebApp</Button></div></article>)}</div>
      {!news.entries.length && <p>No hay noticias disponibles en esta fuente.</p>}</>}
  </section>;
}
