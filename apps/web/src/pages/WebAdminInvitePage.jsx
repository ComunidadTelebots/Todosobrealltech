import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { Helmet } from 'react-helmet';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button.jsx';

const WebAdminInvitePage = () => {
  const { token = '' } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [telegram, setTelegram] = useState('');
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    apiServerClient.fetch(`/moonbot-admin/web-admin-invitations/inspect?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => { const data = await apiServerClient.readJson(response); if (!response.ok) throw new Error(data.error); return data; })
      .then((data) => setInvitation(data.invitation)).catch((reason) => reason.name !== 'AbortError' && setError(reason.message));
    return () => controller.abort();
  }, [token]);

  const redeem = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/web-admin-invitations/redeem', {
        method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, telegram }),
      });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error);
      setVerification(data);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const rememberReturn = () => sessionStorage.setItem('post_auth_path', `/admin/invite/${token}`);
  const checkVerification = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/web-admin-verifications/me', { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error);
      if (data.verification?.status === 'verified') { await pb.collection('users').authRefresh(); setDone(true); }
      else setError('La verificación todavía está pendiente. Envía primero el mensaje privado al bot.');
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  return <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 py-12"><Helmet><title>Acceso administrativo web</title><meta name="robots" content="noindex,nofollow"/></Helmet><section className="w-full space-y-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
    {error ? <ShieldX className="mx-auto h-12 w-12 text-destructive"/> : <ShieldCheck className="mx-auto h-12 w-12 text-violet-600"/>}
    <div><h1 className="text-2xl font-bold">Invitación de administración web</h1><p className="mt-2 text-muted-foreground">Este acceso es independiente de los permisos de administrador en grupos Telegram.</p></div>
    {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {done ? <><p className="font-medium">Telegram verificado. Tu nuevo rol administrativo ya está activo.</p><Button asChild><Link to="/dashboard">Abrir panel</Link></Button></> : invitation ? <div className="space-y-4"><div className="rounded-lg border bg-muted/30 p-4"><b>Rol: Administrador web</b><p className="text-sm text-muted-foreground">Caduca: {new Date(invitation.expires_at).toLocaleString('es-ES')}</p></div>{pb.authStore.isValid ? verification?.verification_code ? <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-left"><b>Verifica tu Telegram</b><p className="text-sm">Desde la cuenta indicada, abre @{verification.bot_username} y envía por privado:</p><code className="block select-all rounded bg-muted p-3 text-center">/verificarweb {verification.verification_code}</code><Button className="w-full" onClick={checkVerification} disabled={busy}>Ya envié el mensaje · comprobar</Button></div> : <div className="space-y-3"><input className="h-10 w-full rounded-md border bg-background px-3" value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="@usuario o ID de Telegram"/><Button onClick={redeem} disabled={busy || !telegram.trim()}>{busy ? 'Preparando verificación…' : 'Aceptar y verificar con Telegram'}</Button></div> : <div className="flex justify-center gap-2"><Button asChild><Link to="/login" onClick={rememberReturn}>Iniciar sesión</Link></Button><Button asChild variant="outline"><Link to="/signup" onClick={rememberReturn}>Crear cuenta</Link></Button></div>}</div> : !error && <p>Cargando invitación…</p>}
  </section></div>;
};

export default WebAdminInvitePage;
