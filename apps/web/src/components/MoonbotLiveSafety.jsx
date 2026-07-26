import React, { useEffect, useState } from 'react';
import { Radio, ScanFace } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const call = async (options = {}) => { const response = await apiServerClient.fetch('/moonbot-admin/security', { ...options, headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' } }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`); return data; };

const MoonbotLiveSafety = () => {
  const [data, setData] = useState({ source_summary: {}, active_raids: [] });
  const [candidate, setCandidate] = useState({ id: '', name: '', username: '' });
  const [admin, setAdmin] = useState({ id: '', name: '', username: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const load = () => call().then(setData).catch((cause) => setError(cause.message));
  useEffect(() => { load(); const timer = window.setInterval(load, 15000); return () => window.clearInterval(timer); }, []);
  const check = async () => { try { const response = await call({ method: 'POST', body: JSON.stringify({ action: 'impersonation', candidate, administrators: [admin] }) }); setResult(response.result); } catch (cause) { setError(cause.message); } };
  const field = (state, setter, key, placeholder) => <Input value={state[key]} onChange={(event) => setter({ ...state, [key]: event.target.value })} placeholder={placeholder} />;
  return <Card className="mt-8 border-red-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 animate-pulse text-red-600" />Seguridad en vivo</CardTitle><CardDescription>ActualizaciÃ³n automÃ¡tica cada 15 segundos y vista unificada de fuentes.</CardDescription></CardHeader><CardContent className="space-y-5">{error && <p className="rounded-lg bg-red-500/10 p-3 text-sm">{error}</p>}<div className="flex flex-wrap gap-2">{Object.entries(data.source_summary || {}).map(([source, count]) => <Badge key={source} variant="outline">{source}: {count}</Badge>)}</div><div className="rounded-xl border p-4"><b>Raids activos: {data.active_raids?.length || 0}</b>{data.active_raids?.map((raid) => <p key={raid.group_id} className="mt-2 text-sm">Grupo {raid.group_id} Â· {raid.joins} entradas</p>)}</div><section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><ScanFace className="h-4 w-4" />Detector de suplantaciÃ³n</h3><div className="grid gap-2 sm:grid-cols-3">{field(candidate, setCandidate, 'id', 'ID candidato')}{field(candidate, setCandidate, 'name', 'Nombre candidato')}{field(candidate, setCandidate, 'username', 'Username candidato')}{field(admin, setAdmin, 'id', 'ID administrador')}{field(admin, setAdmin, 'name', 'Nombre administrador')}{field(admin, setAdmin, 'username', 'Username administrador')}</div><Button className="mt-3" onClick={check} disabled={!candidate.name || !admin.name}>Comprobar identidad</Button>{result && <p className={`mt-3 rounded-lg p-3 text-sm ${result.impersonation ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>{result.impersonation ? `Posible suplantaciÃ³n: ${result.matches.map((item) => item.reason).join(', ')}` : 'No se detectÃ³ similitud de riesgo.'}</p>}</section></CardContent></Card>;
};
export default MoonbotLiveSafety;
