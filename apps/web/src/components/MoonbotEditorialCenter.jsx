import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Eye, FileText, History, LayoutTemplate, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const call = async (options = {}) => {
  const response = await apiServerClient.fetch('/moonbot-admin/editorial', { ...options, headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' } });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const MoonbotEditorialCenter = ({ groups = [] }) => {
  const [data, setData] = useState({ items: [], schedule: [], templates: [], series: [], announcements: [] });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targets, setTargets] = useState([]);
  const [executeAt, setExecuteAt] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [preview, setPreview] = useState(null);
  const [headlines, setHeadlines] = useState('');
  const [headlineResult, setHeadlineResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setData(await call()); } catch (cause) { setError(cause.message); } };
  useEffect(() => { load(); }, []);
  const action = async (name, extra = {}) => {
    setBusy(true); setError('');
    try { const response = await call({ method: 'POST', body: JSON.stringify({ action: name, title, body, targets, execute_at: executeAt ? new Date(executeAt).toISOString() : undefined, recurrence: recurrence || undefined, ...extra }) }); await load(); return response.result; } catch (cause) { setError(cause.message); return null; } finally { setBusy(false); }
  };
  const scheduled = useMemo(() => (data.schedule || []).filter((item) => item.status === 'scheduled'), [data.schedule]);
  const toggleTarget = (id) => setTargets((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <Card className="mt-8 border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" />Centro editorial Moonbot</CardTitle><CardDescription>Crea, previsualiza, publica y programa contenido para uno o varios grupos.</CardDescription></CardHeader><CardContent className="space-y-6">{error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>}<div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><section className="space-y-3 rounded-xl border p-4"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="TÃ­tulo interno o del comunicado" maxLength={300} /><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Contenido compatible con Markdown de Telegram" className="min-h-48" maxLength={12000} /><div><p className="mb-2 text-sm font-medium">Destinos</p><div className="flex max-h-32 flex-wrap gap-2 overflow-auto">{groups.map((group) => <Button key={group.id} type="button" size="sm" variant={targets.includes(group.id) ? 'default' : 'outline'} onClick={() => toggleTarget(group.id)}>{group.name}</Button>)}</div></div><div className="grid gap-2 sm:grid-cols-2"><Input type="datetime-local" value={executeAt} onChange={(event) => setExecuteAt(event.target.value)} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="">Sin recurrencia</option><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></div><div className="flex flex-wrap gap-2"><Button disabled={busy || !body || !targets.length} onClick={() => action('publish_now')}><Send className="mr-2 h-4 w-4" />Publicar ahora</Button><Button variant="outline" disabled={busy || !body} onClick={async () => setPreview(await action('preview'))}><Eye className="mr-2 h-4 w-4" />Vista previa</Button><Button variant="outline" disabled={busy || !body || !targets.length || !executeAt} onClick={() => action('schedule')}><Clock3 className="mr-2 h-4 w-4" />Programar</Button><Button variant="outline" disabled={busy || !title || !body} onClick={() => action('template_save')}><LayoutTemplate className="mr-2 h-4 w-4" />Guardar plantilla</Button><Button variant="outline" disabled={busy || !title || !body} onClick={() => action('announcement', { operation: 'publish' })}><History className="mr-2 h-4 w-4" />Comunicado versionado</Button></div></section><aside className="space-y-4"><div className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Plantillas</h3>{data.templates?.map((template) => <button key={template.id} className="mb-2 block w-full rounded-lg border p-2 text-left text-sm hover:bg-muted/30" onClick={() => { setTitle(template.name); setBody(template.body); }}>{template.name}</button>)}{!data.templates?.length && <p className="text-sm text-muted-foreground">No hay plantillas guardadas.</p>}</div><div className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />Calendario</h3>{scheduled.slice(0, 8).map((item) => <div key={item.id} className="mb-2 rounded-lg border p-2 text-xs"><b>{new Date(item.execute_at).toLocaleString()}</b><p>{item.targets.length} destino(s) {item.recurrence && `Â· ${item.recurrence}`}</p></div>)}{!scheduled.length && <p className="text-sm text-muted-foreground">No hay publicaciones pendientes.</p>}</div></aside></div>{preview && <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4"><h3 className="mb-2 font-semibold">Vista previa</h3><div className="whitespace-pre-wrap text-sm">{preview.rendered}</div><p className="mt-3 text-xs text-muted-foreground">{preview.characters} caracteres</p></section>}<section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Comparador de titulares</h3><Textarea value={headlines} onChange={(event) => setHeadlines(event.target.value)} placeholder="Un titular por lÃ­nea" /><Button className="mt-3" variant="outline" disabled={busy} onClick={async () => setHeadlineResult(await action('headline_compare', { headlines: headlines.split('\n').filter(Boolean) }))}>Comparar</Button>{headlineResult?.ranking?.map((row) => <div key={row.index} className="mt-2 flex justify-between rounded-lg border p-2 text-sm"><span>{row.headline}</span><Badge>{row.score}/100</Badge></div>)}</section></CardContent></Card>;
};

export default MoonbotEditorialCenter;
