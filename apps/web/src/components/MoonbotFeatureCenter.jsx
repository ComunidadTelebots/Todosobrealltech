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
  const [selected, setSelected] = useState(null);
  const [payload, setPayload] = useState('{\n  "args": [],\n  "kwargs": {}\n}');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/features', { headers: auth() });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setFeatures(body.features || []);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? features.filter((item) => `${item.id} ${item.title || ''} ${item.capability || ''} ${item.api}`.toLowerCase().includes(needle)) : features;
  }, [features, query]);
  const execute = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const parsed = JSON.parse(payload);
      const response = await apiServerClient.fetch('/moonbot-admin/features', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: selected.id, payload: parsed }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setResult(body.result);
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <Card className="mt-6">
    <CardHeader><CardTitle>Funciones verificadas</CardTitle><CardDescription>Registro ejecutable compartido por Moonbot, la web y la MiniApp. Solo el master puede usarlo.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ID, capacidad o API" /></div><Button variant="outline" onClick={load} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Actualizar</Button></div>
      <p className="text-sm text-muted-foreground">{visible.length} de {features.length} funciones accesibles</p>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid max-h-96 gap-2 overflow-auto md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setResult(null); }} className={`rounded-lg border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><span className="flex items-center justify-between gap-2"><b>{item.id}</b><Badge variant="outline">{item.api}</Badge></span><span className="mt-2 block text-muted-foreground">{item.title || item.capability}</span></button>)}</div>
      {selected && <section className="space-y-3 rounded-xl border p-4"><div><b>{selected.id}</b><p className="text-sm text-muted-foreground">{selected.title || selected.capability} · {selected.module}.{selected.api}</p></div><textarea className="min-h-36 w-full rounded-md border bg-background p-3 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)} aria-label="Argumentos JSON"/><Button onClick={execute} disabled={busy}><Play className="mr-2 h-4 w-4"/>Ejecutar de forma segura</Button>{result !== null && <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}</section>}
    </CardContent>
  </Card>;
}
