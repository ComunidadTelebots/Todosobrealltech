import React, { useCallback, useEffect, useState } from 'react';
import { FlaskConical, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AccountTemplatesSandboxPanel = ({ users }) => {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [frozen, setFrozen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [preview, setPreview] = useState(null);
  const [sandbox, setSandbox] = useState(null);
  const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
  const load = useCallback(async () => { const response = await apiServerClient.fetch('/moonbot-admin/account-tools/templates', { headers }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setTemplates(data.templates || []); }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => { if (!accountId && users[0]?.id) setAccountId(users[0].id); }, [users, accountId]);
  const call = async (path, body) => { setBusy(true); try { const response = await apiServerClient.fetch(path, { method: 'POST', headers, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo completar la simulación'); return data; } finally { setBusy(false); } };
  const create = async () => { try { const data = await call('/moonbot-admin/account-tools/templates', { action: 'create', name, config: { role, is_frozen: frozen } }); setTemplates(data.templates); setName(''); toast.success('Plantilla versionada creada'); } catch (error) { toast.error(error.message); } };
  const previewTemplate = async () => { try { const data = await call('/moonbot-admin/account-tools/templates', { action: 'preview', template_id: templateId, account_id: accountId }); setPreview(data.preview); } catch (error) { toast.error(error.message); } };
  const runSandbox = async () => { try { const data = await call('/moonbot-admin/account-tools/sandbox', { account_ids: [accountId], changes: { role, is_frozen: frozen } }); setSandbox(data.result); } catch (error) { toast.error(error.message); } };
  return <section className="grid gap-4 rounded-xl border bg-background p-4 xl:grid-cols-2">
    <div className="space-y-3"><h3 className="flex items-center gap-2 font-semibold"><LayoutTemplate className="h-4 w-4" />Plantillas versionadas</h3><p className="text-xs text-muted-foreground">Guarda configuraciones reutilizables y comprueba sus diferencias antes de cualquier acción.</p><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la plantilla" /><div className="grid grid-cols-2 gap-2"><select className="h-10 rounded border bg-background px-2" value={role} onChange={(event) => setRole(event.target.value)}>{['user', 'moderator', 'admin', 'creator'].map((item) => <option key={item}>{item}</option>)}</select><label className="flex items-center justify-between rounded border px-3 text-sm">Congelada<input type="checkbox" checked={frozen} onChange={(event) => setFrozen(event.target.checked)} /></label></div><Button size="sm" disabled={busy || !name} onClick={create}>Guardar plantilla</Button><div className="flex flex-wrap gap-1">{templates.map((item) => <Badge key={item.id} variant="outline">{item.name} · v{item.current_version}</Badge>)}</div><div className="grid gap-2 sm:grid-cols-2"><select className="h-10 rounded border bg-background px-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Selecciona plantilla</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="h-10 rounded border bg-background px-2" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecciona cuenta</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name || item.email || item.id}</option>)}</select></div><Button size="sm" variant="outline" disabled={busy || !templateId || !accountId} onClick={previewTemplate}>Vista previa</Button>{preview && <pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(preview.changes, null, 2)}</pre>}</div>
    <div className="space-y-3"><h3 className="flex items-center gap-2 font-semibold"><FlaskConical className="h-4 w-4" />Sandbox sin efectos</h3><p className="text-xs text-muted-foreground">Simula rol y congelación sobre una copia. Nunca escribe en PocketBase ni ejecuta acciones.</p><Button size="sm" variant="outline" disabled={busy || !accountId} onClick={runSandbox}>Simular configuración actual</Button>{sandbox && <div className="space-y-2"><p className="text-sm"><b>{sandbox.affected_accounts}</b> cuenta(s) afectadas · <b>{sandbox.total_risks}</b> riesgos · aplicado: no</p>{sandbox.simulations?.flatMap((item) => item.risks).map((risk, index) => <Badge key={`${risk.code}-${index}`} variant={risk.level === 'critical' ? 'destructive' : 'outline'}>{risk.level} · {risk.code}</Badge>)}<pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(sandbox.simulations?.[0]?.diff || [], null, 2)}</pre></div>}</div>
  </section>;
};

export default AccountTemplatesSandboxPanel;
