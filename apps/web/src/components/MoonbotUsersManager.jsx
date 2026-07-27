import React, { useEffect, useState } from 'react';
import { Ban, ChevronLeft, Search, ShieldAlert, StickyNote, UserCheck, Users } from 'lucide-react';
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

const MoonbotUsersManager = ({ groups = [] }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (search = query, currentPage = page) => {
    setLoading(true);
    try { const data = await call(`/moonbot-admin/users?q=${encodeURIComponent(search)}&page=${currentPage}&per_page=50`); setUsers(data.users || []); setStats(data.ban_stats || {}); setTotal(data.total || 0); setPage(data.page || 1); setTotalPages(data.total_pages || 1); } catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => load(query, page), 250); return () => window.clearTimeout(timer); }, [query, page]);
  const open = async (user) => {
    setSelected(user); setDetail(null); setReason(''); setGroupId(groups[0]?.id || ''); setError('');
    try { const data = await call(`/moonbot-admin/users/${user.id}`); setDetail(data); setNote(data.user.notes || ''); } catch (cause) { setError(cause.message); }
  };
  const action = async (name, extra = {}) => {
    setBusy(true); setError('');
    try {
      await call(`/moonbot-admin/users/${selected.id}`, { method: 'POST', body: JSON.stringify({ action: name, reason, group_id: groupId, note, ...extra }) });
      const fresh = await call(`/moonbot-admin/users/${selected.id}`); setDetail(fresh); await load();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };

  if (selected) return <Card className="mt-8 border-rose-500/20"><CardHeader><Button variant="ghost" className="mb-2 w-fit" onClick={() => setSelected(null)}><ChevronLeft className="mr-2 h-4 w-4" />Volver a usuarios</Button><CardTitle>{detail?.user?.name || selected.name}</CardTitle><CardDescription>ID {selected.id}</CardDescription></CardHeader><CardContent className="space-y-5">{error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>}{detail && <><div className="grid grid-cols-3 gap-3"><div className="rounded-xl border p-3"><b>{detail.user.messages}</b><p className="text-xs text-muted-foreground">Mensajes</p></div><div className="rounded-xl border p-3"><b>{detail.user.karma}</b><p className="text-xs text-muted-foreground">ReputaciÃ³n</p></div><div className="rounded-xl border p-3"><b>{detail.user.engagement}%</b><p className="text-xs text-muted-foreground">ParticipaciÃ³n</p></div></div><div className={`rounded-xl border p-4 ${detail.cas?.banned ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}><p className="font-semibold">ComprobaciÃ³n CAS local</p><p className="text-sm">{detail.cas?.available ? (detail.cas.banned ? `Incluido en CAS${detail.cas.offenses ? ` Â· ${detail.cas.offenses} ofensas` : ''}` : 'No aparece en la copia local de CAS') : 'La fuente local de CAS no estÃ¡ disponible'}</p></div>{detail.user.ban && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"><p className="font-semibold">Baneo global activo</p><p className="text-sm">{detail.user.ban.reason || 'Sin motivo indicado'} Â· {detail.user.ban.source || 'sin fuente'}</p></div>}<div className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4" />Nota administrativa</h3><Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} /><Button className="mt-3" size="sm" disabled={busy} onClick={() => action('save_note')}>Guardar nota</Button></div><div className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Acciones de moderaciÃ³n</h3><Input className="mb-3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la acciÃ³n" /><select className="mb-3 h-10 w-full rounded-md border bg-background px-3 text-sm" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Selecciona un grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={busy} onClick={() => action('ban_global')}><Ban className="mr-2 h-4 w-4" />Ban global</Button><Button variant="outline" disabled={busy || !groupId} onClick={() => action('ban_local')}>Ban en grupo</Button><Button variant="outline" disabled={busy || !groupId} onClick={() => action('quarantine')}>Cuarentena</Button><Button variant="secondary" disabled={busy} onClick={() => action('unban_global')}><UserCheck className="mr-2 h-4 w-4" />Restaurar global</Button><Button variant="secondary" disabled={busy || !groupId} onClick={() => action('unban_local')}>Restaurar en grupo</Button></div></div>{detail.appeals?.length > 0 && <div className="rounded-xl border p-4"><h3 className="font-semibold">Apelaciones</h3>{detail.appeals.map((appeal) => <div key={appeal.id} className="mt-3 rounded-lg border p-3 text-sm"><p>{appeal.message}</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline">{appeal.status}</Badge>{appeal.status === 'pending' && <><Button size="sm" variant="outline" disabled={busy} onClick={() => action('resolve_appeal', { appeal_id: appeal.id, decision: 'approved' })}>Aceptar</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => action('resolve_appeal', { appeal_id: appeal.id, decision: 'rejected' })}>Rechazar</Button></>}</div></div>)}</div>}</>}</CardContent></Card>;

  return <Card className="mt-8 border-rose-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-rose-600" />Usuarios y sanciones Moonbot</CardTitle><CardDescription>Consulta los {total} usuarios con búsqueda global y páginas de 50 registros.</CardDescription></CardHeader><CardContent>{error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>}<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(stats).slice(0, 4).map(([key, value]) => <div key={key} className="rounded-xl border p-3"><b className="text-xl">{typeof value === 'number' ? value : 0}</b><p className="text-xs text-muted-foreground">{key.replaceAll('_', ' ')}</p></div>)}</div><div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar en todos los usuarios por nombre o ID" /></div><div className={`max-h-[32rem] space-y-2 overflow-auto ${loading ? 'opacity-60' : ''}`}>{users.map((user) => <button key={user.id} onClick={() => open(user)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-muted/30"><span><b>{user.name}</b><small className="ml-2 text-muted-foreground">{user.id}</small></span><span className="flex gap-2"><Badge variant="outline">{user.messages} mensajes</Badge>{user.banned && <Badge variant="destructive">Baneado</Badge>}</span></button>)}{!loading && !users.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No hay usuarios que coincidan con la búsqueda.</p>}</div><div className="mt-4 flex items-center justify-between"><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span><Button size="sm" variant="outline" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div></CardContent></Card>;
};

export default MoonbotUsersManager;
