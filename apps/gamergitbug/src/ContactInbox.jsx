import React, { useEffect, useRef, useState } from 'react';
import { CONTACT_BOT, contactRequest, findContactBot } from './contact.js';
import './styles.css';

export default function ContactInbox() {
  // Keep credentials in memory: no localStorage, cookies, or tokens in URLs.
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [listing, setListing] = useState(null);
  const [chat, setChat] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState(null);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const report = reason => {
    setError(reason.message || 'Servicio no disponible.');
    if ([401, 403].includes(reason.status)) { setSession(null); setListing(null); setDetail(null); setChat(null); setReply(null); setText(''); }
  };
  async function login(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError('');
    try {
      const auth = await contactRequest('login', { body: { identity: values.get('identity'), password: values.get('password') } });
      form.reset();
      const access = await contactRequest('access', { token: auth.token });
      if (!access.master) throw new Error('Esta bandeja está reservada al master.');
      const data = await contactRequest('conversations', { token: auth.token });
      const bot = findContactBot(data.bots || []);
      if (!bot) throw new Error(`@${CONTACT_BOT} no está disponible en Moonbot. No se seleccionará otro bot.`);
      if (mounted.current) setSession({ token: auth.token, bot });
    } catch (reason) { if (mounted.current) report(reason); }
    finally { form.reset(); if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    setListing(null); setChat(null); setDetail(null); setReply(null); setText('');
    if (!session) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ bot_id: session.bot.id, type: 'private', q: query, page: String(page) });
      contactRequest(`conversations?${params}`, { token: session.token, signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setListing(data); })
        .catch(reason => { if (!controller.signal.aborted) report(reason); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [session, query, page, refresh]);
  useEffect(() => {
    setDetail(null); setReply(null); setText('');
    if (!chat || !session) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ bot_id: session.bot.id, chat_id: chat.id });
    contactRequest(`conversations?${params}`, { token: session.token, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(reason => { if (!controller.signal.aborted) report(reason); });
    return () => controller.abort();
  }, [chat, session]);
  async function send(event) {
    event.preventDefault();
    if (sending.current || !reply || !text.trim() || !session || !chat) return;
    sending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await contactRequest('conversations', { token: session.token, body: {
        action: 'reply', bot_id: session.bot.id, chat_id: chat.id,
        message_id: reply.message_id, text: text.trim(), request_id: reply.requestId,
      } });
      if (mounted.current) { setNotice('Respuesta confirmada por Telegram.'); setChat({ ...chat }); }
    } catch (reason) {
      if (mounted.current) report(new Error(`${reason.message} No se reintentó el envío. Actualiza el historial antes de volver a responder.`));
    } finally {
      // A timeout may follow a successful send. Require inspecting the history before another attempt.
      sending.current = false;
      if (mounted.current) { setBusy(false); setReply(null); setText(''); setDetail(null); }
    }
  }
  return <main className="page contact-inbox">
    <a href="/">← Volver a GamerGitBug</a>
    <div className="section-heading"><div className="kicker">ACCESO PRIVADO · MASTER</div><h1>Bandeja de contacto</h1><p>Lee y responde los chats privados de @{CONTACT_BOT}. Incluye también las consultas que no proceden de GamerGitBug.</p></div>
    {error && <p className="contact-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!session ? <form className="panel contact-login" onSubmit={login}>
      <h2>Iniciar sesión</h2><p>Usa tu cuenta master de TodoSobreAllTech. La sesión de esta bandeja se cierra al recargar la página.</p>
      <label>Correo o usuario<input name="identity" autoComplete="username" required maxLength={254} disabled={busy} /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Comprobando acceso…' : 'Entrar a la bandeja'}</button>
      <p>Si accedes únicamente con Telegram, puedes responder desde <a href="https://todosobreall.tech/dashboard?moon=moon-balancer#moon-infrastructure">el panel master de TodoSobreAllTech</a>, en «Información y chats por bot».</p>
    </form> : <>
      <div className="contact-tools"><strong>Bot de contacto: @{session.bot.username}</strong><button className="button secondary" disabled={busy} onClick={() => { setSession(null); setError(''); setNotice(''); setQuery(''); setPage(1); }}>Cerrar sesión</button></div>
      <div className="contact-tools"><label>Buscar usuario o ID<input value={query} maxLength={100} disabled={busy} onChange={event => { setQuery(event.target.value); setPage(1); setError(''); }} /></label><button className="button secondary" disabled={busy} onClick={() => { setError(''); setRefresh(value => value + 1); }}>Actualizar conversaciones</button></div>
      <div className="contact-inbox-grid">
        <section className="panel" aria-label="Conversaciones privadas"><h2>Conversaciones</h2><p>{listing ? `${listing.total} chats privados` : 'Cargando…'}</p>
          {listing?.chats.map(item => <button className="contact-chat" key={item.id} disabled={busy} aria-pressed={chat?.id === item.id} onClick={() => { setChat(item); setNotice(''); setError(''); }}><strong>{item.name}</strong><small>ID {item.id}</small></button>)}
          {listing?.total === 0 && <p>Aún no hay chats privados que coincidan.</p>}
          {listing && <div className="contact-tools"><button className="button secondary" disabled={busy || listing.page <= 1} onClick={() => setPage(listing.page - 1)}>Anterior</button><span>{listing.page} / {listing.pages}</span><button className="button secondary" disabled={busy || listing.page >= listing.pages} onClick={() => setPage(listing.page + 1)}>Siguiente</button></div>}
        </section>
        <section className="panel" aria-label="Mensajes y respuestas"><h2>{chat?.name || 'Selecciona una conversación'}</h2>
          {chat && <><button className="button secondary" disabled={busy} onClick={() => { setError(''); setChat({ ...chat }); }}>Actualizar historial</button><p>Solo se pueden responder mensajes que Moonbot conserva con un identificador verificable para este bot.</p></>}
          {detail?.notice && <small>{detail.notice}</small>}
          {detail?.history.map((message, index) => <article className="contact-message" key={`${message.message_id}-${index}`}><small>{message.sender || 'Usuario'} · {message.time}</small><p>{message.deleted ? 'Mensaje eliminado' : message.text || 'Sin texto registrado'}</p>
            {message.actions?.includes('reply') && <button className="button secondary" disabled={busy} onClick={() => { setReply({ ...message, requestId: crypto.randomUUID() }); setText(''); setNotice(''); }}>Responder</button>}
          </article>)}
          {detail?.history.length === 0 && <p>No hay mensajes guardados.</p>}
          {reply && <form className="contact-reply" onSubmit={send}><h3>Responder a {chat.name} · #{reply.message_id}</h3><label>Respuesta por @{CONTACT_BOT}<textarea autoFocus value={text} required maxLength={4096} disabled={busy} onChange={event => setText(event.target.value)} /></label><small>{text.length}/4096 · Se enviará al chat de Telegram seleccionado.</small><div className="contact-tools"><button className="button primary" disabled={busy || !text.trim()}>{busy ? 'Enviando…' : 'Enviar respuesta a Telegram'}</button><button className="button secondary" type="button" disabled={busy} onClick={() => { setReply(null); setText(''); }}>Cancelar</button></div></form>}
        </section>
      </div>
    </>}
  </main>;
}
