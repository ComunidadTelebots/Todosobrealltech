import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, RefreshCw, Shield, Server, CheckCircle2, AlertCircle, Plus, Network, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProxyManagement } from '@/hooks/useProxyManagement.js';
import ProxyFormModal from '@/components/ProxyFormModal.jsx';
import ProxyCard from '@/components/ProxyCard.jsx';

const ProxiesPanel = () => {
  const { currentUser } = useAuth();
  
  // MTProto State
  const [mtProxies, setMtProxies] = useState([]);
  const [mtLoading, setMtLoading] = useState(true);
  const [mtRefreshing, setMtRefreshing] = useState(false);
  const [mtLastUpdated, setMtLastUpdated] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [mtTotalCount, setMtTotalCount] = useState(0);
  const [creatorStats, setCreatorStats] = useState(null);

  // Personal Proxies State
  const { 
    proxies: personalProxies, 
    loading: personalLoading, 
    fetchProxies: fetchPersonalProxies,
    addProxy,
    updateProxy,
    deleteProxy,
    testProxyConnection
  } = useProxyManagement(currentUser?.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);

  const fetchMtProxies = async (isRefresh = false) => {
    if (isRefresh) setMtRefreshing(true);
    else setMtLoading(true);

    try {
      // NO cambiar sin revisar: ruta única {success, proxies, total, lastUpdated} servida
      // por el api desde la caché del crawler (worker). Debe coincidir con apps/proxy.
      const response = await apiServerClient.fetch('/proxies');
      if (!response.ok) throw new Error('Failed to fetch proxies from server');
      
      const data = await response.json();
      if (data.success) {
        // Propios (source==='own') SIEMPRE primero; orden estable dentro de cada grupo
        // (coherente con la web pública proxy.todosobreall.tech).
        setMtProxies(
          (data.proxies || []).slice().sort(
            (a, b) => (a.source === 'own' ? 0 : 1) - (b.source === 'own' ? 0 : 1)
          )
        );
        setMtTotalCount(data.total || data.proxies?.length || 0);
        if (data.lastUpdated) setMtLastUpdated(new Date(data.lastUpdated));
        if (isRefresh) toast.success(`Successfully loaded ${data.total} proxies`);
      } else {
        throw new Error('Backend reported failure');
      }
    } catch (error) {
      console.error('Error fetching MT proxies:', error);
      toast.error('Failed to load MTProto proxies.');
    } finally {
      setMtLoading(false);
      setMtRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMtProxies();
    if (currentUser) {
      fetchPersonalProxies();
    }
  }, [currentUser, fetchPersonalProxies]);

  useEffect(() => {
    if (!['admin', 'creator'].includes(currentUser?.role)) {
      setCreatorStats(null);
      return;
    }

    apiServerClient.fetch('/stats', {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`/stats HTTP ${response.status}`);
        return response.json();
      })
      .then((stats) => setCreatorStats(stats.proxies || null))
      .catch((error) => console.warn('Failed to load creator proxy stats:', error));
  }, [currentUser]);

  const handleCopy = (proxy) => {
    const proxyString = `${proxy.server}:${proxy.port}:${proxy.secret}`;
    navigator.clipboard.writeText(proxyString);
    setCopiedId(proxy.id || proxy.server);
    toast.success('Proxy copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingProxy(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proxy) => {
    setEditingProxy(proxy);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data) => {
    if (editingProxy) {
      await updateProxy(editingProxy.id, data);
    } else {
      await addProxy(data);
    }
  };

  const handleDeleteProxy = async (id) => {
    if (window.confirm('Are you sure you want to delete this proxy?')) {
      try {
        await deleteProxy(id);
      } catch (error) {
        // Error handled in hook
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Proxy Management | NexusGuard</title>
        <meta name="description" content="Manage your personal proxies and access secure MTProto proxies." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] bg-muted/20 py-12">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                <Network className="w-4 h-4" />
                Network Routing
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Proxy Management
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Access public MTProto proxies for Telegram or manage your own private HTTP/SOCKS5 proxy servers.
              </p>
            </div>
          </div>

          {creatorStats && (
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <Server className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{creatorStats.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Proxies privados</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{creatorStats.active || 0}</p>
                    <p className="text-sm text-muted-foreground">Conexiones activas</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{creatorStats.owners || 0}</p>
                    <p className="text-sm text-muted-foreground">Usuarios con proxy</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="personal" className="space-y-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="personal">My Proxies</TabsTrigger>
              <TabsTrigger value="mtproto">Public MTProto</TabsTrigger>
            </TabsList>

            {/* Personal Proxies Tab */}
            <TabsContent value="personal" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold tracking-tight">Private Proxies</h2>
                <Button onClick={handleOpenAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Proxy
                </Button>
              </div>

              {!currentUser ? (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Please log in to manage your personal proxy servers.
                    </p>
                  </CardContent>
                </Card>
              ) : personalLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex justify-between mb-4">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-10 w-full mb-4" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : personalProxies.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border shadow-sm border-dashed"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Server className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Proxies Added</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    You haven't added any personal proxies yet. Add your HTTP, HTTPS, or SOCKS5 proxies to monitor their status.
                  </p>
                  <Button onClick={handleOpenAddModal} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Proxy
                  </Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {personalProxies.map((proxy, index) => (
                    <motion.div
                      key={proxy.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ProxyCard 
                        proxy={proxy} 
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteProxy}
                        onTest={testProxyConnection}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* MTProto Proxies Tab */}
            <TabsContent value="mtproto" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Telegram MTProto</h2>
                  <p className="text-sm text-muted-foreground mt-1">Publicly available proxies for Telegram clients.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground text-right hidden sm:block">
                    <span className="block">{mtTotalCount} Active Nodes</span>
                    {mtLastUpdated && <span className="block text-xs">Updated {formatDistanceToNow(mtLastUpdated, { addSuffix: true })}</span>}
                  </div>
                  <Button onClick={() => fetchMtProxies(true)} disabled={mtRefreshing || mtLoading} variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${mtRefreshing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                </div>
              </div>

              {mtLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : mtProxies.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card rounded-2xl border shadow-sm"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No Proxies Available</h3>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    There are currently no MTProto proxies available. Click the sync button to fetch the latest proxies from the network.
                  </p>
                  <Button onClick={() => fetchMtProxies(true)} disabled={mtRefreshing} size="lg">
                    <RefreshCw className={`w-4 h-4 mr-2 ${mtRefreshing ? 'animate-spin' : ''}`} />
                    Fetch Proxies Now
                  </Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {mtProxies.map((proxy, index) => (
                    <motion.div
                      key={proxy.id || `${proxy.server}-${proxy.port}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <Card className="proxy-card-hover h-full flex flex-col bg-card">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Server className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg leading-none mb-1">Proxy Node</h3>
                                <p className="text-sm text-muted-foreground">Port: {proxy.port}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {proxy.source === 'own' && (
                                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 border-transparent rounded-full px-2.5">
                                  PROPIO
                                </Badge>
                              )}
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-transparent">
                                Active
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-4 flex-1">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Server Address</label>
                              <div className="font-mono text-sm bg-muted/50 p-2.5 rounded-md border border-border/50 truncate">
                                {proxy.server}
                              </div>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secret</label>
                              <div className="font-mono text-sm bg-muted/50 p-2.5 rounded-md border border-border/50 truncate text-muted-foreground">
                                {proxy.secret.substring(0, 12)}...{proxy.secret.substring(proxy.secret.length - 4)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-border/50">
                            <Button 
                              variant={(copiedId === proxy.id || copiedId === proxy.server) ? "secondary" : "default"}
                              className="w-full transition-all"
                              onClick={() => handleCopy(proxy)}
                            >
                              {(copiedId === proxy.id || copiedId === proxy.server) ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                                  Copied to Clipboard
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Connection String
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProxyFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingProxy}
      />
    </>
  );
};

export default ProxiesPanel;
