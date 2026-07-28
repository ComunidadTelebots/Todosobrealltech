import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, KeyRound, Link2, Network, Radar, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const call = async (path, options = {}) => {
  const response = await apiServerClient.fetch(path, { ...options, headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' } });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const MoonbotSecurityCenter = () => {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState('url');
  const [value, setValue] = useState('');
  const [secretText, setSecretText] = useState('');
  const [incidentGroups, setIncidentGroups] = useState('');
  const [incidentWindow, setIncidentWindow] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setData(await call('/moonbot-admin/security')); } catch (cause) { setError(cause.message); } };
  useEffect(() => { load(); }, []);
  const run = async (action, payload) => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await call('/moonbot-admin/security', { method: 'POST', body: JSON.stringify({ action, ...payload }) })); await load(); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  const evidence = async () => {
    setBusy(true); setError('');
    try {
      const payload = await call('/moonbot-admin/security/evidence');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `moonbot-evidence-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  const correlate = async () => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await call('/moonbot-admin/roadmap/action', { method: 'POST', body: JSON.stringify({ action: 'incident_correlation', data: { group_ids: incidentGroups.split(',').map((item) => item.trim()).filter(Boolean), window_minutes: Number(incidentWindow), minimum_events: 2 } }) })); }
    catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };

  return <Card className="mt-8 border-amber-500/20"><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-600" />Centro de seguridad Moonbot</CardTitle><CardDescription>CAS, registro comunitario, amenazas, raids, VirusTotal y evidencias desde un Ãºnico panel.</CardDescription></div><Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></CardHeader><CardContent className="space-y-6">{error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>}{data && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border p-3"><b className="text-2xl">{data.threats_total}</b><p className="text-xs text-muted-foreground">AnÃ¡lisis</p></div><div className="rounded-xl border p-3"><b className="text-2xl text-red-600">{data.threats_high}</b><p className="text-xs text-muted-foreground">Amenazas</p></div><div className="rounded-xl border p-3"><b className="text-2xl">{data.media_events}</b><p className="text-xs text-muted-foreground">Eventos multimedia</p></div><div className="rounded-xl border p-3"><b className="text-2xl">{data.active_raids?.length || 0}</b><p className="text-xs text-muted-foreground">Raids activos</p></div></div><div className="flex flex-wrap gap-2">{Object.entries(data.ban_sources || {}).map(([source, count]) => <Badge key={source} variant="outline">{source}: {count}</Badge>)}</div></>}
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4" />AnÃ¡lisis con VirusTotal</h3><div className="flex gap-2"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}><option value="url">URL</option><option value="domain">Dominio</option><option value="hash">Hash</option></select><Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="URL, dominio o hash" /></div><Button className="mt-3" disabled={busy || !value.trim()} onClick={() => run('analyze', { kind, value })}>Analizar</Button></section><section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" />Detector privado de secretos</h3><Input value={secretText} onChange={(event) => setSecretText(event.target.value)} placeholder="Pega texto para comprobarlo; no se almacena" /><Button className="mt-3" variant="outline" disabled={busy || !secretText} onClick={() => run('secret_scan', { text: secretText })}>Comprobar</Button></section></div>
    <section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Network className="h-4 w-4"/>Correlación de incidencias</h3><p className="mb-3 text-sm text-muted-foreground">Agrupa cronologías relacionadas por proximidad temporal, tipo y términos compartidos.</p><div className="grid gap-2 sm:grid-cols-[1fr_140px]"><Input value={incidentGroups} onChange={(event) => setIncidentGroups(event.target.value)} placeholder="IDs de grupos separados por comas"/><Input type="number" min="1" max="1440" value={incidentWindow} onChange={(event) => setIncidentWindow(event.target.value)} aria-label="Ventana en minutos"/></div><Button className="mt-3" variant="outline" disabled={busy || !incidentGroups.trim()} onClick={correlate}>Buscar patrones comunes</Button></section>
    {result && <div className={`rounded-xl border p-4 ${result.safe === false || result.risk === 'high' ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}><p className="font-semibold">Resultado</p>{result.result?.clusters ? <><p className="text-sm">{result.result.events_analyzed} eventos · {result.result.clusters.length} patrones</p>{result.result.clusters.map((cluster) => <div key={cluster.id} className="mt-2 rounded-lg border p-2 text-sm"><Badge variant={cluster.risk === 'high' || cluster.risk === 'critical' ? 'destructive' : 'outline'}>{cluster.risk}</Badge> {cluster.events} eventos en {cluster.groups.length} grupos<p className="text-xs text-muted-foreground">{cluster.shared_terms.join(', ') || 'Mismo tipo y ventana temporal'}</p></div>)}</> : <><p className="text-sm">{result.note || result.message || `Riesgo: ${result.risk || 'sin amenazas'}`}</p>{result.findings?.map((finding) => <Badge className="mr-2 mt-2" key={finding.type} variant="destructive">{finding.type}: {finding.count}</Badge>)}</>}</div>}
    <section className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><Radar className="h-4 w-4" />Incidentes recientes</h3><Button size="sm" variant="outline" disabled={busy} onClick={evidence}><Download className="mr-2 h-4 w-4" />Exportar evidencia firmada</Button></div><div className="space-y-2">{data?.history?.slice(0, 12).map((item, index) => <div key={`${item.time}-${index}`} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span className="flex items-center gap-2">{item.risk === 'high' ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}{item.kind || item.source}</span><span><Badge variant="outline">{item.risk || 'analizado'}</Badge></span></div>)}{!data?.history?.length && <p className="text-sm text-muted-foreground">No hay incidentes registrados.</p>}</div></section></CardContent></Card>;
};

export default MoonbotSecurityCenter;
