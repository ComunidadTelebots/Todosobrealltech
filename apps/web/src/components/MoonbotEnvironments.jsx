import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Server, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiServerClient from '@/lib/apiServerClient.js';

const channels = { dev: 'Desarrollo', alpha: 'Alfa', beta: 'Beta', rc: 'RC' };
const colors = { dev: 'bg-violet-500/10 text-violet-700', alpha: 'bg-amber-500/10 text-amber-700', beta: 'bg-blue-500/10 text-blue-700', rc: 'bg-emerald-500/10 text-emerald-700' };

function AccessEditor({ policy, targets, title, disabled, save, frozen = false }) {
  const [mode, setMode] = useState(policy.mode);
  const [selected, setSelected] = useState(policy.targets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const changed = mode !== policy.mode || JSON.stringify([...selected].sort()) !== JSON.stringify([...policy.targets].sort());
  const submit = async () => {
    setBusy(true); setError(''); setMessage('');
    try { await save({ scope: policy.scope, mode, targets: mode === 'inherit' ? [] : selected, revision: policy.revision }); setMessage('Permisos guardados'); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  return <fieldset className="rounded-xl border bg-background p-4" disabled={disabled || busy}>
    <legend className="px-2 text-sm font-semibold">{title}{frozen ? ' · cuenta congelada' : ''}</legend>
    {policy.scope !== 'global' && <label className="mb-3 flex flex-wrap items-center gap-3 text-sm">Tipo de acceso
      <select className="rounded-md border bg-background px-3 py-2" value={mode} onChange={(event) => { setMode(event.target.value); setMessage(''); }}>
        <option value="inherit">Usar permisos generales</option><option value="custom">Permisos propios</option>
      </select>
    </label>}
    {mode === 'inherit' ? <p className="text-sm text-muted-foreground">Recibe los entornos del acceso general. Los cambios generales se aplican a esta cuenta.</p> : <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{targets.map((target) => <label key={target.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
        <input type="checkbox" className="mt-1" checked={selected.includes(target.id)} onChange={(event) => { setSelected(event.target.checked ? [...selected, target.id] : selected.filter((id) => id !== target.id)); setMessage(''); }} />
        <span><b>{target.name}</b><span className="block text-xs text-muted-foreground">{channels[target.channel]} · {target.version}</span></span>
      </label>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Sin casillas seleccionadas: sin acceso a los entornos de prueba.</p>
    </>}
    {frozen && <p className="mt-2 text-sm text-amber-700">La cuenta no puede entrar mientras esté congelada.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" disabled={disabled || busy || !changed} onClick={submit}>{busy ? 'Guardando…' : 'Guardar permisos'}</Button>
      {message && <span role="status" className="text-sm text-emerald-700">{message}</span>}
      {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
    </div>
  </fieldset>;
}

export default function MoonbotEnvironments({ client = apiServerClient, readOnly = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState('');
  const [query, setQuery] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const call = useCallback(async (path = '', options = {}) => {
    const response = await client.fetch(`/moonbot-environments${path}`, options);
    const body = await client.readJson(response);
    if (!response.ok || !body.ok) throw new Error(body.error || 'No se pudo consultar el acceso a Moonbot');
    return body;
  }, [client]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await call()); } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, [call]);
  useEffect(() => { load(); }, [load]);
  const save = async (policy) => {
    const result = await call('/access', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) });
    setSavedMessage(policy.scope === 'global' ? 'Permisos generales guardados.' : 'Permisos del administrador guardados.');
    setData((previous) => policy.scope === 'global' ? { ...previous, global: result.policy }
      : { ...previous, accounts: previous.accounts.map((account) => account.id === policy.scope ? { ...account, policy: result.policy } : account) });
  };
  const open = async (id) => {
    if (readOnly) return;
    setOpening(id); setError('');
    try { const result = await call(`/${encodeURIComponent(id)}/open`, { method: 'POST' }); window.location.assign(result.url); }
    catch (reason) { setError(reason.message); setOpening(''); }
  };
  const accounts = (data?.accounts || []).filter((account) => `${account.name} ${account.id}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-6" aria-label="Entornos Docker de Moonbot">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Moonbot · acceso por administrador</p>
      <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold"><Server className="h-6 w-6" />Versiones y entornos</h2>
      <p className="mt-2 text-sm text-muted-foreground">Abre el Docker de desarrollo, alfa, beta o RC que tengas asignado.</p></div>
      <Button variant="outline" onClick={load} disabled={loading || !!opening}><RefreshCw className="mr-2 h-4 w-4" />{loading ? 'Cargando…' : 'Actualizar accesos'}</Button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-500/5 p-3 text-sm text-destructive">{error}</p>}
    {!data && loading && <p role="status">Consultando tus entornos…</p>}
    {data && <>
      {data.configured && !data.accessReady && <p role="status" className="rounded-lg bg-amber-500/10 p-3 text-sm">El acceso a los entornos aún no está activado en la API.{data.canManage ? ' Configura MOON_ENVIRONMENT_SECRET para habilitar las sesiones seguras.' : ' Contacta con el creador.'}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.targets.map((target) => <article key={target.id} className="flex flex-col gap-3 rounded-xl border p-4">
        <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${colors[target.channel]}`}>{channels[target.channel]}</span>
        <h3 className="font-semibold">{target.name}</h3><p className="text-sm">Versión declarada: <b>{target.version}</b></p>
        <p className="break-all text-xs text-muted-foreground">{target.host}</p>
        <Button className="mt-auto" variant="outline" onClick={() => open(target.id)} disabled={readOnly || !data.accessReady || !!opening || !!error}><ExternalLink className="mr-2 h-4 w-4" />{opening === target.id ? 'Abriendo…' : 'Abrir Moonbot'}</Button>
      </article>)}</div>
      {!data.targets.length && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{data.configured ? 'No tienes entornos asignados. El creador puede habilitarlos para tu cuenta.' : 'Todavía no hay entornos Docker registrados. Configura sus direcciones protegidas para poder asignarlos aquí.'}</p>}
      <p className="flex items-start gap-2 rounded-lg bg-cyan-500/5 p-3 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-cyan-700" /><span>El acceso se comprueba al entrar y en cada nueva petición. La sesión dura 10 minutos; puedes renovarla abriendo el entorno desde aquí. Moonbot conserva su propio inicio de sesión y sus permisos internos.</span></p>
      {data.canManage && <div className="space-y-5 border-t pt-5"><div><h3 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" />Asignar acceso a administradores</h3><p className="mt-1 text-sm text-muted-foreground">Solo el creador puede cambiar estos permisos. Los permisos propios sustituyen a los generales; el creador tiene acceso a todos los entornos registrados.</p></div>
        {savedMessage && <p role="status" className="text-sm text-emerald-700">{savedMessage}</p>}
        <AccessEditor key={`global-${data.global.revision}`} policy={data.global} targets={data.targets} title="Acceso general de administradores" disabled={readOnly || !!error || loading} save={save} />
        <label className="block text-sm">Buscar administrador<input className="mt-2 block w-full rounded-md border bg-background px-3 py-2" placeholder="Nombre o identificador" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="space-y-4">{accounts.map((account) => <AccessEditor key={`${account.id}-${account.policy.revision}`} policy={account.policy} targets={data.targets} title={account.name} frozen={account.frozen} disabled={readOnly || !!error || loading} save={save} />)}</div>
        {!accounts.length && <p className="text-sm text-muted-foreground">No hay administradores que coincidan.</p>}
      </div>}
    </>}
  </section>;
}
