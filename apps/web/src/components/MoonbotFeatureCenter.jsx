import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Layers3, Play, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import MoonbotSchemaFeatureForm from '@/components/MoonbotSchemaFeatureForm.jsx';

const auth = () => ({ Authorization: `Bearer ${pb.authStore.token}` });
const groupParameter = (feature) => (feature?.input_schema?.parameters || [])
  .find((parameter) => ['group_id', 'chat_id', 'channel_id'].includes(parameter.name));
const bindSelectedGroup = (feature, payload, groupId) => {
  const parameter = groupParameter(feature);
  if (!parameter || !groupId) return payload;
  const next = { args: [...(payload.args || [])], kwargs: { ...(payload.kwargs || {}) } };
  if (parameter.binding === 'args') {
    const position = (feature.input_schema.parameters || []).filter((item) => item.binding === 'args').indexOf(parameter);
    next.args[position] = groupId;
  } else next.kwargs[parameter.name] = groupId;
  return next;
};

export default function MoonbotFeatureCenter() {
  const [features, setFeatures] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeGroup, setActiveGroup] = useState(null);
  const [selected, setSelected] = useState(null);
  const [payload, setPayload] = useState('{\n  "args": [],\n  "kwargs": {}\n}');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formValid, setFormValid] = useState(true);
  const [actorRole, setActorRole] = useState('user');
  const [releaseChannel, setReleaseChannel] = useState('stable');
  const [accessibleGroups, setAccessibleGroups] = useState([]);
  const [groupId, setGroupId] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/features', { headers: auth() });
      const body = await apiServerClient.readJson(response);
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      const initialGroupId = String(body.groups?.[0]?.id || '');
      setFeatures((body.features || []).map((feature) => ({ ...feature, selected_group_id: initialGroupId })));
      setActorRole(body.actor_role || 'user');
      setReleaseChannel(body.release_channel || 'stable');
      setAccessibleGroups(body.groups || []);
      setGroupId((current) => current || initialGroupId);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return features.filter((item) => (roleFilter === 'all' || item.minimum_role === roleFilter)
      && (!needle || `${item.id} ${item.title || ''} ${item.capability || ''} ${item.api}`.toLowerCase().includes(needle)));
  }, [features, query, roleFilter]);
  const groups = useMemo(() => {
    const grouped = new Map();
    visible.forEach((item) => {
      const key = item.scope || item.module || 'general';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);
  const groupItems = activeGroup ? (groups.find(([key]) => key === activeGroup)?.[1] || []) : [];

  const execute = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const parsed = bindSelectedGroup(selected, JSON.parse(payload), groupId);
      const response = await apiServerClient.fetch('/moonbot-admin/features', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ feature_id: selected.id, payload: parsed }) });
      const body = await apiServerClient.readJson(response);
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setResult(body.result);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  return <Card className="mt-6">
    <CardHeader><CardTitle>Paneles de funciones por rol</CardTitle><CardDescription>Las funciones verificadas se agrupan en paneles cortos. Abre uno para administrarlo en una vista independiente.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ID, capacidad o API"/></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por rol"><option value="all">Todos los roles</option><option value="user">Usuario</option><option value="group_admin">Administrador</option><option value="group_creator">Creador del grupo</option><option value="master">Master</option></select><Button variant="outline" onClick={load} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
      {!!accessibleGroups.length && <label className="block max-w-xl text-sm font-medium">Grupo administrable<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={groupId} onChange={(event) => { const value = event.target.value; setGroupId(value); setSelected((current) => current ? { ...current, selected_group_id: value } : current); }}>{accessibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.access_role}</option>)}</select></label>}
      <p className="text-sm text-muted-foreground">{visible.length} de {features.length} funciones accesibles · {groups.length} paneles · rol efectivo <Badge variant="secondary">{actorRole}</Badge></p>
      <p className="text-xs text-muted-foreground">Canal de funciones asignado: <Badge variant="outline">{releaseChannel}</Badge></p>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map(([key, items]) => <button type="button" key={key} onClick={() => { setActiveGroup(key); setSelected(null); }} className="flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Layers3 className="h-5 w-5"/></span><span className="min-w-0 flex-1"><b className="block truncate capitalize">{key.replaceAll('_', ' ')}</b><small className="text-muted-foreground">{items.length} funciones</small></span><ChevronRight className="h-5 w-5 text-muted-foreground"/></button>)}</div>
      {activeGroup && <div className="fixed inset-0 z-[80] overflow-y-auto bg-background/98 backdrop-blur-sm"><div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center gap-3"><Button size="icon" variant="outline" onClick={() => { setActiveGroup(null); setSelected(null); setResult(null); }} aria-label="Volver a los paneles"><ArrowLeft className="h-5 w-5"/></Button><div className="min-w-0"><b className="block truncate capitalize">{activeGroup.replaceAll('_', ' ')}</b><small className="text-muted-foreground">{groupItems.length} funciones administrables</small></div></div></div><div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(280px,.8fr)_minmax(360px,1.2fr)]"><div className="max-h-[75vh] space-y-2 overflow-auto">{groupItems.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setResult(null); }} className={`w-full rounded-xl border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><span className="flex items-center justify-between gap-2"><b>{item.id}</b><Badge variant="outline">{item.minimum_role}</Badge></span><span className="mt-2 block">{item.title || item.capability || item.api}</span><small className="mt-1 block text-muted-foreground">riesgo {item.risk || 'moderate'}</small></button>)}</div><section className="min-h-64 space-y-3 rounded-xl border p-4">{selected ? <><div><b>{selected.title || selected.capability || selected.id}</b><p className="break-all text-sm text-muted-foreground">{selected.module}.{selected.api}</p></div><MoonbotSchemaFeatureForm feature={selected} onPayload={setPayload} onValidityChange={setFormValid}/><details><summary className="cursor-pointer text-sm text-muted-foreground">Modo avanzado: revisar JSON</summary><textarea className="mt-2 min-h-44 w-full rounded-md border bg-background p-3 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)} aria-label="Argumentos JSON"/></details><Button onClick={execute} disabled={busy || !formValid}><Play className="mr-2 h-4 w-4"/>Ejecutar de forma segura</Button>{result !== null && <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}</> : <div className="grid min-h-56 place-items-center text-center text-sm text-muted-foreground">Selecciona una función para abrir su panel.</div>}</section></div></div>}
    </CardContent>
  </Card>;
}
