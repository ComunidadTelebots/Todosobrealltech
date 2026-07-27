import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, History, Play, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const request = async (options = {}) => {
  const response = await apiServerClient.fetch('/moonbot-admin/horizon', {
    ...options,
    headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const PAYLOAD_EXAMPLES = {
  moderation: { group_id: '-100...', samples: [], operation: 'check' },
  community: { group_id: '-100...', user_id: '123', operation: 'list' },
  content: { content_id: 'post-1', title: '', items: [], operation: 'list' },
  ai: { group_id: '-100...', text: '', operation: 'analyze' },
  access: { text: '', language: 'es' },
  privacy: { user_id: '123', operation: 'preview' },
  operations: { group_id: '-100...', operation: 'check' },
  integrations: { group_id: '-100...', operation: 'list' },
  sustainability: { group_id: '-100...', operation: 'calculate' },
  telegram: { group_id: '-100...', operation: 'list' },
};

const MoonbotHorizonCenter = () => {
  const [data, setData] = useState({ features: [], audit: [], total: 0 });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [payload, setPayload] = useState('{}');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => { setBusy(true); try { setData(await request()); setError(''); } catch (cause) { setError(cause.message); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const unified = useMemo(() => data.features.map((item) => ({ ...item, id: item.id || `operational-${item.slug}`, horizonStatus: 'operational', executable: true })), [data.features]);
  const categories = useMemo(() => [...new Set(unified.map((item) => item.category))].sort(), [unified]);
  const visible = useMemo(() => unified.filter((item) => (category === 'all' || item.category === category)
    && (status === 'all' || item.horizonStatus === status)
    && `${item.title} ${item.slug} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase())), [category, query, status, unified]);

  const choose = (feature) => {
    if (!feature.executable) return;
    setSelected(feature); setResult(null); setError('');
    setPayload(JSON.stringify(feature.payload_example || PAYLOAD_EXAMPLES[feature.category] || {}, null, 2));
  };
  const execute = async () => {
    if (!selected) return;
    let parsed;
    try { parsed = JSON.parse(payload || '{}'); } catch { setError('El formulario JSON no es válido.'); return; }
    setBusy(true); setError('');
    try { setResult((await request({ method: 'POST', body: JSON.stringify({ slug: selected.slug, payload: parsed }) })).result); await load(); }
    catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };

  return <Card className="mt-8 border-violet-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600"/>Horizonte unificado</CardTitle><CardDescription>Las 1.100 funciones de la web, Moonbot y la Mini App reunidas en un catálogo ejecutable, configurable y auditado.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border p-3"><b className="text-2xl">{unified.length}</b><p className="text-xs text-muted-foreground">Funciones totales</p></div><div className="rounded-xl border p-3"><b className="text-2xl">{data.total || data.features.length}</b><p className="text-xs text-muted-foreground">Ejecutables aquí</p></div><div className="rounded-xl border p-3"><b className="text-2xl">{categories.length}</b><p className="text-xs text-muted-foreground">Áreas operativas</p></div><div className="rounded-xl border p-3"><b className="text-2xl">0</b><p className="text-xs text-muted-foreground">Pendientes</p></div></div>
    {error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</div>}
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]"><section className="rounded-xl border"><div className="grid gap-2 border-b p-3 sm:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entre 1.100 funciones"/></div><select className="rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="operational">Ejecutables</option><option value="implemented">Implementadas</option><option value="proposed">Propuestas</option></select><select className="rounded-md border bg-background px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las áreas</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="max-h-[560px] space-y-1 overflow-auto p-2">{visible.map((feature) => <button key={feature.id || feature.slug} disabled={!feature.executable} onClick={() => choose(feature)} className={`w-full rounded-lg border p-3 text-left disabled:cursor-default disabled:opacity-80 ${selected?.slug === feature.slug ? 'border-violet-500 bg-violet-500/10' : 'border-transparent hover:bg-muted/50'}`}><div className="flex justify-between gap-2"><b className="text-sm">{feature.title}</b><CheckCircle2 className={`h-4 w-4 shrink-0 ${feature.horizonStatus === 'proposed' ? 'text-amber-500' : 'text-emerald-600'}`}/></div><div className="mt-1 flex flex-wrap gap-1"><Badge variant="outline">{feature.category}</Badge><Badge variant="secondary">{feature.executable ? 'ejecutable' : feature.horizonStatus}</Badge>{feature.product_name && <Badge variant="outline">{feature.product_name}</Badge>}</div></button>)}</div></section>
      <section className="rounded-xl border p-4">{selected ? <div className="space-y-3"><div><h3 className="font-semibold">{selected.title}</h3><p className="text-xs text-muted-foreground">{selected.slug} · motor {selected.engine}</p></div><label className="block text-sm">Parámetros<textarea className="mt-1 min-h-64 w-full rounded-md border bg-background p-3 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)}/></label><Button onClick={execute} disabled={busy}><Play className="mr-2 h-4 w-4"/>{busy ? 'Ejecutando…' : 'Ejecutar función'}</Button>{result !== null && <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result, null, 2)}</pre>}</div> : <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">Selecciona una función para abrir su formulario asistido.</div>}</section></div>
    <details className="rounded-xl border p-3"><summary className="flex cursor-pointer items-center gap-2 font-medium"><History className="h-4 w-4"/>Historial auditable</summary><pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">{JSON.stringify(data.audit.slice(0, 30), null, 2)}</pre></details>
  </CardContent></Card>;
};

export default MoonbotHorizonCenter;
