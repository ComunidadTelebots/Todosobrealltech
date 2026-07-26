import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Bot, Clock3, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Server, UsersRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
const MoonbotGroupsManager = lazy(() => import('@/components/MoonbotGroupsManager.jsx'));
const MoonbotUsersManager = lazy(() => import('@/components/MoonbotUsersManager.jsx'));
const MoonbotSecurityCenter = lazy(() => import('@/components/MoonbotSecurityCenter.jsx'));
const MoonbotEditorialCenter = lazy(() => import('@/components/MoonbotEditorialCenter.jsx'));
const MoonbotLiveSafety = lazy(() => import('@/components/MoonbotLiveSafety.jsx'));
const MoonbotAdvancedUserActions = lazy(() => import('@/components/MoonbotAdvancedUserActions.jsx'));
const MoonbotAICenter = lazy(() => import('@/components/MoonbotAICenter.jsx'));
const MoonbotAIAdvancedTools = lazy(() => import('@/components/MoonbotAIAdvancedTools.jsx'));
const MoonbotAutomationsCenter = lazy(() => import('@/components/MoonbotAutomationsCenter.jsx'));
const MoonbotIntegrationsCenter = lazy(() => import('@/components/MoonbotIntegrationsCenter.jsx'));
const MoonbotOperationsCenter = lazy(() => import('@/components/MoonbotOperationsCenter.jsx'));
const MoonbotExperienceCenter = lazy(() => import('@/components/MoonbotExperienceCenter.jsx'));

const LazySection = ({ children, id }) => {
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
  return <div ref={ref} id={id} className="min-h-24">
    {visible && <Suspense fallback={<div className="mt-8 h-32 animate-pulse rounded-2xl border bg-muted/20" />}>{children}</Suspense>}
  </div>;
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border bg-muted/20 p-4">
    <Icon className="mb-2 h-4 w-4 text-cyan-600" />
    <div className="text-2xl font-bold">{value ?? 'â€”'}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const uptimeLabel = (seconds = 0) => {
  const hours = Math.floor(Number(seconds) / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} d ${hours % 24} h`;
  return `${hours} h ${Math.floor((Number(seconds) % 3600) / 60)} min`;
};

const MoonbotAdminOverview = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/dashboard', {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const summary = data?.summary || {};
  const resources = data?.resources || {};

  return (
    <>
    <Card className="mt-8 overflow-hidden border-cyan-500/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-cyan-600" />Centro de control Moonbot</CardTitle><CardDescription>Estado operativo real de bots, comunidades, recursos y tareas pendientes.</CardDescription></div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}
        {data && <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={Bot} label="Instancias conectadas" value={summary.instances_online} />
            <Metric icon={Activity} label="Usuarios activos (24 h)" value={summary.users_active_24h} />
            <Metric icon={UsersRound} label="Grupos administrados" value={summary.groups} />
            <Metric icon={Clock3} label="Acciones pendientes" value={data.pending?.total} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Recursos del servidor</h3><div className="space-y-2 text-sm"><p className="flex justify-between"><span className="flex gap-2"><Cpu className="h-4 w-4" />CPU</span><b>{resources.cpu ?? 'â€”'}%</b></p><p className="flex justify-between"><span className="flex gap-2"><MemoryStick className="h-4 w-4" />RAM</span><b>{resources.ram ?? 'â€”'}%</b></p><p className="flex justify-between"><span className="flex gap-2"><HardDrive className="h-4 w-4" />Disco</span><b>{resources.disk ?? 'â€”'}%</b></p></div></section>
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Servicios</h3><div className="space-y-2">{data.services?.map((service) => <div key={service.name} className="flex items-center justify-between text-sm"><span className="flex gap-2"><Database className="h-4 w-4" />{service.name}</span><Badge variant={service.status === 'online' ? 'default' : 'secondary'}>{service.status}</Badge></div>)}</div></section>
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Rendimiento por bot</h3><div className="space-y-3">{data.instances?.map((bot) => <div key={`${bot.id}-${bot.username}`} className="rounded-lg border bg-muted/20 p-3 text-sm"><div className="flex items-start justify-between gap-2"><span><b className="block">{bot.name || bot.username}</b><small className="text-muted-foreground">@{bot.username}</small></span><Badge variant={bot.status === 'online' ? 'default' : 'destructive'}>{bot.status}</Badge></div><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{bot.groups} grupos</span><span>{bot.updates_processed ?? 0} eventos</span><span>{bot.latency_ms == null ? 'latencia —' : `${bot.latency_ms} ms`}</span><span>{bot.api_errors ?? 0} errores API</span><span>Activo {uptimeLabel(bot.uptime_seconds)}</span><span>{bot.poll_failures ? `${bot.poll_failures} fallos polling` : 'polling correcto'}</span></div></div>)}{!data.instances?.length && <p className="text-sm text-muted-foreground">No hay instancias conectadas.</p>}</div></section>
          </div>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Actividad administrativa reciente</h3><div className="space-y-3">{data.timeline?.slice(0, 8).map((item, index) => <div key={`${item.time}-${index}`} className="flex gap-3 text-sm"><span className="min-w-36 text-muted-foreground">{item.time}</span><span>{item.action}</span></div>)}{!data.timeline?.length && <p className="text-sm text-muted-foreground">TodavÃ­a no hay actividad registrada.</p>}</div></section>
        </>}
      </CardContent>
    </Card>
    {data && <LazySection><MoonbotExperienceCenter groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-groups"><MoonbotGroupsManager groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-users"><MoonbotUsersManager groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-security"><MoonbotSecurityCenter /></LazySection>}
    {data && <LazySection><MoonbotEditorialCenter groups={data.groups || []} /></LazySection>}
    {data && <LazySection><MoonbotLiveSafety /></LazySection>}
    {data && <LazySection><MoonbotAdvancedUserActions groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-ai"><MoonbotAICenter groups={data.groups || []} /></LazySection>}
    {data && <LazySection><MoonbotAIAdvancedTools groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-automations"><MoonbotAutomationsCenter groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-integrations"><MoonbotIntegrationsCenter groups={data.groups || []} /></LazySection>}
    {data && <LazySection id="moon-operations"><MoonbotOperationsCenter groups={data.groups || []} /></LazySection>}
    </>
  );
};

export default MoonbotAdminOverview;
