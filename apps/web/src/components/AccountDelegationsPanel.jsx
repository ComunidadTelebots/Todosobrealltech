import React, { useEffect, useState } from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';

const AccountDelegationsPanel = ({ users = [] }) => {
  const [delegations, setDelegations] = useState([]);
  const [delegateId, setDelegateId] = useState('');
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await apiServerClient.fetch('/moonbot-admin/account-tools/delegations');
    const data = await apiServerClient.readJson(response);
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las delegaciones');
    setDelegations(data.delegations || []);
  };
  useEffect(() => { load().catch(() => setDelegations([])); }, []);

  const mutate = async (payload) => {
    setBusy(true);
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/account-tools/delegations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la delegación');
      setDelegateId(''); await load(); toast.success(payload.action === 'revoke' ? 'Delegación revocada' : 'Delegación temporal creada');
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };
  const create = () => mutate({ action: 'create', delegate_id: delegateId,
    permissions: ['view_account_summary'], expires_at: new Date(Date.now() + Number(hours) * 3600000).toISOString() });
  const active = (item) => !item.revoked_at && Date.parse(item.expires_at) > Date.now();

  return <section className="space-y-3 rounded-xl border bg-background p-4 xl:col-span-2">
    <div><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4"/>Delegación temporal de cuentas</h3><p className="text-xs text-muted-foreground">Concede una vista agregada y sin datos personales. Caduca automáticamente y no modifica el rol web ni los permisos de grupos.</p></div>
    <div className="grid gap-2 md:grid-cols-[1fr_9rem_auto]"><select className="h-10 rounded-md border bg-background px-3" value={delegateId} onChange={(event) => setDelegateId(event.target.value)}><option value="">Seleccionar cuenta…</option>{users.filter((user) => user.role !== 'creator' && !user.is_frozen).map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}</select><label className="text-xs text-muted-foreground">Duración (horas)<input className="mt-1 h-8 w-full rounded-md border bg-background px-2" type="number" min="1" max="720" value={hours} onChange={(event) => setHours(event.target.value)}/></label><Button disabled={busy || !delegateId || Number(hours) < 1 || Number(hours) > 720} onClick={create}>Delegar vista</Button></div>
    <div className="space-y-2">{delegations.slice(0, 10).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span><b>{users.find((user) => user.id === item.delegate_id)?.name || item.delegate_id}</b><small className="block text-muted-foreground"><Clock3 className="mr-1 inline h-3 w-3"/>{active(item) ? `Activa hasta ${new Date(item.expires_at).toLocaleString()}` : item.revoked_at ? 'Revocada' : 'Caducada'} · resumen sin datos personales</small></span>{active(item) && <Button size="sm" variant="outline" disabled={busy} onClick={() => mutate({ action: 'revoke', delegation_id: item.id })}>Revocar</Button>}</div>)}{!delegations.length && <p className="text-sm text-muted-foreground">No hay delegaciones creadas.</p>}</div>
  </section>;
};
export default AccountDelegationsPanel;
