import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, Copy, Search, Settings2, UsersRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const request = async (path, options) => {
  const response = await apiServerClient.fetch(path, { ...options, headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json', ...(options?.headers || {}) } });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};

const MoonbotGroupsManager = ({ groups = [] }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const filtered = useMemo(() => groups.filter((group) => `${group.name} ${group.id}`.toLowerCase().includes(query.toLowerCase())), [groups, query]);

  const open = async (group) => {
    setSelected(group); setDetail(null); setError('');
    try { setDetail(await request(`/moonbot-admin/groups/${group.id}`)); } catch (reason) { setError(reason.message); }
  };
  const copyFrom = async (sourceId) => {
    try {
      const payload = await request(`/moonbot-admin/groups/${selected.id}`, { method: 'POST', body: JSON.stringify({ action: 'copy_config', source_id: sourceId }) });
      setDetail((current) => ({ ...current, config: payload.config }));
    } catch (reason) { setError(reason.message); }
  };

  if (selected) return <Card className="mt-8 border-violet-500/20"><CardHeader><Button variant="ghost" className="mb-2 w-fit" onClick={() => { setSelected(null); setDetail(null); }}><ChevronLeft className="mr-2 h-4 w-4" />Volver a grupos</Button><CardTitle>{selected.name}</CardTitle><CardDescription>ID {selected.id}</CardDescription></CardHeader><CardContent className="space-y-5">{error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{error}</div>}{detail && <><div className={`rounded-xl border p-4 ${detail.permissions.healthy ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}><div className="flex items-center gap-2 font-semibold">{detail.permissions.healthy ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}Permisos del bot</div><p className="mt-2 text-sm">{detail.permissions.healthy ? 'Dispone de todos los permisos esenciales.' : `Faltan: ${detail.permissions.missing.map((item) => item.label).join(', ')}`}</p></div><div className="grid grid-cols-3 gap-3">{Object.entries(detail.activity).map(([key, value]) => <div key={key} className="rounded-xl border p-3 text-center"><b className="text-xl">{value}</b><p className="text-xs text-muted-foreground">{key.replaceAll('_', ' ')}</p></div>)}</div><div className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4" />MÃ³dulos activos</h3><div className="flex flex-wrap gap-2">{Object.entries(detail.config).filter(([, value]) => value && typeof value === 'object' && value.enabled).map(([name]) => <Badge key={name}>{name.replaceAll('_', ' ')}</Badge>)}</div></div><div className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Copy className="h-4 w-4" />Copiar configuraciÃ³n desde otro grupo</h3><div className="flex flex-wrap gap-2">{groups.filter((group) => group.id !== selected.id).slice(0, 12).map((group) => <Button key={group.id} size="sm" variant="outline" onClick={() => copyFrom(group.id)}>{group.name}</Button>)}</div></div></>}</CardContent></Card>;

  return <Card className="mt-8 border-violet-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-violet-600" />AdministraciÃ³n de grupos</CardTitle><CardDescription>Busca un grupo y abre su panel independiente de permisos, actividad y configuraciÃ³n.</CardDescription></CardHeader><CardContent><div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o ID" /></div><div className="grid gap-3 md:grid-cols-2">{filtered.map((group) => <button key={group.id} onClick={() => open(group)} className="rounded-xl border p-4 text-left transition hover:border-violet-500/50 hover:bg-muted/30"><p className="font-semibold">{group.name}</p><p className="text-xs text-muted-foreground">{group.id}</p></button>)}{!filtered.length && <p className="text-sm text-muted-foreground">No se encontraron grupos administrables.</p>}</div></CardContent></Card>;
};

export default MoonbotGroupsManager;
