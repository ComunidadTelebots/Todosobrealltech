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
        body: JSON.stringify({ token }),
      });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error);
      pb.authStore.save(pb.authStore.token, data.user);
      setDone(true);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const rememberReturn = () => sessionStorage.setItem('post_auth_path', `/admin/invite/${token}`);

  return <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 py-12"><Helmet><title>Acceso administrativo web</title><meta name="robots" content="noindex,nofollow"/></Helmet><section className="w-full space-y-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
    {error ? <ShieldX className="mx-auto h-12 w-12 text-destructive"/> : <ShieldCheck className="mx-auto h-12 w-12 text-violet-600"/>}
    <div><h1 className="text-2xl font-bold">Invitación de administración web</h1><p className="mt-2 text-muted-foreground">Este acceso es independiente de los permisos de administrador en grupos Telegram.</p></div>
    {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {done ? <><p className="font-medium">Cuenta elevada correctamente. Tu nuevo rol ya está activo.</p><Button asChild><Link to="/dashboard">Abrir panel</Link></Button></> : invitation ? <div className="space-y-4"><div className="rounded-lg border bg-muted/30 p-4"><b>Rol: {invitation.role === 'admin' ? 'Administrador web' : 'Moderador web'}</b><p className="text-sm text-muted-foreground">Caduca: {new Date(invitation.expires_at).toLocaleString('es-ES')}</p></div>{pb.authStore.isValid ? <Button onClick={redeem} disabled={busy}>{busy ? 'Aplicando acceso…' : 'Aceptar acceso administrativo'}</Button> : <div className="flex justify-center gap-2"><Button asChild><Link to="/login" onClick={rememberReturn}>Iniciar sesión</Link></Button><Button asChild variant="outline"><Link to="/signup" onClick={rememberReturn}>Crear cuenta</Link></Button></div>}</div> : !error && <p>Cargando invitación…</p>}
  </section></div>;
};

export default WebAdminInvitePage;
