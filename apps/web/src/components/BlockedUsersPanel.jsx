import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, DownloadCloud, Trash2, ShieldAlert, Loader2, CheckCircle2, XCircle, FileText, UploadCloud, History, RefreshCw, AlertCircle, HelpCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const BlockedUsersPanel = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [registrySource, setRegistrySource] = useState('all');
  const [registryStats, setRegistryStats] = useState({ cas: 0, moonbot: 0, global: 0, local: 0, web: 0 });
  const [globalCaptcha, setGlobalCaptcha] = useState({ status: 'idle', percentage: 0 });
  const [globalCaptchaSettings, setGlobalCaptchaSettings] = useState({
    enabled: true, channel: 'TodoSobreAllTech', channels: ['TodoSobreAllTech'], suggested_channels: [], strict_enforcement: false, reverify_interval_hours: 12,
  });
  const globalCaptchaSettingsDirty = useRef(false);
  const [globalCaptchaBusy, setGlobalCaptchaBusy] = useState(false);
  const [globalChannelSearch, setGlobalChannelSearch] = useState('');
  
  // Status State
  const [importStatus, setImportStatus] = useState({
    cas_available: true,
    csv_available: true,
    json_available: true,
    manual_available: true
  });
  const [statusLoading, setStatusLoading] = useState(false);

  // Import State
  const [importSource, setImportSource] = useState('manual');
  const [fileData, setFileData] = useState('');
  const [fileName, setFileName] = useState('');
  const [manualData, setManualData] = useState({ user_id: '', username: '', reason: '' });
  
  // Validation & Preview State
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [localValidationError, setLocalValidationError] = useState(null);
  const [previewData, setPreviewData] = useState([]);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/status');
      if (response.ok) {
        const data = await response.json();
        setImportStatus(data);
        
        // If currently selected source is CAS and it's unavailable, switch to manual
        if (importSource === 'cas' && !data.cas_available) {
          setImportSource('manual');
        }
      }
    } catch (error) {
      console.error('Error fetching import status:', error);
      setImportStatus({
        cas_available: false,
        csv_available: true,
        json_available: true,
        manual_available: true
      });
      if (importSource === 'cas') setImportSource('manual');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchBlockedUsers = async (query = searchQuery, source = registrySource) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ q: query, source, page: '1', per_page: '100' });
      const response = await apiServerClient.fetch(`/blocked-users?${params}`);
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el directorio');
      setUsers(data.records || []);
      setRegistryStats(data.stats || {});
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
      toast.error('No se pudo cargar la lista de bloqueos web');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBlockedUsers();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => fetchBlockedUsers(searchQuery, registrySource), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, registrySource]);
  const fetchGlobalCaptcha = async () => {
    try {
      const response = await apiServerClient.fetch('/blocked-users/captcha-global');
      const data = await apiServerClient.readJson(response);
      if (response.ok) {
        setGlobalCaptcha(data.campaign || {});
        if (data.settings && !globalCaptchaSettingsDirty.current) setGlobalCaptchaSettings({
          ...data.settings,
          channels: data.settings.channels || (data.settings.channel ? [data.settings.channel] : []),
        });
      }
    } catch { /* El panel conserva el último estado conocido. */ }
  };
  useEffect(() => {
    if (!['admin', 'creator'].includes(currentUser?.role)) return undefined;
    fetchGlobalCaptcha();
    const timer = setInterval(fetchGlobalCaptcha, 5000);
    return () => clearInterval(timer);
  }, [currentUser?.role]);
  const controlGlobalCaptcha = async (action) => {
    if (action === 'start' && !window.confirm('Se silenciará en todos los grupos a los usuarios conocidos que aún no hayan superado el captcha. Se comprobarán CAS y canales obligatorios. ¿Continuar?')) return;
    setGlobalCaptchaBusy(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/captcha-global', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo controlar la campaña');
      setGlobalCaptcha(data.campaign || {});
      toast.success(action === 'start' ? 'Reverificación global iniciada' : 'Cancelación solicitada');
    } catch (error) { toast.error(error.message); } finally { setGlobalCaptchaBusy(false); }
  };
  const saveGlobalCaptchaSettings = async () => {
    const channels = [...new Set((globalCaptchaSettings.channels || []).map((value) => String(value || '').trim().replace(/^@/, '')).filter(Boolean))].slice(0, 10);
    if (globalCaptchaSettings.enabled && !channels.length) return toast.error('Configura al menos un canal obligatorio');
    setGlobalCaptchaBusy(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/captcha-global', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          action: 'settings', ...globalCaptchaSettings, channels, channel: channels[0] || '',
          reverify_interval_hours: Math.max(0, Math.min(2160, Number(globalCaptchaSettings.reverify_interval_hours) || 0)),
        }) });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración global');
      setGlobalCaptcha(data.campaign || globalCaptcha);
      setGlobalCaptchaSettings(data.settings || globalCaptchaSettings);
      globalCaptchaSettingsDirty.current = false;
      toast.success('Acceso global actualizado');
    } catch (error) { toast.error(error.message); } finally { setGlobalCaptchaBusy(false); }
  };
  const toggleGlobalChannel = (channel) => {
    const clean = String(channel || '').trim().replace(/^@/, '');
    if (!clean) return;
    globalCaptchaSettingsDirty.current = true;
    setGlobalCaptchaSettings((value) => {
      const channels = value.channels || (value.channel ? [value.channel] : []);
      const exists = channels.some((item) => item.toLowerCase() === clean.toLowerCase());
      const next = exists ? channels.filter((item) => item.toLowerCase() !== clean.toLowerCase()) : [...channels, clean].slice(0, 10);
      return { ...value, channels: next, channel: next[0] || '' };
    });
  };

  const validateLocalData = (text, source) => {
    setLocalValidationError(null);
    setPreviewData([]);
    setValidationResult(null);

    try {
      if (source === 'csv') {
        const lines = text.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) throw new Error('El archivo CSV está vacío.');
        
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        if (!headers.includes('user_id') || !headers.includes('username') || !headers.includes('reason')) {
          throw new Error('Formato CSV inválido. Asegúrate de que tenga las columnas: user_id, username, reason');
        }

        // Generate preview
        const preview = lines.slice(1, 6).map(line => {
          const [user_id, username, reason] = line.split(',').map(v => v.trim());
          return { user_id, username, reason };
        });
        setPreviewData(preview);

      } else if (source === 'json') {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('Formato JSON inválido. Debe ser un array de objetos.');
        }
        if (data.length > 0) {
          const firstItem = data[0];
          if (!firstItem.user_id && !firstItem.id) {
            throw new Error('Formato JSON inválido. Los objetos deben contener el campo user_id o id.');
          }
        }
        setPreviewData(data.slice(0, 5));
      }
    } catch (error) {
      setLocalValidationError(error.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setFileData(text);
      validateLocalData(text, importSource);
    };
    reader.readAsText(file);
  };

  const handleSourceChange = (val) => {
    if (val === 'cas' && !importStatus.cas_available) {
      toast.error('Esta fuente no está disponible en este momento. Por favor, intenta más tarde o usa otra opción.');
      return;
    }
    setImportSource(val);
    setValidationResult(null);
    setLocalValidationError(null);
    setPreviewData([]);
    setFileData('');
    setFileName('');
    setManualData({ user_id: '', username: '', reason: '' });
  };

  const handleValidate = async () => {
    if (localValidationError) {
      toast.error('Por favor, corrige los errores de formato antes de validar.');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      let testData = null;
      if (importSource === 'csv' || importSource === 'json') {
        if (!fileData) throw new Error('Please select a file first');
        testData = fileData;
      } else if (importSource === 'manual') {
        if (!manualData.user_id) throw new Error('El ID de la cuenta es obligatorio');
        testData = manualData;
      }

      const response = await apiServerClient.fetch('/blocked-users/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: importSource, testData })
      });
      
      const data = await response.json();
      setValidationResult(data);
      
      if (data.isValid) {
        toast.success('Validation successful. Ready to import.');
      } else {
        toast.error('Validation failed. Check the details.');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error(error.message || 'Validation request failed');
      setValidationResult({ isValid: false, message: error.message });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (localValidationError) {
      toast.error('Por favor, corrige los errores de formato antes de importar.');
      return;
    }

    if (!validationResult?.isValid && importSource !== 'cas') {
      toast.error('Please validate the data successfully before importing');
      return;
    }

    setIsImporting(true);
    try {
      let response;
      
      if (importSource === 'cas') {
        response = await apiServerClient.fetch('/blocked-users/import', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'cas' })
        });
      } else {
        const payloadData = importSource === 'manual' ? manualData : fileData;
        response = await apiServerClient.fetch('/blocked-users/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: importSource, data: payloadData })
        });
      }
      
      const data = await response.json();

      if (!response.ok || data.available === false) {
        throw new Error(data.message || data.error || 'Import failed');
      }
      
      // Show detailed results
      const importedCount = data.imported !== undefined ? data.imported : (data.added || 0);
      const duplicatesCount = data.duplicates || 0;
      const errorsCount = data.errors?.length || data.errors || 0;
      
      toast.success(`Import complete: ${importedCount} added, ${duplicatesCount} duplicates.`);
      
      if (errorsCount > 0) {
        toast.warning(`${errorsCount} errors occurred during import. Check logs for details.`);
      }

      // Reset form
      setValidationResult(null);
      setLocalValidationError(null);
      setPreviewData([]);
      setFileData('');
      setFileName('');
      if (importSource === 'manual') {
        setManualData({ user_id: '', username: '', reason: '' });
      }
      
      fetchBlockedUsers();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import blocked users');
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await apiServerClient.fetch(`/blocked-users/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!response.ok) throw new Error('update_failed');
      
      setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      toast.success(`Bloqueo ${!currentStatus ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Quieres retirar este bloqueo de acceso web?')) return;
    
    try {
      const response = await apiServerClient.fetch(`/blocked-users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete_failed');
      setUsers(users.filter(u => u.id !== id));
      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const scrollToLogs = () => {
    const logsSection = document.getElementById('import-logs-section');
    if (logsSection) {
      logsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredUsers = users.filter(u => 
    String(u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(u.user_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.source && u.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const globalVerificationSummary = ['admin', 'creator'].includes(currentUser?.role) ? <Card className={globalCaptcha.all_verified ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-rose-400/50 bg-rose-500/5'}><CardContent className="pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{globalCaptcha.all_verified ? <CheckCircle2 className="h-8 w-8 text-emerald-600"/> : <XCircle className="h-8 w-8 text-rose-600"/>}<div><h3 className="font-bold">{globalCaptcha.all_verified ? 'Todos los usuarios verificados' : 'Quedan usuarios sin verificar'}</h3><p className="text-sm text-muted-foreground">{globalCaptcha.verified_users || 0} verificados · {globalCaptcha.unverified_users || 0} no verificados</p></div></div><Badge variant={globalCaptcha.all_verified ? 'default' : 'destructive'}>{globalCaptcha.all_verified ? 'VERIFICADO' : 'NO VERIFICADO'}</Badge></div><div className="mt-4 max-h-72 overflow-auto rounded-lg border bg-background/80 p-3"><h4 className="font-semibold">Verificación individual del captcha global</h4><div className="mt-2 grid gap-2 md:grid-cols-2">{(globalCaptcha.user_details || []).map((user) => <div key={`verify:${user.group_id}:${user.user_id}`} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs"><div className="min-w-0"><b className="block truncate">{user.name}</b><span className="block truncate text-muted-foreground">{user.group_name} · {user.user_id}</span></div><Badge variant={user.verified ? 'default' : 'destructive'} className="shrink-0">{user.verified ? '✓ Sí' : '✕ No'}</Badge></div>)}{!(globalCaptcha.user_details || []).length && <p className="text-sm text-muted-foreground">Inicia una comprobación para crear el inventario.</p>}</div>{globalCaptcha.users_truncated && <p className="mt-2 text-xs text-amber-700">Se muestran los primeros 500 usuarios.</p>}</div></CardContent></Card> : null;

  return (
    <div className="space-y-6">
      {globalVerificationSummary}
      {['admin', 'creator'].includes(currentUser?.role) && <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600"/>Captcha global de usuarios pendientes</CardTitle><CardDescription>Control master independiente de cada grupo. Solo procesa usuarios conocidos que aún no lo superaron y aplica mute de Telegram, captcha, CAS, canales obligatorios y apelación.</CardDescription></CardHeader>
        {currentUser?.role === 'creator' ? <CardContent className="space-y-4 border-b pb-5">
          {(globalCaptchaSettings.channels || []).length > 0 && <section className="overflow-hidden rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-4 text-white shadow-lg">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-white/20 p-3"><Send className="h-6 w-6"/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">Comunidades globales asignadas</p><h3 className="text-xl font-bold">{globalCaptchaSettings.channels.length} canales obligatorios</h3><p className="text-sm text-cyan-50">Todos se comprobarán en cada grupo junto con sus canales locales.</p></div></div>
            <div className="mt-4 grid gap-2">{globalCaptchaSettings.channels.map((channel) => { const info = (globalCaptchaSettings.suggested_channels || []).find((item) => item.channel.toLowerCase() === channel.toLowerCase()); return <div key={channel} className="flex items-center justify-between gap-3 rounded-xl bg-white/15 p-3"><div className="flex min-w-0 items-center gap-3">{info?.photo_url ? <img src={info.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" loading="lazy"/> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20"><Send className="h-5 w-5"/></span>}<div className="min-w-0"><b className="block truncate">{info?.title || `@${channel}`}</b><a className="block truncate text-sm text-cyan-50" href={channel.startsWith('-100') ? undefined : `https://t.me/${channel}`} target="_blank" rel="noreferrer">@{channel}{info?.bots?.length ? ` · ${info.bots.map((bot) => `@${bot.username}`).join(' · ')}` : ''}</a></div></div><Button type="button" size="sm" variant="secondary" onClick={() => toggleGlobalChannel(channel)}>Quitar</Button></div>; })}</div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge className="bg-white/20 text-white hover:bg-white/20">{globalCaptchaSettings.enabled ? 'Suscripción obligatoria activa' : 'Asignada, pero desactivada'}</Badge><Badge className="bg-white/20 text-white hover:bg-white/20">{globalCaptchaSettings.strict_enforcement ? 'Nivel estricto' : 'Nivel estándar'}</Badge><Badge className="bg-white/20 text-white hover:bg-white/20">{globalCaptchaSettings.reverify_interval_hours ? `Revisión cada ${globalCaptchaSettings.reverify_interval_hours} horas` : 'Sin revisión periódica'}</Badge></div>
          </section>}
          <details className="rounded-xl border bg-background/70 p-3 text-sm"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><HelpCircle className="h-4 w-4"/> ¿Qué significa cada ajuste y nivel?</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground"><li><b>Canal global:</b> canal que se exige en todos los grupos; se suma al canal local de cada grupo.</li><li><b>Reverificar:</b> vuelve a comprobar periódicamente a los usuarios conocidos. El valor 0 lo desactiva.</li><li><b>Nivel estándar:</b> aplica captcha, CAS, canales obligatorios y mute durante el acceso.</li><li><b>Nivel estricto:</b> además reaplica el mute y reenvía el captcha cuando un pendiente intenta escribir.</li><li><b>Dificultad del reto:</b> es adaptativa; Moonbot rota iconos, secuencias, formas y cálculo, y aumenta la dificultad tras los fallos.</li></ul></details>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2"><Label htmlFor="global-required-channel" className="flex items-center gap-1">Añadir canales globales <HelpCircle className="h-3.5 w-3.5" title="Admite hasta 10 canales; sepáralos con comas"/></Label><Input id="global-required-channel" placeholder="@canal_uno, @canal_dos" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.value.split(',').forEach(toggleGlobalChannel); event.currentTarget.value = ''; } }}/><p className="text-xs text-muted-foreground">Escribe uno o varios y pulsa Enter.</p></div>
            <div className="space-y-2"><Label htmlFor="global-reverify-hours" className="flex items-center gap-1">Reverificar cada (horas) <HelpCircle className="h-3.5 w-3.5" title="Periodicidad global; por defecto se comprueba cada 12 horas"/></Label><Input id="global-reverify-hours" type="number" min="1" max="2160" value={globalCaptchaSettings.reverify_interval_hours || 12} onChange={(event) => { globalCaptchaSettingsDirty.current = true; setGlobalCaptchaSettings((value) => ({ ...value, reverify_interval_hours: event.target.value })); }}/><p className="text-xs text-muted-foreground">Valor predeterminado: 12 horas.</p></div>
            <div className="flex items-center gap-3"><Switch id="global-channel-enabled" checked={Boolean(globalCaptchaSettings.enabled)} onCheckedChange={(checked) => { globalCaptchaSettingsDirty.current = true; setGlobalCaptchaSettings((value) => ({ ...value, enabled: checked })); }}/><Label htmlFor="global-channel-enabled" className="flex items-center gap-1">Exigir suscripción global <HelpCircle className="h-3.5 w-3.5" title="Obliga a pertenecer al canal antes de aprobar el acceso"/></Label></div>
            <div className="flex flex-col justify-center gap-3"><div className="flex items-center gap-3"><Switch id="global-strict-enabled" checked={Boolean(globalCaptchaSettings.strict_enforcement)} onCheckedChange={(checked) => { globalCaptchaSettingsDirty.current = true; setGlobalCaptchaSettings((value) => ({ ...value, strict_enforcement: checked })); }}/><Label htmlFor="global-strict-enabled" className="flex items-center gap-1">Nivel estricto global <HelpCircle className="h-3.5 w-3.5" title="Reaplica mute y captcha si un pendiente intenta escribir"/></Label></div><Button onClick={saveGlobalCaptchaSettings} disabled={globalCaptchaBusy}>Guardar ajuste global</Button></div>
          </div>
          <section className="space-y-2"><div><h3 className="font-semibold">Canales recomendados</h3><p className="text-xs text-muted-foreground">Moonbot muestra canales donde está unido y retira automáticamente los que presentan contenido de alto riesgo.</p></div><div className="flex gap-2"><Input value={globalChannelSearch} onChange={(event) => setGlobalChannelSearch(event.target.value)} placeholder="Buscar por nombre, @usuario o ID del canal"/><Button type="button" onClick={() => document.getElementById('global-required-channel')?.focus()}>+ Añadir canal</Button></div><div className="grid gap-2">{(globalCaptchaSettings.suggested_channels || []).filter((item) => `${item.title} ${item.username} ${item.chat_id}`.toLowerCase().includes(globalChannelSearch.toLowerCase())).map((item) => { const selected = (globalCaptchaSettings.channels || []).some((channel) => channel.toLowerCase() === item.channel.toLowerCase()); return <div key={item.channel} className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-cyan-500 bg-cyan-500/10' : 'hover:border-cyan-400 hover:bg-muted/60'}`}><div className="flex min-w-0 flex-1 items-center gap-3">{item.photo_url ? <img src={item.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy"/> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-500/10"><Send className="h-5 w-5 text-cyan-600"/></span>}<div className="min-w-0"><b className="block truncate">{item.title}</b><p className="truncate text-xs text-muted-foreground">{item.username ? `@${item.username}` : item.chat_id} · {(item.bots || []).map((bot) => `@${bot.username}`).join(' · ')}</p><p className="text-[11px] text-muted-foreground">{item.content_review?.messages_analyzed ? `${item.content_review.messages_analyzed} mensajes analizados · riesgo ${item.content_review.score}/100` : 'Análisis pendiente: todavía no hay contenido observado'}</p></div></div><div className="flex shrink-0 gap-2">{item.join_bot_url ? <Button type="button" variant="outline" size="sm" asChild><a href={item.join_bot_url} target="_blank" rel="noreferrer">Unir @{item.join_bot?.username}</a></Button> : <Badge variant="outline" className="self-center text-emerald-700">Bots unidos</Badge>}<Button type="button" size="sm" variant={selected ? 'secondary' : 'default'} onClick={() => toggleGlobalChannel(item.channel)}>{selected ? 'Quitar' : '+ Añadir'}</Button></div></div>; })}{!(globalCaptchaSettings.suggested_channels || []).length && <p className="text-sm text-muted-foreground">No se detectaron canales candidatos seguros administrados por los bots.</p>}</div></section>
        </CardContent> : <CardContent className="border-b pb-5"><Alert><ShieldAlert className="h-4 w-4"/><AlertTitle>Información de solo lectura</AlertTitle><AlertDescription>Tu rol puede consultar el estado del captcha. Los canales, la periodicidad y las campañas globales solo puede modificarlos el master.</AlertDescription></Alert><div className="mt-3 flex flex-wrap gap-3 text-sm"><Badge variant={globalCaptchaSettings.enabled ? 'default' : 'outline'}>{globalCaptchaSettings.enabled ? 'Canales globales activos' : 'Canales globales desactivados'}</Badge>{(globalCaptchaSettings.channels || (globalCaptchaSettings.channel ? [globalCaptchaSettings.channel] : [])).map((channel) => <Badge key={channel} variant="outline">@{channel}</Badge>)}<span>Periodicidad: {globalCaptchaSettings.reverify_interval_hours ? `${globalCaptchaSettings.reverify_interval_hours} horas` : 'desactivada'}</span></div></CardContent>}
        <CardContent className="space-y-3"><div className="flex flex-wrap gap-4 text-sm"><span><b>{globalCaptcha.processed || 0}</b>/{globalCaptcha.total || 0} solicitudes</span><span>{globalCaptcha.groups || 0} grupos</span><span>{globalCaptcha.private_sent || 0} privados entregados</span><span>{globalCaptcha.private_blocked || 0} privados bloqueados</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(globalCaptcha.percentage || 0)))}%` }}/></div><div className="flex flex-wrap items-center justify-between gap-2"><b>{Number(globalCaptcha.percentage || 0).toLocaleString('es-ES')}% procesado</b>{currentUser?.role === 'creator' && <div className="flex gap-2"><Button variant="destructive" disabled={globalCaptchaBusy || globalCaptcha.status === 'running'} onClick={() => controlGlobalCaptcha('start')}>Iniciar captcha para pendientes</Button>{globalCaptcha.status === 'running' && <Button variant="outline" disabled={globalCaptchaBusy} onClick={() => controlGlobalCaptcha('cancel')}>Cancelar</Button>}</div>}</div></CardContent>
        <CardContent className="grid gap-4 border-t pt-4 xl:grid-cols-2"><section className="max-h-72 overflow-auto rounded-lg border bg-background/70 p-3"><h4 className="font-semibold">Estado guardado por grupo</h4><p className="mb-2 text-xs text-muted-foreground">{globalCaptcha.total_remaining || 0} usuarios pendientes. El estado permanece en Moonbot aunque cierres el navegador.</p><div className="space-y-2">{(globalCaptcha.group_details || []).map((group) => <div key={group.group_id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs"><span className="truncate">{group.name}</span><span>{group.processed}/{group.total} · {group.remaining} pendientes · {group.status}</span></div>)}{!(globalCaptcha.group_details || []).length && <p className="text-sm text-muted-foreground">Todavía no hay una campaña guardada.</p>}</div></section><aside className="max-h-72 overflow-auto rounded-lg border bg-background/80 p-3"><h4 className="font-semibold">Usuarios restantes y protocolos</h4><div className="mt-2 space-y-2">{(globalCaptcha.remaining_users || []).map((user) => <div key={`${user.group_id}:${user.user_id}`} className="rounded-lg border p-2 text-xs"><div className="flex justify-between gap-2"><b>{user.name}</b><code>{user.user_id}</code></div><p className="truncate text-muted-foreground">{user.group_name}</p><div className="mt-2 flex flex-wrap gap-1">{Object.entries(user.protocols || {}).map(([name, status]) => <Badge key={name} variant={status === 'passed' || status === 'applied' || status === 'not_required' ? 'default' : status === 'flagged' || status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">{name}: {status}</Badge>)}</div></div>)}{!(globalCaptcha.remaining_users || []).length && <p className="text-sm text-muted-foreground">No quedan usuarios pendientes.</p>}{globalCaptcha.remaining_truncated && <p className="text-xs text-amber-700">Se muestran los primeros 250; el contador incluye todos.</p>}</div></aside></CardContent>
      </Card>}
      {/* Import Section */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DownloadCloud className="w-5 h-5 text-primary" />
                Bloquear cuentas web
              </CardTitle>
              <CardDescription>Restringe el acceso a TodoSobreAllTech. CAS y los GBAN se administran en Seguridad de Moonbot.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={scrollToLogs}>
              <History className="w-4 h-4 mr-2" />
              View Import Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Import Source</Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchStatus} disabled={statusLoading} title="Refresh availability">
                    <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <Select value={importSource} onValueChange={handleSourceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="json">JSON File</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {importSource === 'csv' && "Upload a CSV file with headers: user_id, username, reason."}
                  {importSource === 'json' && "Upload a JSON array of user objects."}
                  {importSource === 'manual' && "Manually enter a single user to block."}
                </p>
              </div>
            </div>

            <div className="md:col-span-8">
              {/* Dynamic Input Area */}
              <div className="min-h-[120px] flex flex-col justify-center">
                {importSource === 'cas' && (
                  <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                    <div className="text-center">
                      <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Ready to sync with CAS API</p>
                      <p className="text-xs text-muted-foreground">Click Validate to test connection, or Import to sync directly.</p>
                    </div>
                  </div>
                )}

                {(importSource === 'csv' || importSource === 'json') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">{importSource} files only</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" accept={importSource === 'csv' ? '.csv' : '.json'} onChange={handleFileChange} />
                      </label>
                    </div>
                    
                    {fileName && (
                      <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded-md">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium truncate">{fileName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {localValidationError ? 'Format Error' : 'Ready for validation'}
                        </span>
                      </div>
                    )}

                    {/* Local Validation Error */}
                    {localValidationError && (
                      <Alert variant="destructive" className="bg-destructive/10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Formato</AlertTitle>
                        <AlertDescription>{localValidationError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Data Preview */}
                    {previewData.length > 0 && !localValidationError && (
                      <div className="mt-4 border rounded-md overflow-hidden">
                        <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                          Data Preview (First {previewData.length} rows)
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-xs">User ID</TableHead>
                              <TableHead className="h-8 text-xs">Username</TableHead>
                              <TableHead className="h-8 text-xs">Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="py-2 text-xs font-mono">{row.user_id || row.id || '-'}</TableCell>
                                <TableCell className="py-2 text-xs">{row.username || '-'}</TableCell>
                                <TableCell className="py-2 text-xs truncate max-w-[150px]">{row.reason || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {importSource === 'manual' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="m_user_id">ID de cuenta web *</Label>
                      <Input id="m_user_id" value={manualData.user_id} onChange={e => setManualData({...manualData, user_id: e.target.value})} placeholder="ID de PocketBase" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m_username">Nombre o correo</Label>
                      <Input id="m_username" value={manualData.username} onChange={e => setManualData({...manualData, username: e.target.value})} placeholder="Referencia opcional" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m_reason">Motivo</Label>
                      <Input id="m_reason" value={manualData.reason} onChange={e => setManualData({...manualData, reason: e.target.value})} placeholder="Motivo del bloqueo" />
                    </div>
                  </div>
                )}
              </div>

              {/* Server Validation Results */}
              {validationResult && !localValidationError && (
                <Alert className={`mt-4 ${validationResult.isValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                  {validationResult.isValid ? <CheckCircle2 className="h-4 w-4 !text-emerald-600" /> : <XCircle className="h-4 w-4 !text-destructive" />}
                  <AlertTitle>{validationResult.isValid ? 'Validation Passed' : 'Validation Failed'}</AlertTitle>
                  <AlertDescription className="mt-1">
                    {validationResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={handleValidate} 
            disabled={isValidating || isImporting || !!localValidationError || ((importSource === 'csv' || importSource === 'json') && !fileData)}
          >
            {isValidating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Validar datos
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isValidating || !!localValidationError || (!validationResult?.isValid && importSource !== 'cas')}
          >
            {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aplicar bloqueo
          </Button>
        </CardFooter>
      </Card>

      {/* Blocked Users List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Directorio unificado de bloqueos
            </CardTitle>
            <CardDescription>Usuarios detectados por CAS mediante Moonbot, GBAN, baneos locales y bloqueos de acceso web.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            {[['CAS detectados', registryStats.cas], ['Moonbot', registryStats.moonbot], ['Globales', registryStats.global], ['Locales', registryStats.local], ['Web', registryStats.web]].map(([label, value]) => <div key={label} className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><b className="text-xl">{Number(value || 0).toLocaleString('es-ES')}</b></div>)}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre, ID u origen…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={registrySource} onValueChange={setRegistrySource}><SelectTrigger className="w-[190px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos los registros</SelectItem><SelectItem value="cas">Detectados por CAS</SelectItem><SelectItem value="moonbot">Otros de Moonbot</SelectItem><SelectItem value="web">Bloqueos web</SelectItem></SelectContent></Select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Cargando registros de seguridad…
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-lg font-medium text-foreground">No hay cuentas web bloqueadas</p>
                      <p className="text-sm text-muted-foreground">El directorio está vacío o no coincide con la búsqueda.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60 bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username || `Usuario ${user.user_id}`}</span>
                          <span className="text-xs text-muted-foreground font-mono">{user.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate" title={user.reason}>
                        {user.reason || <span className="text-muted-foreground italic">Sin motivo registrado</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          user.source === 'api' || user.import_source === 'cas' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 
                          user.import_source === 'manual' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                          'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        }>
                          {user.import_source || user.source || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.imported_date || user.created || user.timestamp ? new Date(user.imported_date || user.created || user.timestamp).toLocaleDateString('es-ES') : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.registry === 'web' ? <Switch checked={user.is_active} onCheckedChange={() => handleToggleActive(user.id, user.is_active)}/> : <Badge variant="outline">{user.status || 'active'}</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.registry === 'web' && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockedUsersPanel;
