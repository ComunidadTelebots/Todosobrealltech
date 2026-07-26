import React, { useState } from 'react';
import { Gavel } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const MoonbotAdvancedUserActions = ({ groups = [] }) => {
  const [userId, setUserId] = useState(''); const [groupId, setGroupId] = useState(groups[0]?.id || ''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (action, extra = {}) => { setBusy(true); setMessage(''); try { const response = await apiServerClient.fetch(`/moonbot-admin/users/${userId}`, { method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, group_id: groupId, reason: 'AcciÃ³n avanzada desde TodoSobreAllTech', ...extra }) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`); setMessage(action === 'peer_review' ? `Caso creado: ${data.review?.id}` : 'AcciÃ³n aplicada correctamente.'); } catch (cause) { setMessage(cause.message); } finally { setBusy(false); } };
  return <Card className="mt-8 border-fuchsia-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-fuchsia-600" />Acciones avanzadas de usuario</CardTitle><CardDescription>Silencia, restaura o abre una revisiÃ³n colegiada sin salir de todosobreall.tech.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2"><Input value={userId} onChange={(event) => setUserId(event.target.value.replace(/\D/g, ''))} placeholder="ID de usuario Telegram" /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={groupId} onChange={(event) => setGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy || !userId || !groupId} onClick={() => run('mute', { minutes: 30 })}>Silenciar 30 min</Button><Button variant="outline" disabled={busy || !userId || !groupId} onClick={() => run('unmute')}>Restaurar mensajes</Button><Button variant="outline" disabled={busy || !userId} onClick={() => run('peer_review', { operation: 'create', quorum: 3 })}>Crear revisiÃ³n por pares</Button></div>{message && <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">{message}</p>}</CardContent></Card>;
};
export default MoonbotAdvancedUserActions;
