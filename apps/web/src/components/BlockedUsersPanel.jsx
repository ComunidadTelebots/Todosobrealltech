import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, DownloadCloud, Trash2, ShieldAlert, Loader2, CheckCircle2, XCircle, FileText, UploadCloud, History, RefreshCw, AlertCircle } from 'lucide-react';
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
    enabled: false, channel: '', strict_enforcement: false, reverify_interval_days: 0,
  });
  const [globalCaptchaBusy, setGlobalCaptchaBusy] = useState(false);
  
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
        if (data.settings) setGlobalCaptchaSettings(data.settings);
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
    const channel = String(globalCaptchaSettings.channel || '').trim().replace(/^@/, '');
    if (globalCaptchaSettings.enabled && !channel) return toast.error('Configura primero el canal obligatorio');
    setGlobalCaptchaBusy(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/captcha-global', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          action: 'settings', ...globalCaptchaSettings, channel,
          reverify_interval_days: Math.max(0, Math.min(90, Number(globalCaptchaSettings.reverify_interval_days) || 0)),
        }) });
      const data = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración global');
      setGlobalCaptcha(data.campaign || globalCaptcha);
      setGlobalCaptchaSettings(data.settings || globalCaptchaSettings);
      toast.success('Acceso global actualizado');
    } catch (error) { toast.error(error.message); } finally { setGlobalCaptchaBusy(false); }
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

  return (
    <div className="space-y-6">
      {['admin', 'creator'].includes(currentUser?.role) && <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600"/>Captcha global de usuarios pendientes</CardTitle><CardDescription>Control master independiente de cada grupo. Solo procesa usuarios conocidos que aún no lo superaron y aplica mute de Telegram, captcha, CAS, canales obligatorios y apelación.</CardDescription></CardHeader>
        {currentUser?.role === 'creator' ? <CardContent className="grid gap-4 border-b pb-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="global-required-channel">Canal obligatorio global</Label><Input id="global-required-channel" placeholder="@canal_general" value={globalCaptchaSettings.channel ? `@${String(globalCaptchaSettings.channel).replace(/^@/, '')}` : ''} onChange={(event) => setGlobalCaptchaSettings((value) => ({ ...value, channel: event.target.value.replace(/^@/, '') }))}/><p className="text-xs text-muted-foreground">Se suma al canal local configurado por cada grupo.</p></div>
          <div className="space-y-2"><Label htmlFor="global-reverify-days">Reverificar cada (días)</Label><Input id="global-reverify-days" type="number" min="0" max="90" value={globalCaptchaSettings.reverify_interval_days || 0} onChange={(event) => setGlobalCaptchaSettings((value) => ({ ...value, reverify_interval_days: event.target.value }))}/><p className="text-xs text-muted-foreground">0 desactiva la programación global.</p></div>
          <div className="flex items-center gap-3"><Switch id="global-channel-enabled" checked={Boolean(globalCaptchaSettings.enabled)} onCheckedChange={(checked) => setGlobalCaptchaSettings((value) => ({ ...value, enabled: checked }))}/><Label htmlFor="global-channel-enabled">Exigir suscripción global</Label></div>
          <div className="flex flex-col justify-center gap-3"><div className="flex items-center gap-3"><Switch id="global-strict-enabled" checked={Boolean(globalCaptchaSettings.strict_enforcement)} onCheckedChange={(checked) => setGlobalCaptchaSettings((value) => ({ ...value, strict_enforcement: checked }))}/><Label htmlFor="global-strict-enabled">Captcha estricto global</Label></div><Button onClick={saveGlobalCaptchaSettings} disabled={globalCaptchaBusy}>Guardar ajuste global</Button></div>
        </CardContent> : <CardContent className="border-b pb-5"><Alert><ShieldAlert className="h-4 w-4"/><AlertTitle>Información de solo lectura</AlertTitle><AlertDescription>Tu rol puede consultar el estado del captcha. El canal, la periodicidad y las campañas globales solo puede modificarlos el master.</AlertDescription></Alert><div className="mt-3 flex flex-wrap gap-3 text-sm"><Badge variant={globalCaptchaSettings.enabled ? 'default' : 'outline'}>{globalCaptchaSettings.enabled ? 'Canal global activo' : 'Canal global desactivado'}</Badge><span>{globalCaptchaSettings.channel ? `@${globalCaptchaSettings.channel}` : 'Sin canal global'}</span><span>Periodicidad: {globalCaptchaSettings.reverify_interval_days ? `${globalCaptchaSettings.reverify_interval_days} días` : 'desactivada'}</span></div></CardContent>}
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
