import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, LogOut, Settings, Bot, ArrowRight, FileText, Send, Server, Crown, UserCheck, Network, UsersRound } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
const CreatorNewsManager = lazy(() => import('@/components/CreatorNewsManager.jsx'));
const CreatorAccountProxyManager = lazy(() => import('@/components/CreatorAccountProxyManager.jsx'));
const TelegramLanguageMap = lazy(() => import('@/components/TelegramLanguageMap.jsx'));
const MoonbotAdminOverview = lazy(() => import('@/components/MoonbotAdminOverview.jsx'));

const DeferredPanel = ({ children, minHeight = 180 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '500px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  return <div ref={ref} style={{ minHeight: visible ? undefined : minHeight }}>
    {visible && <Suspense fallback={<div className="mt-8 animate-pulse rounded-2xl border bg-muted/20" style={{ minHeight }} />}>{children}</Suspense>}
  </div>;
};

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [botStats, setBotStats] = useState({ total: 0, active: 0 });
  const [systemStats, setSystemStats] = useState({
    users: 0,
    totalBots: 0,
    verified: 0,
    frozen: 0,
    creators: 0,
    admins: 0,
  });
  const [newsStats, setNewsStats] = useState({ total: 0, today: 0 });
  const [channelStats, setChannelStats] = useState({ total: 0, subscribers: 0 });
  const [proxyStats, setProxyStats] = useState({ total: 0, active: 0, owners: 0, lastUpdated: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (currentUser?.id) {
        try {
          const requestStats = async () => {
            const response = await apiServerClient.fetch('/stats', {
              headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
            });
            if (!response.ok) throw new Error(`/stats HTTP ${response.status}`);
            return response.json();
          };
          const hasAdminRole = (user) => ['admin', 'creator'].includes(String(user?.role).toLowerCase());
          // Empieza antes de las consultas personales para que una petición lenta
          // de PocketBase en el navegador no bloquee los contadores agregados.
          let statsPromise = hasAdminRole(currentUser) ? requestStats() : null;

          // Perfil y bots personales son independientes de las estadísticas
          // agregadas. Un fallo parcial no debe dejar el dashboard completo a 0.
          const [userResult, botsResult] = await Promise.allSettled([
            pb.collection('users').getOne(currentUser.id, { $autoCancel: false }),
            pb.collection('bots').getFullList({
              filter: `user_id="${currentUser.id}"`,
              $autoCancel: false
            })
          ]);
          const user = userResult.status === 'fulfilled' ? userResult.value : currentUser;
          const bots = botsResult.status === 'fulfilled' ? botsResult.value : [];
          setUserData(user);
          setBotStats({
            total: bots.length,
            active: bots.filter(b => b.estado).length
          });
          // La información crítica ya está lista: muestra el dashboard mientras
          // las estadísticas agregadas continúan cargando en segundo plano.
          setLoading(false);

          // Estadísticas agregadas (admin/creator) desde el endpoint server-side
          // /stats: el servidor agrega con credenciales superuser, así devuelve
          // totales reales de users/bots/canales que el navegador no puede leer
          // (tg_channels tiene listRule=null y contiene bot_token; nunca se expone crudo).
          if (hasAdminRole(user) || hasAdminRole(currentUser)) {
            try {
              if (!statsPromise) statsPromise = requestStats();
              const stats = await statsPromise;

              setSystemStats({
                users: stats.users || 0,
                totalBots: stats.bots || 0,
                verified: stats.userStats?.verified || 0,
                frozen: stats.userStats?.frozen || 0,
                creators: stats.userStats?.creators || 0,
                admins: stats.userStats?.admins || 0,
              });
              setNewsStats({ total: stats.news?.total || 0, today: stats.news?.today || 0 });
              setChannelStats({ total: stats.channels?.total || 0, subscribers: stats.channels?.subscribers || 0 });
              setProxyStats({
                total: stats.proxies?.total || 0,
                active: stats.proxies?.active || 0,
                owners: stats.proxies?.owners || 0,
                lastUpdated: stats.proxies?.lastUpdated || null,
              });
            } catch (statsError) {
              // Degradación: si /stats falla, las tarjetas quedan a 0 (estado inicial).
              console.warn('No se pudieron cargar las estadísticas del dashboard (/stats):', statsError?.message || statsError);
            }
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderAdminContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="relative overflow-hidden group border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Panel de cuentas</CardTitle>
          <CardDescription>Usuarios, roles y estado de las cuentas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{systemStats.users}</p>
              <p className="text-sm text-muted-foreground">Usuarios</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{systemStats.verified}</p>
              <p className="text-sm text-muted-foreground">Verificados</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{systemStats.admins + systemStats.creators}</p>
              <p className="text-xs text-muted-foreground">Equipo administrador</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-foreground">{systemStats.frozen}</p>
              <p className="text-xs text-muted-foreground">Congeladas</p>
            </div>
          </div>
          <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
            <Link to="/admin">
              Gestionar cuentas
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group border-blue-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Noticias NW3</CardTitle>
          <CardDescription>Artículos publicados en NoticiasWeb3</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{newsStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Artículos</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${newsStats.today > 0 ? 'text-green-600' : 'text-foreground'}`}>
                {newsStats.today}
              </p>
              <p className="text-sm text-muted-foreground">Publicadas hoy</p>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" asChild>
            <a href="#creator-news">
              Gestionar NoticiasWeb3
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group border-cyan-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <Send className="w-6 h-6 text-cyan-600" />
          </div>
          <CardTitle>Canales Telegram</CardTitle>
          <CardDescription>Directorio de canales y suscriptores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{channelStats.total}</p>
              <p className="text-sm text-muted-foreground">Canales</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{channelStats.subscribers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Suscriptores</p>
            </div>
          </div>
          <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white transition-colors" asChild>
            <a href="https://canales.todosobreall.tech" target="_blank" rel="noopener noreferrer">
              Ver Canales
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group border-emerald-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Server className="w-6 h-6 text-emerald-600" />
          </div>
          <CardTitle>Proxies MTProto</CardTitle>
          <CardDescription>Proxies configurados para la comunidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{proxyStats.total}</p>
              <p className="text-sm text-muted-foreground">Proxies privados</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-foreground">
                {proxyStats.lastUpdated ? new Date(proxyStats.lastUpdated).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Última actualización</p>
            </div>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <p className="font-semibold text-green-600">{proxyStats.active}</p>
              <p className="text-muted-foreground">Proxies activos</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{proxyStats.owners}</p>
              <p className="text-muted-foreground">Usuarios con proxy</p>
            </div>
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" asChild>
            <Link to="/proxies">
              Ver Proxies
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>My Bots</CardTitle>
          <CardDescription>Configure and monitor your automated integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{botStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Bots</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{botStats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
          <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
            <Link to="/bots">
              View All Bots
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your membership details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(userData?.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Verification</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.verified ? 'Fully verified' : 'Pending verification'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${userData?.verified ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <Shield className={`w-5 h-5 ${userData?.verified ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{`Dashboard - ${currentUser?.name || 'User'} - Todo sobre alltech`}</title>
        <meta name="description" content="Manage your Todo sobre alltech account, view your profile information, and access personalized features." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome back, {userData?.name || 'User'}
              </h1>
              <Badge variant="outline" className="capitalize text-sm px-3 py-1">
                {userData?.role || 'user'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              Manage your account and explore your personalized dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>Your account details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.name || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{userData?.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Ver perfil
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Ajustes
                  </Link>
                </Button>
                {(userData?.role === 'admin' || userData?.role === 'creator') && (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/creator">
                        <Crown className="w-4 h-4 mr-2" />
                        Panel de creador
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/admin">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Gestionar cuentas
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/proxies">
                        <Network className="w-4 h-4 mr-2" />
                        Gestionar proxies
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="https://cintiabot.todosobrealltech/hub.html" target="_blank" rel="noreferrer">
                        <UsersRound className="w-4 h-4 mr-2" />
                        Administrar grupos Moonbot
                      </a>
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </Button>
              </CardContent>
            </Card>
          </div>

          {(userData?.role === 'admin' || userData?.role === 'creator') && renderAdminContent()}
          {(userData?.role === 'admin' || userData?.role === 'creator') && <DeferredPanel minHeight={240}><MoonbotAdminOverview /></DeferredPanel>}
          {(userData?.role === 'admin' || userData?.role === 'creator') && <DeferredPanel minHeight={420}><TelegramLanguageMap /></DeferredPanel>}
          {(userData?.role === 'admin' || userData?.role === 'creator') && (
            <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
              <DeferredPanel><CreatorAccountProxyManager /></DeferredPanel>
            </div>
          )}
          {(userData?.role === 'admin' || userData?.role === 'creator') && (
            <div id="creator-news" className="mt-8 scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
              <DeferredPanel><CreatorNewsManager /></DeferredPanel>
            </div>
          )}
          {(userData?.role === 'user' || !userData?.role) && renderUserContent()}
        </div>
      </div>
    </>
  );
};

// Helper icon component for the dashboard
const CalendarIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export default DashboardPage;
