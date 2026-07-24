import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Edit2, Loader2, Search, Snowflake, Trash2, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ROLE_OPTIONS = ['user', 'moderator', 'admin', 'creator'];

const CreatorAccountProxyManager = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [proxyQuery, setProxyQuery] = useState('');
  const [editingProxyId, setEditingProxyId] = useState('');
  const [proxyDraft, setProxyDraft] = useState({});

  const fetchResources = async () => {
    setLoading(true);
    try {
      const [userRecords, proxyRecords] = await Promise.all([
        pb.collection('users').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('user_proxies').getFullList({ sort: '-updated', $autoCancel: false }),
      ]);
      setUsers(userRecords);
      setProxies(proxyRecords);
    } catch (error) {
      console.error('Failed to load creator resources:', error);
      toast.error('No se pudieron cargar las cuentas y proxies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.name, user.email, user.role]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [users, userQuery]);

  const filteredProxies = useMemo(() => {
    const query = proxyQuery.trim().toLowerCase();
    if (!query) return proxies;
    return proxies.filter((proxy) => {
      const owner = usersById.get(proxy.user_id);
      return [proxy.proxy_url, proxy.proxy_type, proxy.status, owner?.name, owner?.email]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [proxies, proxyQuery, usersById]);

  const updateLocalUser = (updated) => {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const handleRoleChange = async (user, role) => {
    if (user.id === currentUser.id && role !== currentUser.role) {
      toast.error('No puedes cambiar tu propio rol desde este panel');
      return;
    }

    setProcessingId(user.id);
    try {
      const updated = await pb.collection('users').update(user.id, { role }, { $autoCancel: false });
      updateLocalUser(updated);
      toast.success(`Rol de ${user.email} actualizado a ${role}`);
    } catch (error) {
      console.error('Failed to change user role:', error);
      toast.error(error.message || 'No se pudo cambiar el rol');
    } finally {
      setProcessingId('');
    }
  };

  const handleFreeze = async (user) => {
    if (user.id === currentUser.id) {
      toast.error('No puedes congelar tu propia cuenta');
      return;
    }
    if (!window.confirm(`¿${user.is_frozen ? 'Descongelar' : 'Congelar'} la cuenta ${user.email}?`)) return;

    setProcessingId(user.id);
    try {
      const updated = await pb.collection('users').update(
        user.id,
        { is_frozen: !user.is_frozen },
        { $autoCancel: false },
      );
      updateLocalUser(updated);
      toast.success(updated.is_frozen ? 'Cuenta congelada' : 'Cuenta descongelada');
    } catch (error) {
      console.error('Failed to toggle frozen status:', error);
      toast.error(error.message || 'No se pudo actualizar la cuenta');
    } finally {
      setProcessingId('');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      toast.error('No puedes eliminar tu propia cuenta');
      return;
    }
    if (!window.confirm(`¿Eliminar definitivamente la cuenta ${user.email}?`)) return;

    setProcessingId(user.id);
    try {
      await pb.collection('users').delete(user.id, { $autoCancel: false });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setProxies((current) => current.filter((proxy) => proxy.user_id !== user.id));
      toast.success('Cuenta eliminada');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'No se pudo eliminar la cuenta');
    } finally {
      setProcessingId('');
    }
  };

  const handleTestProxy = async (proxy) => {
    setProcessingId(proxy.id);
    try {
      const response = await apiServerClient.fetch('/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxy_url: proxy.proxy_url,
          proxy_type: proxy.proxy_type.toLowerCase(),
          username: proxy.username,
          password: proxy.password,
        }),
      });
      const result = await response.json();
      const status = response.ok && result.success ? 'active' : 'inactive';
      const updated = await pb.collection('user_proxies').update(proxy.id, {
        status,
        last_tested: new Date().toISOString(),
        test_result: result.success ? `Success (${result.responseTime}ms)` : (result.error || 'Connection failed'),
      }, { $autoCancel: false });
      setProxies((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast[status === 'active' ? 'success' : 'error'](
        status === 'active' ? 'Proxy operativo' : 'El proxy no responde',
      );
    } catch (error) {
      console.error('Failed to test proxy:', error);
      toast.error(error.message || 'No se pudo probar el proxy');
    } finally {
      setProcessingId('');
    }
  };

  const startEditingProxy = (proxy) => {
    setEditingProxyId(proxy.id);
    setProxyDraft({
      proxy_url: proxy.proxy_url || '',
      proxy_type: proxy.proxy_type || 'HTTP',
      username: proxy.username || '',
      password: proxy.password || '',
    });
  };

  const handleSaveProxy = async (proxy) => {
    if (!/^[a-zA-Z0-9.-]+:[0-9]{1,5}$/.test(proxyDraft.proxy_url || '')) {
      toast.error('Usa el formato host:puerto');
      return;
    }

    setProcessingId(proxy.id);
    try {
      const updated = await pb.collection('user_proxies').update(proxy.id, proxyDraft, { $autoCancel: false });
      setProxies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingProxyId('');
      toast.success('Proxy actualizado');
    } catch (error) {
      console.error('Failed to update proxy:', error);
      toast.error(error.message || 'No se pudo actualizar el proxy');
    } finally {
      setProcessingId('');
    }
  };

  const handleDeleteProxy = async (proxy) => {
    if (!window.confirm(`¿Eliminar el proxy ${proxy.proxy_url}?`)) return;
    setProcessingId(proxy.id);
    try {
      await pb.collection('user_proxies').delete(proxy.id, { $autoCancel: false });
      setProxies((current) => current.filter((item) => item.id !== proxy.id));
      toast.success('Proxy eliminado');
    } catch (error) {
      console.error('Failed to delete proxy:', error);
      toast.error(error.message || 'No se pudo eliminar el proxy');
    } finally {
      setProcessingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando cuentas y proxies…
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Administración de cuentas y proxies</h2>
        <p className="text-muted-foreground">Gestiona los recursos de la plataforma directamente desde este panel.</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="accounts">Cuentas ({users.length})</TabsTrigger>
          <TabsTrigger value="proxies">Proxies ({proxies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Buscar cuenta…" className="pl-9" />
          </div>
          <Accordion type="multiple" className="rounded-xl border bg-background px-4">
            {filteredUsers.map((user) => (
              <AccordionItem key={user.id} value={user.id}>
                <AccordionTrigger className="gap-4 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Users className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user.name || 'Sin nombre'}</p>
                      <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto capitalize">{user.role || 'user'}</Badge>
                    {user.is_frozen && <Badge variant="secondary">Congelada</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap items-end gap-3 pb-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-muted-foreground">Rol</span>
                      <select
                        value={user.role || 'user'}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                        disabled={processingId === user.id || user.id === currentUser.id}
                        className="h-9 rounded-md border bg-background px-3"
                      >
                        {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <Button variant="outline" size="sm" onClick={() => handleFreeze(user)} disabled={processingId === user.id || user.id === currentUser.id}>
                      <Snowflake className="mr-2 h-4 w-4" />
                      {user.is_frozen ? 'Descongelar' : 'Congelar'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)} disabled={processingId === user.id || user.id === currentUser.id}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar cuenta
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="proxies" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={proxyQuery} onChange={(event) => setProxyQuery(event.target.value)} placeholder="Buscar proxy o propietario…" className="pl-9" />
          </div>
          <Accordion type="multiple" className="rounded-xl border bg-background px-4">
            {filteredProxies.map((proxy) => {
              const owner = usersById.get(proxy.user_id);
              const isEditing = editingProxyId === proxy.id;
              return (
                <AccordionItem key={proxy.id} value={proxy.id}>
                  <AccordionTrigger className="gap-4 hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Activity className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">{proxy.proxy_url}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{owner?.email || 'Propietario desconocido'}</p>
                      </div>
                      <Badge variant={proxy.status === 'active' ? 'default' : 'secondary'} className="ml-auto capitalize">
                        {proxy.status || 'sin probar'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {isEditing ? (
                      <div className="grid gap-3 pb-3 sm:grid-cols-2">
                        <Input value={proxyDraft.proxy_url} onChange={(event) => setProxyDraft((draft) => ({ ...draft, proxy_url: event.target.value }))} placeholder="host:puerto" />
                        <select value={proxyDraft.proxy_type} onChange={(event) => setProxyDraft((draft) => ({ ...draft, proxy_type: event.target.value }))} className="h-10 rounded-md border bg-background px-3">
                          <option value="HTTP">HTTP</option>
                          <option value="HTTPS">HTTPS</option>
                          <option value="SOCKS5">SOCKS5</option>
                        </select>
                        <Input value={proxyDraft.username} onChange={(event) => setProxyDraft((draft) => ({ ...draft, username: event.target.value }))} placeholder="Usuario (opcional)" />
                        <Input type="password" value={proxyDraft.password} onChange={(event) => setProxyDraft((draft) => ({ ...draft, password: event.target.value }))} placeholder="Contraseña (opcional)" />
                        <div className="flex gap-2 sm:col-span-2">
                          <Button size="sm" onClick={() => handleSaveProxy(proxy)}>Guardar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingProxyId('')}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pb-2">
                        <Button size="sm" onClick={() => handleTestProxy(proxy)} disabled={processingId === proxy.id}>
                          <Activity className="mr-2 h-4 w-4" />
                          Probar conexión
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditingProxy(proxy)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProxy(proxy)} disabled={processingId === proxy.id}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default CreatorAccountProxyManager;
