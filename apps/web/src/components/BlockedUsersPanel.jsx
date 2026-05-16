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
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';

const BlockedUsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status State
  const [importStatus, setImportStatus] = useState({
    cas_available: true,
    csv_available: true,
    json_available: true,
    manual_available: true
  });
  const [statusLoading, setStatusLoading] = useState(false);

  // Import State
  const [importSource, setImportSource] = useState('cas');
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

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('blocked_users').getFullList({
        sort: '-imported_date',
        $autoCancel: false
      });
      setUsers(records);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
      toast.error('Failed to load blocked users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBlockedUsers();
  }, []);

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
        if (!manualData.user_id || !manualData.username) throw new Error('User ID and Username are required');
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
      await pb.collection('blocked_users').update(id, {
        is_active: !currentStatus
      }, { $autoCancel: false });
      
      setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
      toast.success(`User block ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user from the blocklist?')) return;
    
    try {
      await pb.collection('blocked_users').delete(id, { $autoCancel: false });
      setUsers(users.filter(u => u.id !== id));
      toast.success('User removed from blocklist');
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
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.source && u.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DownloadCloud className="w-5 h-5 text-primary" />
                Import Blocked Users
              </CardTitle>
              <CardDescription>Sync from CAS API or upload custom blocklists.</CardDescription>
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
                    <SelectItem value="cas" disabled={!importStatus.cas_available}>
                      <div className="flex items-center justify-between w-full">
                        <span>CAS API (Automatic)</span>
                        {!importStatus.cas_available && <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Offline</Badge>}
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="json">JSON File</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
                
                {!importStatus.cas_available && importSource !== 'cas' && (
                  <p className="text-xs text-destructive flex items-start gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    CAS API is currently offline. Other sources are fully functional.
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {importSource === 'cas' && "Automatically fetches the latest blocklist from the CAS global database."}
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
                      <Label htmlFor="m_user_id">User ID *</Label>
                      <Input id="m_user_id" value={manualData.user_id} onChange={e => setManualData({...manualData, user_id: e.target.value})} placeholder="e.g. 123456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m_username">Username *</Label>
                      <Input id="m_username" value={manualData.username} onChange={e => setManualData({...manualData, username: e.target.value})} placeholder="e.g. @baduser" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m_reason">Reason</Label>
                      <Input id="m_reason" value={manualData.reason} onChange={e => setManualData({...manualData, reason: e.target.value})} placeholder="Violation..." />
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
            Validate Data
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isValidating || !!localValidationError || (!validationResult?.isValid && importSource !== 'cas')}
          >
            {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Execute Import
          </Button>
        </CardFooter>
      </Card>

      {/* Blocked Users List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Blocked Users Directory
            </CardTitle>
            <CardDescription>Manage users currently restricted from accessing the platform.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by username, ID, or source..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading blocked users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-lg font-medium text-foreground">No blocked users found</p>
                      <p className="text-sm text-muted-foreground">The directory is currently empty or no users match your search.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60 bg-muted/30' : ''}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username}</span>
                          <span className="text-xs text-muted-foreground font-mono">{user.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate" title={user.reason}>
                        {user.reason || <span className="text-muted-foreground italic">No reason provided</span>}
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
                        {new Date(user.imported_date || user.created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={user.is_active} 
                          onCheckedChange={() => handleToggleActive(user.id, user.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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