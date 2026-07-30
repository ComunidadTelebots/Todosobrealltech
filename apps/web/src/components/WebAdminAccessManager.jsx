import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, ShieldCheck, UserRoundCog, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

const call = async (body) => {
  const response = await apiServerClient.fetch('/moonbot-admin/web-admin-invitations', {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${pb.authStore.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await apiServerClient.readJson(response);
  if (!response.ok) throw new Error(payload.error || 'No se pudo gestionar el acceso web');
  return payload;
};

const WebAdminAccessManager = ({ users = [], onChanged }) => {
  const [invitations, setInvitations] = useState([]);
  const [role, setRole] = useState('admin');
  const [hours, setHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);
  const [lastUrl, setLastUrl] = useState('');
  const [accountId, setAccountId] = useState('');
  const [elevationRole, setElevationRole] = useState('admin');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleUsers = useMemo(() => users.filter((user) => user.role !== 'creator'), [users]);
  const load = async () => {
    try { setInvitations((await call()).invitations || []); } catch (error) { toast.error(error.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const data = await call({ action: 'create', role, expires_hours: Number(hours), max_uses: Number(maxUses) });
      setLastUrl(data.url);
      await load();
      await navigator.clipboard?.writeText(data.url).catch(() => {});
      toast.success('Enlace creado y copiado');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const revoke = async (id) => {
    setBusy(true);
    try { await call({ action: 'revoke', invitation_id: id }); await load(); toast.success('Invitación revocada'); }
    catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const elevate = async () => {
    setBusy(true);
    try {
      await call({ action: 'elevate', account_id: accountId, role: elevationRole, reason });
      setReason('');
      await onChanged?.();
      toast.success('Cuenta elevada para administrar la web');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };

  return <section className="space-y-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-violet-600"/>Accesos de administración web</h3><p className="text-sm text-muted-foreground">Solo el master crea estos accesos. No conceden administración ni permisos dentro de grupos Telegram.</p></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border bg-background p-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4"/>Crear enlace</h4>
        <div className="grid grid-cols-3 gap-2"><select className="h-10 rounded-md border bg-background px-2" value={role} onChange={(event) => setRole(event.target.value)}><option value="admin">Administrador web</option></select><Input type="number" min="1" max="168" value={hours} onChange={(event) => setHours(event.target.value)} aria-label="Horas de validez"/><Input type="number" min="1" max="25" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} aria-label="Usos máximos"/></div>
        <p className="text-xs text-muted-foreground">Validez: {hours} h · usos: {maxUses}. El token se muestra una sola vez y se almacena únicamente su huella.</p>
        <Button onClick={create} disabled={busy}>Crear y copiar enlace</Button>
        {lastUrl && <div className="flex gap-2"><Input readOnly value={lastUrl}/><Button size="icon" variant="outline" onClick={() => navigator.clipboard?.writeText(lastUrl).then(() => toast.success('Copiado'))}><Copy className="h-4 w-4"/></Button></div>}
      </div>
      <div className="space-y-3 rounded-lg border bg-background p-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><UserRoundCog className="h-4 w-4"/>Elevar usuario existente</h4>
        <select className="h-10 w-full rounded-md border bg-background px-2" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecciona una cuenta</option>{eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id} · {user.role || 'user'}</option>)}</select>
        <select className="h-10 w-full rounded-md border bg-background px-2" value={elevationRole} onChange={(event) => setElevationRole(event.target.value)}><option value="admin">Administrador web</option></select>
        <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Motivo obligatorio para la auditoría"/>
        <Button onClick={elevate} disabled={busy || !accountId || !reason.trim()}>Elevar cuenta</Button>
      </div>
    </div>
    <div className="space-y-2"><h4 className="text-sm font-semibold">Invitaciones recientes</h4>{invitations.slice(0, 12).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2 text-sm"><span><Badge variant={item.valid ? 'default' : 'secondary'}>{item.role}</Badge> <span className="ml-2">{item.uses}/{item.max_uses} usos · vence {new Date(item.expires_at).toLocaleString('es-ES')}</span></span>{item.valid && <Button size="sm" variant="outline" disabled={busy} onClick={() => revoke(item.id)}><XCircle className="mr-1 h-4 w-4"/>Revocar</Button>}</div>)}{!invitations.length && <p className="text-sm text-muted-foreground">Todavía no hay invitaciones.</p>}</div>
  </section>;
};

export default WebAdminAccessManager;
