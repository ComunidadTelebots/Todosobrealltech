import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, ShieldCheck, UserRoundCog, XCircle, Zap } from 'lucide-react';
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
  const [profiles, setProfiles] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [profile, setProfile] = useState('support');
  const [hours, setHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);
  const [lastUrl, setLastUrl] = useState('');
  const [accountId, setAccountId] = useState('');
  const [reason, setReason] = useState('');
  const [telegram, setTelegram] = useState('');
  const [groupScope, setGroupScope] = useState('none');
  const [groupIds, setGroupIds] = useState('');
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);

  const eligibleUsers = useMemo(() => users.filter((user) => user.role !== 'creator'), [users]);
  const verifiedAdmins = useMemo(() => users.filter((user) => user.role === 'admin' && user.telegram_id), [users]);
  const profileOptions = Object.entries(profiles);
  const load = async () => {
    try {
      const data = await call();
      setInvitations(data.invitations || []); setProfiles(data.profiles || {}); setAssignments(data.assignments || []);
    } catch (error) { toast.error(error.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const data = await call({ action: 'create', role: 'admin', profile, group_scope: groupScope,
        group_ids: groupIds.split(',').map((value) => value.trim()).filter(Boolean),
        expires_hours: Number(hours), max_uses: Number(maxUses) });
      setLastUrl(data.url); await load(); await navigator.clipboard?.writeText(data.url).catch(() => {});
      toast.success('Enlace creado y copiado');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const elevate = async () => {
    setBusy(true);
    try {
      const data = await call({ action: 'elevate', account_id: accountId, role: 'admin', profile,
        group_scope: groupScope, group_ids: groupIds.split(',').map((value) => value.trim()).filter(Boolean), reason, telegram });
      setVerification(data); setReason(''); await onChanged?.();
      toast.success('Elevación pendiente de verificar Telegram');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const setQuickProfile = async (targetId, selectedProfile, selectedGroupScope) => {
    setBusy(true);
    try {
      await call({ action: 'set_profile', account_id: targetId, profile: selectedProfile, group_scope: selectedGroupScope });
      await load(); toast.success('Permisos actualizados');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const revoke = async (id) => {
    setBusy(true);
    try { await call({ action: 'revoke', invitation_id: id }); await load(); toast.success('Invitación revocada'); }
    catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };

  return <section className="space-y-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-violet-600"/>Accesos de administración web</h3><p className="text-sm text-muted-foreground">Los perfiles web son independientes de Telegram. El acceso a grupos se concede aparte y nunca se activa automáticamente.</p></div>
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-amber-500"/>Perfiles predefinidos</h4>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{profileOptions.map(([key, item]) => <button type="button" key={key} onClick={() => setProfile(key)} className={`rounded-lg border p-3 text-left transition ${profile === key ? 'border-violet-500 bg-violet-500/10' : 'hover:bg-muted/50'}`}><b className="text-sm">{item.label}</b><p className="text-xs text-muted-foreground">{item.description}</p><div className="mt-2 flex flex-wrap gap-1">{item.capabilities.map((scope) => <Badge key={scope} variant="secondary" className="text-[10px]">{scope}</Badge>)}</div></button>)}</div>
      <label className="block text-sm"><span className="mb-1 block font-medium">Permiso adicional sobre grupos</span><select className="h-10 w-full rounded-md border bg-background px-2" value={groupScope} onChange={(event) => setGroupScope(event.target.value)}><option value="none">Ningún grupo</option><option value="selected">Solo grupos concretos</option><option value="all">Todos los grupos</option></select>{groupScope === 'selected' && <Input className="mt-2" value={groupIds} onChange={(event) => setGroupIds(event.target.value)} placeholder="IDs separados por comas: -100…, -100…"/>}<small className="text-muted-foreground">Este permiso está separado del perfil administrativo web.</small></label>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border bg-background p-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4"/>Crear enlace</h4><div className="grid grid-cols-2 gap-2"><Input type="number" min="1" max="168" value={hours} onChange={(event) => setHours(event.target.value)} aria-label="Horas de validez"/><Input type="number" min="1" max="25" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} aria-label="Usos máximos"/></div><p className="text-xs text-muted-foreground">Perfil: {profiles[profile]?.label} · grupos: {groupScope === 'all' ? 'todos' : 'ninguno'}.</p><Button onClick={create} disabled={busy}>Crear y copiar enlace</Button>{lastUrl && <div className="flex gap-2"><Input readOnly value={lastUrl}/><Button size="icon" variant="outline" onClick={() => navigator.clipboard?.writeText(lastUrl).then(() => toast.success('Copiado'))}><Copy className="h-4 w-4"/></Button></div>}</div>
      <div className="space-y-3 rounded-lg border bg-background p-3"><h4 className="flex items-center gap-2 text-sm font-semibold"><UserRoundCog className="h-4 w-4"/>Elevar usuario existente</h4><select className="h-10 w-full rounded-md border bg-background px-2" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecciona una cuenta</option>{eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id} · {user.role || 'user'}</option>)}</select><Input value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="@usuario o ID de Telegram"/><Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Motivo obligatorio para la auditoría"/><Button onClick={elevate} disabled={busy || !accountId || !reason.trim() || !telegram.trim()}>Solicitar elevación verificada</Button>{verification?.verification_code && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><b>Pendiente de Telegram</b><p>Debe enviar por privado a @{verification.bot_username}:</p><code className="mt-2 block select-all rounded bg-muted p-2">/verificarweb {verification.verification_code}</code></div>}</div>
    </div>
    <div className="space-y-2"><h4 className="text-sm font-semibold">Administradores verificados</h4>{verifiedAdmins.map((user) => { const current = assignments.find((item) => item.account_id === user.id) || { profile: 'support', group_scope: 'none' }; return <div key={user.id} className="grid gap-2 rounded-lg border bg-background p-2 md:grid-cols-[1fr_180px_170px]"><span className="text-sm"><b>{user.name || user.email || user.id}</b><small className="ml-2 text-muted-foreground">Telegram verificado</small></span><select className="h-9 rounded-md border bg-background px-2 text-sm" value={current.profile} disabled={busy} onChange={(event) => setQuickProfile(user.id, event.target.value, current.group_scope)}>{profileOptions.map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select><select className="h-9 rounded-md border bg-background px-2 text-sm" value={current.group_scope || 'none'} disabled={busy} onChange={(event) => setQuickProfile(user.id, current.profile, event.target.value)}><option value="none">Sin grupos</option><option value="all">Todos los grupos</option></select></div>; })}{!verifiedAdmins.length && <p className="text-sm text-muted-foreground">Aparecerán después de verificar Telegram.</p>}</div>
    <div className="space-y-2"><h4 className="text-sm font-semibold">Invitaciones recientes</h4>{invitations.slice(0, 12).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2 text-sm"><span><Badge variant={item.valid ? 'default' : 'secondary'}>{profiles[item.profile]?.label || item.profile}</Badge><Badge className="ml-2" variant="outline">{item.group_scope === 'all' ? 'Todos los grupos' : 'Sin grupos'}</Badge> <span className="ml-2">{item.uses}/{item.max_uses} usos · vence {new Date(item.expires_at).toLocaleString('es-ES')}</span></span>{item.valid && <Button size="sm" variant="outline" disabled={busy} onClick={() => revoke(item.id)}><XCircle className="mr-1 h-4 w-4"/>Revocar</Button>}</div>)}{!invitations.length && <p className="text-sm text-muted-foreground">Todavía no hay invitaciones.</p>}</div>
  </section>;
};

export default WebAdminAccessManager;
