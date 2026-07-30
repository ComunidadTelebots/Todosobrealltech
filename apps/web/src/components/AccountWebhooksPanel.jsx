import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, FlaskConical, Power, Trash2, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const headers = (json = false) => ({ Authorization: `Bearer ${pb.authStore.token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) });
const LABELS = { 'account.created': 'Cuenta creada', 'account.role_changed': 'Rol cambiado', 'account.frozen': 'Cuenta congelada', 'account.recovered': 'Cuenta recuperada' };

const AccountWebhooksPanel = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState(Object.keys(LABELS));
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ url: '', secret: '', events: ['account.role_changed', 'account.frozen', 'account.recovered'] });
  const load = useCallback(async () => { const response = await apiServerClient.fetch('/moonbot-admin/account-tools/webhooks', { headers: headers() }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los webhooks'); setWebhooks(data.webhooks || []); setEvents(data.events || Object.keys(LABELS)); }, []);
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, [load]);
  const act = async (payload, success) => { setBusy(true); try { const response = await apiServerClient.fetch('/moonbot-admin/account-tools/webhooks', { method: 'POST', headers: headers(true), body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción'); setWebhooks(data.webhooks || []); toast.success(success); } catch (error) { toast.error(error.message); } finally { setBusy(false); } };
  const create = async () => { if (!draft.url || !draft.events.length) return toast.error('Indica una URL HTTPS y al menos un evento'); await act({ action: 'create', webhook: draft }, 'Webhook guardado'); setDraft({ url: '', secret: '', events: ['account.role_changed', 'account.frozen', 'account.recovered'] }); };
  const toggleEvent = (event) => setDraft((value) => ({ ...value, events: value.events.includes(event) ? value.events.filter((item) => item !== event) : [...value.events, event] }));
  return <section className="space-y-4 rounded-xl border bg-background p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><Webhook className="h-4 w-4" />Webhooks de cuentas</h3><p className="text-sm text-muted-foreground">Notificaciones HTTPS firmadas. La clave nunca vuelve a mostrarse y las direcciones privadas están bloqueadas.</p></div>
    <div className="grid gap-2 md:grid-cols-2"><Input type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://automatizacion.example/webhook" aria-label="URL del webhook" /><Input type="password" value={draft.secret} onChange={(event) => setDraft({ ...draft, secret: event.target.value })} placeholder="Secreto HMAC (mínimo 16 caracteres)" aria-label="Secreto del webhook" /></div>
    <div className="flex flex-wrap gap-3">{events.map((event) => <label key={event} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.events.includes(event)} onChange={() => toggleEvent(event)} />{LABELS[event] || event}</label>)}</div>
    <Button size="sm" disabled={busy} onClick={create}><BellRing className="mr-2 h-4 w-4" />Crear webhook</Button>
    <div className="space-y-2">{webhooks.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.url}</p><div className="mt-1 flex flex-wrap gap-1">{item.events.map((event) => <Badge key={event} variant="outline">{LABELS[event] || event}</Badge>)}<Badge variant={item.enabled ? 'default' : 'secondary'}>{item.enabled ? 'Activo' : 'Pausado'}</Badge></div>{item.last_delivery && <small className="text-muted-foreground">Último envío: {item.last_delivery.status || item.last_delivery.error} · {new Date(item.last_delivery.at).toLocaleString()}</small>}</div><div className="flex gap-1"><Button size="icon" variant="outline" title="Probar" disabled={busy} onClick={() => act({ action: 'test', webhook_id: item.id }, 'Prueba enviada')}><FlaskConical className="h-4 w-4" /></Button><Button size="icon" variant="outline" title={item.enabled ? 'Pausar' : 'Activar'} disabled={busy} onClick={() => act({ action: 'toggle', webhook_id: item.id, enabled: !item.enabled }, item.enabled ? 'Webhook pausado' : 'Webhook activado')}><Power className="h-4 w-4" /></Button><Button size="icon" variant="destructive" title="Eliminar" disabled={busy} onClick={() => confirm('¿Eliminar este webhook?') && act({ action: 'delete', webhook_id: item.id }, 'Webhook eliminado')}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!webhooks.length && <p className="text-sm text-muted-foreground">No hay webhooks configurados.</p>}</div>
  </section>;
};

export default AccountWebhooksPanel;
