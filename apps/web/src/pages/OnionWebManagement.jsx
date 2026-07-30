import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Network, AlertCircle, RefreshCw, ArrowLeft, Globe2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import OnionWebCard from '@/components/OnionWebCard.jsx';
import OnionWebForm from '@/components/OnionWebForm.jsx';
import OnionWebDetailsModal from '@/components/OnionWebDetailsModal.jsx';

const OnionWebManagement = () => {
  const navigate = useNavigate();
  const [onionWebs, setOnionWebs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [traefikDomains, setTraefikDomains] = useState([]);
  const [traefikLoading, setTraefikLoading] = useState(false);
  const [traefikError, setTraefikError] = useState('');
  const [importingDomain, setImportingDomain] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWeb, setEditingWeb] = useState(null);
  const [selectedWeb, setSelectedWeb] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchOnionWebs = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await pb.collection('onion_webs').getList(1, 100, {
        sort: '-created_at',
        $autoCancel: false
      });
      setOnionWebs(result.items);
    } catch (err) {
      console.error('Error fetching onion webs:', err);
      setError('Failed to load onion webs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTraefikDomains = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    setTraefikLoading(true);
    setTraefikError('');
    try {
      const response = await apiServerClient.fetch('/onion/traefik-domains', {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setTraefikDomains(payload.domains || []);
    } catch (reason) {
      setTraefikError(reason.message || 'No se pudieron detectar dominios de Traefik');
    } finally {
      setTraefikLoading(false);
    }
  }, []);

  useEffect(() => {
    const ensureDefaultWeb = async () => {
      if (!pb.authStore.isValid) return;
      try {
        const userId = pb.authStore.model.id;
        const existing = await pb.collection('onion_webs').getFirstListItem(`name="TorWebManagement" && owner_id="${userId}"`, { $autoCancel: false }).catch(() => null);
        
        if (!existing) {
          await pb.collection('onion_webs').create({
            name: 'TorWebManagement',
            description: 'Tor Web Management Application',
            onion_address: 'app.onion',
            owner_id: userId,
            enabled: true,
            privacy: 'private',
            redirect_url: ''
          }, { $autoCancel: false });
          fetchOnionWebs();
        }
      } catch (e) {
        console.error('Error ensuring default web:', e);
      }
    };

    fetchOnionWebs().then(() => {
      ensureDefaultWeb();
    });
    fetchTraefikDomains();
  }, [fetchOnionWebs, fetchTraefikDomains]);

  const linkedDomain = (domain) => onionWebs.some((web) => {
    try { return new URL(web.redirect_url || '').hostname.toLowerCase() === domain.toLowerCase(); }
    catch { return false; }
  });

  const importTraefikDomain = async (domain) => {
    setImportingDomain(domain);
    try {
      const response = await apiServerClient.fetch('/onion/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: domain,
          description: `Servicio Onion asociado al dominio Traefik ${domain}`,
          privacy: 'public',
          redirect_url: `https://${domain}`,
        }),
      });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      toast.success(`Onion Web creada para ${domain}`);
      await fetchOnionWebs();
    } catch (reason) {
      toast.error(reason.message || 'No se pudo crear la Onion Web');
    } finally {
      setImportingDomain('');
    }
  };

  const handleCreate = () => {
    setEditingWeb(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (web) => {
    if (web.owner_id !== pb.authStore.model?.id && pb.authStore.model?.role !== 'admin') {
      toast.error('No tienes permiso para acceder a esta web onion');
      return;
    }
    setEditingWeb(web);
    setIsFormModalOpen(true);
    setIsDetailsModalOpen(false);
  };

  const handleDelete = async (web) => {
    if (web.owner_id !== pb.authStore.model?.id && pb.authStore.model?.role !== 'admin') {
      toast.error('No tienes permiso para acceder a esta web onion');
      return;
    }
    if (web.name === 'TorWebManagement') {
      toast.error('Cannot delete the system application web');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${web.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await pb.collection('onion_webs').delete(web.id, { $autoCancel: false });
      toast.success('Onion web deleted successfully');
      setIsDetailsModalOpen(false);
      fetchOnionWebs();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete onion web');
    }
  };

  const handleToggleStatus = async (web) => {
    if (web.owner_id !== pb.authStore.model?.id && pb.authStore.model?.role !== 'admin') {
      toast.error('No tienes permiso para acceder a esta web onion');
      return;
    }
    try {
      await pb.collection('onion_webs').update(web.id, {
        enabled: !web.enabled
      }, { $autoCancel: false });
      toast.success(`Onion web ${!web.enabled ? 'activated' : 'deactivated'}`);
      
      if (selectedWeb && selectedWeb.id === web.id) {
        setSelectedWeb({ ...selectedWeb, enabled: !web.enabled });
      }
      fetchOnionWebs();
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('Failed to update status');
    }
  };

  const handleCardClick = (web) => {
    if (web.owner_id !== pb.authStore.model?.id && pb.authStore.model?.role !== 'admin') {
      toast.error('No tienes permiso para acceder a esta web onion');
      return;
    }
    setSelectedWeb(web);
    setIsDetailsModalOpen(true);
  };

  const handleUpdateWeb = (updatedWeb) => {
    setSelectedWeb(updatedWeb);
    setOnionWebs(prev => prev.map(w => w.id === updatedWeb.id ? updatedWeb : w));
  };

  if (accessDenied) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border shadow-lg text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-8">No tienes permiso para acceder a esta web onion. Please log in or return to the dashboard.</p>
          <Button onClick={() => navigate('/admin')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Admin
          </Button>
        </div>
      </div>
    );
  }

  const filteredWebs = onionWebs.filter(web => {
    const matchesSearch = web.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          web.onion_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : 
                          statusFilter === 'active' ? web.enabled : !web.enabled;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Helmet>
        <title>Onion Web Management - Admin</title>
        <meta name="description" content="Manage hidden services and .onion addresses." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Network className="w-8 h-8 text-primary" />
                Onion Web Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage Tor hidden services and monitor access logs.
              </p>
            </div>
            <Button onClick={handleCreate} className="shrink-0 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New Onion Web
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or address..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <section className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Globe2 className="h-5 w-5 text-primary" />Dominios detectados en Traefik</h2>
                <p className="text-sm text-muted-foreground">Routers HTTPS descubiertos en la red interna; puedes asociarlos a una Onion Web.</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchTraefikDomains} disabled={traefikLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${traefikLoading ? 'animate-spin' : ''}`} />Detectar
              </Button>
            </div>
            {traefikError && <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{traefikError}</div>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {traefikDomains.map((item) => {
                const linked = linkedDomain(item.domain);
                return <div key={item.domain} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{item.domain}</p><p className="truncate text-xs text-muted-foreground">{item.services.join(', ') || 'Servicio Traefik'}</p></div><Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? 'Activo' : 'Inactivo'}</Badge></div>
                  <div className="mt-3 flex items-center justify-between gap-2"><span className="flex gap-1">{item.tls && <Badge variant="outline">TLS</Badge>}{linked && <Badge variant="outline">Asociado</Badge>}</span><Button size="sm" disabled={linked || importingDomain === item.domain} onClick={() => importTraefikDomain(item.domain)}><Link2 className="mr-1 h-3.5 w-3.5" />{linked ? 'Añadido' : 'Crear Onion'}</Button></div>
                </div>;
              })}
            </div>
            {!traefikLoading && !traefikError && !traefikDomains.length && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Traefik no ha publicado dominios Host.</p>}
          </section>

          {error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-2xl border shadow-sm">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-xl font-semibold mb-2">Failed to load data</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchOnionWebs} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 flex flex-col h-[220px]">
                  <div className="flex items-start space-x-4 mb-6">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1 pt-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full mb-4" />
                  <Skeleton className="h-4 w-full mt-auto" />
                </div>
              ))}
            </div>
          ) : filteredWebs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card rounded-2xl border shadow-sm">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Network className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No onion webs found</h3>
              <p className="text-muted-foreground mb-8 max-w-md">
                {searchTerm || statusFilter !== 'all' 
                  ? "No results match your current filters. Try adjusting them." 
                  : "You haven't created any hidden services yet."}
              </p>
              {(searchTerm || statusFilter !== 'all') ? (
                <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={handleCreate}>Create Your First Onion Web</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWebs.map((web) => (
                <OnionWebCard 
                  key={web.id} 
                  onionWeb={web} 
                  onClick={handleCardClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWeb ? 'Edit Onion Web' : 'Create New Onion Web'}</DialogTitle>
          </DialogHeader>
          <OnionWebForm 
            initialData={editingWeb} 
            onSuccess={() => {
              setIsFormModalOpen(false);
              fetchOnionWebs();
            }}
            onCancel={() => setIsFormModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <OnionWebDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onionWeb={selectedWeb}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onUpdate={handleUpdateWeb}
      />
    </>
  );
};

export default OnionWebManagement;
