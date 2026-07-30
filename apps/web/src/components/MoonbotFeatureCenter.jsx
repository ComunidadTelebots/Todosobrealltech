import React, { useEffect, useMemo, useState } from 'react';
import { Play, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const auth = () => ({ Authorization: `Bearer ${pb.authStore.token}` });

export default function MoonbotFeatureCenter() {
  const [features, setFeatures] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [payload, setPayload] = useState('{\n  "args": [],\n  "kwargs": {}\n}');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/features', { headers: auth() });
      const body = await apiServerClient.readJson(response);
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setFeatures(body.features || []);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return features.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.minimum_role === roleFilter;
      const matchesQuery = !needle || `${item.id} ${item.title || ''} ${item.capability || ''} ${item.api}`.toLowerCase().includes(needle);
      return matchesRole && matchesQuery;
    });
  }, [features, query, roleFilter]);
  const execute = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const parsed = JSON.parse(payload);
      const response = await apiServerClient.fetch('/moonbot-admin/features', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: selected.id, payload: parsed }),
      });
      const body = await apiServerClient.readJson(response);
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setResult(body.result);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <Card className="mt-6">
    <CardHeader><CardTitle>Funciones verificadas por rol</CardTitle><CardDescription>Registro compartido por Moonbot, la web y la MiniApp. Cada contrato indica si corresponde a usuarios, administradores, creadores de grupo o al master.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ID, capacidad o API" /></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por rol"><option value="all">Todos los roles</option><option value="user">Usuario</option><option value="group_admin">Administrador</option><option value="group_creator">Creador del grupo</option><option value="master">Master</option></select><Button variant="outline" onClick={load} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
      <p className="text-sm text-muted-foreground">{visible.length} de {features.length} funciones accesibles</p>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid max-h-96 gap-2 overflow-auto md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setResult(null); }} className={`rounded-lg border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><span className="flex items-center justify-between gap-2"><b>{item.id}</b><Badge variant="outline">{item.minimum_role}</Badge></span><span className="mt-2 block text-muted-foreground">{item.title || item.capability}</span><small className="mt-2 block text-muted-foreground">{item.scope} · riesgo {item.risk}</small></button>)}</div>
      {selected && <section className="space-y-3 rounded-xl border p-4"><div><b>{selected.id}</b><p className="text-sm text-muted-foreground">{selected.title || selected.capability} · {selected.module}.{selected.api}</p></div><textarea className="min-h-36 w-full rounded-md border bg-background p-3 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)} aria-label="Argumentos JSON"/><Button onClick={execute} disabled={busy}><Play className="mr-2 h-4 w-4"/>Ejecutar de forma segura</Button>{result !== null && <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}</section>}
    </CardContent>
  </Card>;
}
