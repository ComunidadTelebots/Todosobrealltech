import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Edit2, Eye, EyeOff, Loader2, Search, Snowflake, Trash2, TrendingUp, UserCog, Users, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountHorizonTools from '@/components/AccountHorizonTools.jsx';
import { getAccountPrivacyMode, maskEmail, maskName, maskProxyUrl } from '@/lib/accountPrivacy.js';
import AccountAccessibilityControls from '@/components/AccountAccessibilityControls.jsx';

const ROLE_OPTIONS = ['user', 'moderator', 'admin'];

const CreatorAccountProxyManager = () => {
  const { currentUser } = useAuth();
  const panelRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [proxyQuery, setProxyQuery] = useState('');
  const [editingProxyId, setEditingProxyId] = useState('');
  const [proxyDraft, setProxyDraft] = useState({});
  const [approvals, setApprovals] = useState([]);
  const [accountForecast, setAccountForecast] = useState(null);
  const [accountPeriod, setAccountPeriod] = useState(30);
  const [accountComparison, setAccountComparison] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(() => getAccountPrivacyMode(currentUser.id));
  const [revealSensitive, setRevealSensitive] = useState(false);

  useEffect(() => {
    const updatePrivacy = (event) => {
      if (event.detail?.userId === currentUser.id) {
        setPrivacyMode(event.detail.enabled);
        setRevealSensitive(false);
      }
    };
    window.addEventListener('accountPrivacyUpdate', updatePrivacy);
    return () => window.removeEventListener('accountPrivacyUpdate', updatePrivacy);
  }, [currentUser.id]);

  const conceal = privacyMode && !revealSensitive;
  const displayEmail = (value) => conceal ? maskEmail(value) : (value || 'Sin correo');
  const displayName = (value) => conceal ? maskName(value) : (value || 'Sin nombre');
  const displayProxy = (value) => conceal ? maskProxyUrl(value) : value;

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

  const fetchApprovals = async () => {
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/account-tools/approvals', { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      const data = await response.json();
      if (response.ok) setApprovals(data.approvals || []);
    } catch { setApprovals([]); }
  };

  const fetchAccountForecast = async () => {
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/account-tools/forecast', { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      const data = await response.json();
      if (response.ok) setAccountForecast(data.forecast || null);
    } catch { setAccountForecast(null); }
  };

  const fetchAccountComparison = async (days) => {
    try {
      const response = await apiServerClient.fetch(`/moonbot-admin/account-tools/compare?days=${days}`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      const data = await response.json();
      if (response.ok) setAccountComparison(data.comparison || null);
    } catch { setAccountComparison(null); }
  };

  useEffect(() => {
    fetchResources();
    fetchApprovals();
    fetchAccountForecast();
  }, []);

  useEffect(() => { fetchAccountComparison(accountPeriod); }, [accountPeriod, users.length]);

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

  const accountInsights = useMemo(() => {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const current = users.filter((user) => new Date(user.created) >= currentStart).length;
    const previous = users.filter((user) => { const date = new Date(user.created); return date >= previousStart && date < currentStart; }).length;
    const elapsed = Math.max(1, now.getDate());
    const forecast = Math.round(current * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / elapsed);
    const alerts = [
      users.filter((user) => user.is_frozen).length && `${users.filter((user) => user.is_frozen).length} cuentas congeladas`,
      users.filter((user) => !user.role).length && `${users.filter((user) => !user.role).length} cuentas sin rol explícito`,
      proxies.filter((proxy) => proxy.status !== 'active').length && `${proxies.filter((proxy) => proxy.status !== 'active').length} proxies requieren revisión`,
    ].filter(Boolean);
    return { current, previous, forecast, change: previous ? Math.round((current - previous) * 100 / previous) : current ? 100 : 0, alerts };
  }, [users, proxies]);

  const updateLocalUser = (updated) => {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const recordAccountChange = (event) => apiServerClient.fetch('/moonbot-admin/account-tools/history', {
    method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, actor_id: currentUser.id }),
  }).catch(() => {});

  const handleRoleChange = async (user, role) => {
    if (user.id === currentUser.id && role !== currentUser.role) {
      toast.error('No puedes cambiar tu propio rol desde este panel');
      return;
    }

    setProcessingId(user.id);
    try {
      if (role === 'creator') {
        toast.error('El rol creator no se asigna desde este panel');
        return;
      }
      if (role === 'admin' && user.role !== 'admin') {
        const response = await apiServerClient.fetch('/moonbot-admin/account-tools/approvals', {
          method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', account_id: user.id, role }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        await fetchApprovals();
        toast.success('Elevación enviada al flujo de aprobación');
        return;
      }
      const updated = await pb.collection('users').update(user.id, { role }, { $autoCancel: false });
      await recordAccountChange({ account_id: user.id, action: 'role', before: { role: user.role }, after: { role } });
      updateLocalUser(updated);
      toast.success(`Rol de ${user.email} actualizado a ${role}`);
    } catch (error) {
      console.error('Failed to change user role:', error);
      toast.error(error.message || 'No se pudo cambiar el rol');
    } finally {
      setProcessingId('');
    }
  };

  const decideApproval = async (approval, decision) => {
    setProcessingId(approval.id);
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/account-tools/approvals', {
        method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', approval_id: approval.id, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await Promise.all([fetchApprovals(), fetchResources()]);
      toast.success(decision === 'approved' ? 'Elevación aprobada' : 'Solicitud rechazada');
    } catch (error) { toast.error(error.message || 'No se pudo revisar la solicitud'); }
    finally { setProcessingId(''); }
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
      await recordAccountChange({ account_id: user.id, action: 'freeze', before: { is_frozen: !!user.is_frozen }, after: { is_frozen: !user.is_frozen } });
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
      await recordAccountChange({ account_id: user.id, action: 'delete', before: { role: user.role, is_frozen: !!user.is_frozen }, after: null });
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
    <section ref={panelRef} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Administración de cuentas y proxies</h2>
        <p className="text-muted-foreground">Gestiona los recursos de la plataforma directamente desde este panel.</p>
      </div>
      <AccountAccessibilityControls containerRef={panelRef} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-background p-4"><TrendingUp className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-2xl font-bold">{accountForecast?.projected_30d ?? accountInsights.forecast}</p><p className="text-xs text-muted-foreground">Altas previstas en 30 días{accountForecast ? ` · intervalo ${accountForecast.interval.min}–${accountForecast.interval.max} · confianza ${accountForecast.confidence}` : ', basada en el ritmo actual'}.</p>{accountForecast?.explanation && <p className="mt-1 text-xs text-muted-foreground">{accountForecast.explanation}</p>}</div>
        <div className="rounded-xl border bg-background p-4"><div className="flex items-start justify-between gap-2"><Activity className="mb-2 h-5 w-5 text-blue-600" /><select aria-label="Periodo de comparación" value={accountPeriod} onChange={(event) => setAccountPeriod(Number(event.target.value))} className="rounded border bg-background px-2 py-1 text-xs"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></div><p className="text-2xl font-bold">{accountComparison?.current ?? accountInsights.current} <span className="text-sm font-normal">({(accountComparison?.change_percent ?? accountInsights.change) >= 0 ? '+' : ''}{accountComparison?.change_percent ?? accountInsights.change}%)</span></p><p className="text-xs text-muted-foreground">Altas frente a la ventana anterior equivalente: {accountComparison?.previous ?? accountInsights.previous}. Diferencia: {accountComparison?.difference ?? (accountInsights.current - accountInsights.previous)}.</p></div>
        <div className="rounded-xl border bg-background p-4"><AlertTriangle className="mb-2 h-5 w-5 text-amber-600" /><p className="text-2xl font-bold">{accountInsights.alerts.length}</p><p className="text-xs text-muted-foreground">Alertas adaptativas: {accountInsights.alerts.join(' · ') || 'ninguna incidencia'}.</p></div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm"><WandSparkles className="h-5 w-5 text-violet-600" /><span><b>Asistente de cuentas:</b> revisa primero las alertas, después los roles y finalmente los proxies inactivos.</span></div>
      <AccountHorizonTools users={users} proxies={proxies} onRefresh={fetchResources} />
      <section className="rounded-xl border bg-background p-4"><h3 className="mb-1 font-semibold">Aprobaciones de cuentas</h3><p className="mb-3 text-sm text-muted-foreground">Las elevaciones a administrador requieren revisión de creator y no pueden ser aprobadas por quien las solicitó.</p><div className="space-y-2">{approvals.filter((item) => item.status === 'pending').map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span><b>{displayEmail(usersById.get(item.account_id)?.email)}</b> · {item.change.before} → {item.change.after}<small className="block text-muted-foreground">Solicitada por {item.requested_by}</small></span>{currentUser.role === 'creator' && <span className="flex gap-2"><Button size="sm" disabled={processingId === item.id || item.requested_by === currentUser.id} onClick={() => decideApproval(item, 'approved')}>Aprobar</Button><Button size="sm" variant="outline" disabled={processingId === item.id} onClick={() => decideApproval(item, 'rejected')}>Rechazar</Button></span>}</div>)}{!approvals.some((item) => item.status === 'pending') && <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>}</div></section>

      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="accounts">Cuentas ({users.length})</TabsTrigger>
          <TabsTrigger value="proxies">Proxies ({proxies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          {privacyMode && <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"><span>{conceal ? 'Datos personales ocultos en esta pantalla.' : 'Datos visibles temporalmente durante esta sesión.'}</span><Button type="button" variant="outline" size="sm" onClick={() => setRevealSensitive((value) => !value)}>{conceal ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}{conceal ? 'Revelar' : 'Ocultar'}</Button></div>}
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
                      <p className="truncate font-semibold">{displayName(user.name)}</p>
                      <p className="truncate text-xs font-normal text-muted-foreground">{displayEmail(user.email)}</p>
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
                        <p className="truncate font-mono text-sm font-semibold">{displayProxy(proxy.proxy_url)}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{owner ? displayEmail(owner.email) : 'Propietario desconocido'}</p>
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
