import React, { useEffect, useState } from 'react';
import { BellRing, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const defaults = { channels: { email: true, push: false, telegram: true }, topics: { security: true, news: true, community: true, system: true }, digest: 'daily', quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'Europe/Madrid' } };
const labels = { email: 'Correo', push: 'Push', telegram: 'Telegram', security: 'Seguridad', news: 'Noticias', community: 'Comunidad', system: 'Sistema' };

const CommunicationPreferencesPanel = () => {
  const [value, setValue] = useState(defaults); const [summary, setSummary] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiServerClient.fetch('/moonbot-admin/account-tools/communication-preferences').then(async (response) => {
      const data = await apiServerClient.readJson(response); if (response.ok) setValue(data.preferences);
    }).catch(() => {});
    apiServerClient.fetch('/moonbot-admin/account-tools/delegated-summary').then(async (response) => {
      const data = await apiServerClient.readJson(response); if (response.ok) setSummary(data);
    }).catch(() => {});
  }, []);
  const toggle = (section, key) => setValue((current) => ({ ...current, [section]: { ...current[section], [key]: !current[section][key] } }));
  const save = async () => { setBusy(true); try { const response = await apiServerClient.fetch('/moonbot-admin/account-tools/communication-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }); const data = await apiServerClient.readJson(response); if (!response.ok) throw new Error(data.error); setValue(data.preferences); toast.success('Preferencias sincronizadas'); } catch (error) { toast.error(error.message); } finally { setBusy(false); } };
  return <>
    <section className="space-y-4 rounded-xl border bg-background p-4"><div><h3 className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4"/>Centro de preferencias de comunicación</h3><p className="text-xs text-muted-foreground">Se sincroniza con tu cuenta y se aplica en todos tus dispositivos.</p></div><div className="grid gap-2 sm:grid-cols-3">{Object.keys(value.channels).map((key) => <label key={key} className="flex items-center justify-between rounded-lg border p-3 text-sm">{labels[key]}<input type="checkbox" checked={value.channels[key]} onChange={() => toggle('channels', key)}/></label>)}</div><div className="grid gap-2 sm:grid-cols-2">{Object.keys(value.topics).map((key) => <label key={key} className="flex items-center justify-between rounded-lg border p-3 text-sm">{labels[key]}<input type="checkbox" checked={value.topics[key]} onChange={() => toggle('topics', key)}/></label>)}</div><label className="block text-sm">Resumen<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={value.digest} onChange={(event) => setValue({ ...value, digest: event.target.value })}><option value="realtime">En tiempo real</option><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="never">Sin resumen</option></select></label><label className="flex items-center justify-between text-sm">Horario silencioso<input type="checkbox" checked={value.quiet_hours.enabled} onChange={() => toggle('quiet_hours', 'enabled')}/></label>{value.quiet_hours.enabled && <div className="grid grid-cols-2 gap-2"><input className="rounded-md border bg-background p-2" type="time" value={value.quiet_hours.start} onChange={(event) => setValue({ ...value, quiet_hours: { ...value.quiet_hours, start: event.target.value } })}/><input className="rounded-md border bg-background p-2" type="time" value={value.quiet_hours.end} onChange={(event) => setValue({ ...value, quiet_hours: { ...value.quiet_hours, end: event.target.value } })}/></div>}<button type="button" disabled={busy} onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar y sincronizar'}</button></section>
    {summary && <section className="mt-4 rounded-xl border bg-background p-4"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4"/>Acceso temporal delegado</h3><p className="text-xs text-muted-foreground">Resumen agregado; no contiene nombres, correos ni IDs de otras cuentas.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(summary.summary).map(([key, total]) => <div key={key} className="rounded-lg border p-3"><b className="text-xl">{total}</b><small className="block text-muted-foreground">{key.replaceAll('_', ' ')}</small></div>)}</div></section>}
  </>;
};
export default CommunicationPreferencesPanel;
