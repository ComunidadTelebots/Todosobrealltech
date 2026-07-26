import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, Search, UsersRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const request = async (path, options = {}) => {
  const response = await apiServerClient.fetch(path, { ...options, headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' } });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const MoonbotGroupsManager = ({ groups = [] }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');
  const filtered = useMemo(() => groups.filter((group) => `${group.name} ${group.id} ${group.bot_username || ''}`.toLowerCase().includes(query.toLowerCase())), [groups, query]);
  const open = async (group) => { setSelected(group); setDetail(null); setComparison(null); setError(''); try { setDetail(await request(`/moonbot-admin/groups/${group.id}`)); } catch (cause) { setError(cause.message); } };
  const groupAction = async (action, sourceId) => { try { const payload = await request(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({ action, source_id: sourceId }) }); if (payload.config) setDetail((current) => ({ ...current, config: payload.config })); if (payload.comparison) setComparison(payload.comparison); } catch (cause) { setError(cause.message); } };

  if (!selected) return <Card className="mt-8 border-violet-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-violet-600" />Administración de grupos</CardTitle><CardDescription>Busca un grupo y abre su panel independiente.</CardDescription></CardHeader><CardContent><div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, ID o bot" /></div><div className="grid gap-3 md:grid-cols-2">{filtered.map((group) => <button key={group.id} onClick={() => open(group)} className="rounded-xl border p-4 text-left hover:border-violet-500/50 hover:bg-muted/30"><p className="font-semibold">{group.name}</p><p className="text-xs text-muted-foreground">{group.id}</p><div className="mt-2 flex flex-wrap gap-1">{(group.bots?.length ? group.bots : group.bot_username ? [{ username: group.bot_username }] : []).map((bot) => <Badge key={`${group.id}-${bot.id || bot.username}`} variant="secondary">@{bot.username}</Badge>)}</div></button>)}</div></CardContent></Card>;

  return <Card className="mt-8 border-violet-500/20"><CardHeader><Button variant="ghost" className="mb-2 w-fit" onClick={() => setSelected(null)}><ChevronLeft className="mr-2 h-4 w-4" />Volver a grupos</Button><CardTitle>{selected.name}</CardTitle><CardDescription>ID {selected.id}</CardDescription></CardHeader><CardContent className="space-y-5">{error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{error}</div>}{detail && <><section className={`rounded-xl border p-4 ${detail.permissions.healthy ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}><h3 className="flex items-center gap-2 font-semibold">{detail.permissions.healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}Permisos del bot</h3><p className="mt-2 text-sm">{detail.permissions.healthy ? 'Todos los permisos esenciales estÃ¡n disponibles.' : `Faltan: ${detail.permissions.missing.map((item) => item.label).join(', ')}`}</p>{detail.repair_steps?.length > 0 && <ol className="mt-3 list-inside list-decimal text-sm">{detail.repair_steps.map((step) => <li key={step}>{step}</li>)}</ol>}</section><div className="grid grid-cols-3 gap-3">{Object.entries(detail.activity).map(([key, value]) => <div key={key} className="rounded-xl border p-3 text-center"><b className="text-xl">{value}</b><p className="text-xs text-muted-foreground">{key.replaceAll('_', ' ')}</p></div>)}</div><section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">MÃ³dulos activos</h3><div className="flex flex-wrap gap-2">{Object.entries(detail.config).filter(([, value]) => value && typeof value === 'object' && value.enabled).map(([name]) => <Badge key={name}>{name.replaceAll('_', ' ')}</Badge>)}</div></section><section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Copiar o comparar reglas</h3><div className="space-y-2">{groups.filter((group) => group.id !== selected.id).slice(0, 12).map((group) => <div key={group.id} className="flex items-center justify-between"><span className="text-sm">{group.name}</span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => groupAction('compare_config', group.id)}>Comparar</Button><Button size="sm" variant="outline" onClick={() => groupAction('copy_config', group.id)}>Copiar</Button></span></div>)}</div>{comparison && <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">{comparison.identical ? 'Configuraciones idÃ©nticas.' : `${comparison.differences.length} diferencias: ${comparison.differences.map((item) => item.section).join(', ')}`}</p>}</section><section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Historial reciente</h3><div className="max-h-64 space-y-2 overflow-auto">{detail.history?.map((item, index) => <div key={`${item.time}-${index}`} className="rounded-lg border p-2 text-sm"><b>{item.sender}</b> <small>{item.time}</small><p>{item.text || (item.has_media ? 'Contenido multimedia' : '')}</p></div>)}{!detail.history?.length && <p className="text-sm text-muted-foreground">No hay historial almacenado.</p>}</div></section></>}</CardContent></Card>;
};

export default MoonbotGroupsManager;
