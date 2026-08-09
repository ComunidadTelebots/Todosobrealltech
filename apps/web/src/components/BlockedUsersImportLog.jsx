import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Eye, AlertCircle, RefreshCw, Filter, Loader2, FileText, Server, CheckCircle2, XCircle, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';

const BlockedUsersImportLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Status State
  const [importStatus, setImportStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/status');
      if (response.ok) {
        const data = await response.json();
        setImportStatus(data);
      } else {
        throw new Error('Failed to fetch status');
      }
    } catch (error) {
      console.error('Error fetching import status:', error);
      // Fallback state if endpoint fails
      setImportStatus({
        cas_available: false,
        csv_available: true,
        json_available: true,
        manual_available: true
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let filterStr = '';
      const filters = [];
      
      if (sourceFilter !== 'all') {
        filters.push(`source="${sourceFilter}"`);
      }
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filters.push(`import_date >= "${fromDate.toISOString().replace('T', ' ')}"`);
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filters.push(`import_date <= "${toDate.toISOString().replace('T', ' ')}"`);
      }
      
      if (filters.length > 0) {
        filterStr = filters.join(' && ');
      }

      const records = await pb.collection('import_logs').getList(1, 50, {
        sort: '-import_date',
        filter: filterStr,
        $autoCancel: false
      });
      setLogs(records.items);
    } catch (error) {
      console.error('Failed to fetch import logs:', error);
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, [sourceFilter, dateFrom, dateTo]);

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  const handleRetry = async (log) => {
    if (log.source !== 'cas' && log.source !== 'cas_api') {
      toast.error('Only CAS API imports can be automatically retried. Please re-upload files for other sources.');
      return;
    }

    setIsRetrying(true);
    try {
      const response = await apiServerClient.fetch('/blocked-users/import', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'cas' })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.available === false) {
        throw new Error(data.message || data.error || 'Retry failed');
      }
      
      toast.success(`Retry complete: ${data.imported || data.added || 0} added.`);
      fetchLogs(); // Refresh logs to show the new attempt
    } catch (error) {
      console.error('Retry error:', error);
      toast.error(error.message || 'Failed to retry import');
    } finally {
      setIsRetrying(false);
    }
  };

  const clearFilters = () => {
    setSourceFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const renderStatusBadge = (name, isAvailable) => {
    if (statusLoading) {
      return <Badge variant="outline" className="text-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...</Badge>;
    }
    
    return isAvailable ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> {name}
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <XCircle className="w-3 h-3 mr-1" /> {name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mt-8" id="import-logs-section">
      {/* System Status Section */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Import Sources Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={statusLoading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            {renderStatusBadge(importStatus?.cas_local_available ? 'CAS local · Moonbot' : 'CAS API remota', importStatus?.cas_available)}
            {renderStatusBadge('CSV Upload', importStatus?.csv_available)}
            {renderStatusBadge('JSON Upload', importStatus?.json_available)}
            {renderStatusBadge('Manual Entry', importStatus?.manual_available)}
          </div>
          
          {importStatus?.cas_local_available && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Export CAS local operativo en Moonbot: {Number(importStatus.cas_local_records || 0).toLocaleString('es-ES')} IDs. {importStatus.cas_feed_available ? `Feed reciente activo (${Number(importStatus.cas_feed_records || 0).toLocaleString('es-ES')} IDs).` : ''}
            </div>
          )}
          {importStatus && !importStatus.cas_available && (
            <div className="mt-3 text-sm text-destructive flex items-center gap-2 bg-destructive/5 p-2 rounded-md border border-destructive/10">
              <AlertCircle className="w-4 h-4" />
              No están disponibles ni el export CAS local de Moonbot ni la API remota. Las importaciones manuales, CSV y JSON siguen funcionando.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Import History & Logs
            </CardTitle>
            <CardDescription>Review past synchronization attempts and error details.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 w-full sm:w-auto mb-2 sm:mb-0">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="cas_api">CAS API</SelectItem>
                  <SelectItem value="cas">CAS</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input 
                type="date" 
                className="h-9 w-[140px]" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input 
                type="date" 
                className="h-9 w-[140px]" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {(sourceFilter !== 'all' || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 mt-auto text-muted-foreground">
                Clear
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Added</TableHead>
                  <TableHead className="text-center">Duplicates</TableHead>
                  <TableHead className="text-center">Errors</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-base font-medium text-foreground">No import logs found</p>
                      <p className="text-sm">Try adjusting your filters or run a new import.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className={log.errors_count > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        {new Date(log.import_date || log.created).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase text-xs tracking-wider">
                          {log.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          +{log.added_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {log.duplicates_count || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.errors_count > 0 ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
                            {log.errors_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {log.errors_count > 0 && (log.source === 'cas' || log.source === 'cas_api') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => handleRetry(log)}
                            disabled={isRetrying}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                            Retry
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(log)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog?.errors_count > 0 ? <AlertCircle className="w-5 h-5 text-destructive" /> : <History className="w-5 h-5 text-primary" />}
                Import Details
              </DialogTitle>
              <DialogDescription>
                {selectedLog && new Date(selectedLog.import_date || selectedLog.created).toLocaleString()} via {selectedLog?.source?.toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-600">{selectedLog.added_count || 0}</p>
                    <p className="text-xs font-medium text-emerald-600/80 uppercase tracking-wider">Added</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg border">
                    <p className="text-2xl font-bold text-foreground">{selectedLog.duplicates_count || 0}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duplicates</p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-2xl font-bold text-destructive">{selectedLog.errors_count || 0}</p>
                    <p className="text-xs font-medium text-destructive/80 uppercase tracking-wider">Errors</p>
                  </div>
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Detailed Log Output
                    </h4>
                    <ScrollArea className="h-[250px] w-full rounded-md border bg-muted/30 p-4">
                      {Array.isArray(selectedLog.details.errors) && selectedLog.details.errors.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-destructive mb-2">Error List:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            {selectedLog.details.errors.map((err, i) => (
                              <li key={i} className="text-xs text-destructive/90 font-mono">{err}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
                          {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="mt-4 p-6 text-center border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground">No extended details available for this import.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default BlockedUsersImportLog;
