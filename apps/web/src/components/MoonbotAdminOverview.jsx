import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, BellRing, Bot, Clock3, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Server, UsersRound } from 'lucide-react';
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
const MoonbotModerationProductivity = lazy(() => import('@/components/MoonbotModerationProductivity.jsx'));
const HouseAdsManager = lazy(() => import('@/components/HouseAdsManager.jsx'));
const MoonbotTelegramChat = lazy(() => import('@/components/MoonbotTelegramChat.jsx'));
const RoadmapProgressPanel = lazy(() => import('@/components/RoadmapProgressPanel.jsx'));
const MoonbotFeatureCenter = lazy(() => import('@/components/MoonbotFeatureCenter.jsx'));

const MASTER_SECTIONS = [
  ['Experiencia y preferencias', 'moon-experience'],
  ['Grupos', 'moon-groups'],
  ['Canales', 'moon-channels'],
  ['Chat de Telegram', 'moon-chat'],
  ['Anuncios propios', 'moon-house-ads'],
  ['Usuarios y baneos', 'moon-users'],
  ['Seguridad', 'moon-security'],
  ['Moderación productiva', 'moon-moderation-productivity'],
  ['Editorial y comunicados', 'moon-editorial'],
  ['Protección en directo', 'moon-live-safety'],
  ['Acciones avanzadas', 'moon-advanced-users'],
  ['Moon IA', 'moon-ai'],
  ['Herramientas IA', 'moon-ai-tools'],
  ['Automatizaciones', 'moon-automations'],
  ['Integraciones', 'moon-integrations'],
  ['Operaciones', 'moon-operations'],
  ['Funciones verificadas', 'moon-features'],
];

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
  const [activeSection, setActiveSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('moon');
    let saved = '';
    try { saved = window.localStorage.getItem('moon_dashboard_section') || ''; } catch {}
    const candidate = requested || saved;
    return MASTER_SECTIONS.some(([, id]) => id === candidate) ? candidate : '';
  });

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
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeSection) url.searchParams.set('moon', activeSection); else url.searchParams.delete('moon');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    try { window.localStorage.setItem('moon_dashboard_section', activeSection); } catch {}
  }, [activeSection]);
  const summary = data?.summary || {};
  const resources = data?.resources || {};
  const telegramGroups = (data?.groups || []).filter((group) => String(group.ctype || group.type || '').toLowerCase() !== 'channel');
  const telegramChannels = (data?.groups || []).filter((group) => String(group.ctype || group.type || '').toLowerCase() === 'channel');
  const openSection = (id) => {
    setActiveSection(id);
    window.setTimeout(() => document.getElementById('moon-active-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const activeLabel = MASTER_SECTIONS.find(([, id]) => id === activeSection)?.[0];
  const activePanel = activeSection === 'moon-experience' ? <MoonbotExperienceCenter groups={data?.groups || []} />
    : activeSection === 'moon-groups' ? <MoonbotGroupsManager groups={telegramGroups} entityType="group" />
      : activeSection === 'moon-channels' ? <MoonbotGroupsManager groups={telegramChannels} entityType="channel" />
        : activeSection === 'moon-chat' ? <MoonbotTelegramChat bots={data?.instances || []} />
        : activeSection === 'moon-house-ads' ? <HouseAdsManager groups={data?.groups || []} />
          : activeSection === 'moon-users' ? <MoonbotUsersManager groups={data?.groups || []} />
            : activeSection === 'moon-security' ? <MoonbotSecurityCenter />
              : activeSection === 'moon-moderation-productivity' ? <MoonbotModerationProductivity />
                : activeSection === 'moon-editorial' ? <MoonbotEditorialCenter groups={data?.groups || []} />
                  : activeSection === 'moon-live-safety' ? <MoonbotLiveSafety />
                    : activeSection === 'moon-advanced-users' ? <MoonbotAdvancedUserActions groups={data?.groups || []} />
                      : activeSection === 'moon-ai' ? <MoonbotAICenter groups={data?.groups || []} />
                        : activeSection === 'moon-ai-tools' ? <MoonbotAIAdvancedTools groups={data?.groups || []} />
                          : activeSection === 'moon-automations' ? <MoonbotAutomationsCenter groups={data?.groups || []} />
                            : activeSection === 'moon-integrations' ? <MoonbotIntegrationsCenter groups={data?.groups || []} />
                              : activeSection === 'moon-operations' ? <MoonbotOperationsCenter groups={data?.groups || []} />
                                : activeSection === 'moon-features' ? <MoonbotFeatureCenter /> : null;

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
          <RoadmapProgressPanel />
          {!!data.notifications?.length && <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><BellRing className="h-5 w-5 text-violet-600" />Avisos de Moonbot</h3><div className="space-y-2">{data.notifications.slice(0, 3).map((notice) => <div key={notice.id} className="rounded-lg border bg-background/80 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{notice.title}</b><Badge variant={notice.status === 'failed' ? 'destructive' : 'secondary'}>{notice.status === 'failed' ? 'Falló' : 'Entregada'}</Badge></div><p className="mt-1 text-muted-foreground">{notice.body}</p><time className="mt-1 block text-xs text-muted-foreground">{notice.created_at ? new Date(notice.created_at).toLocaleString() : ''}</time></div>)}</div></section>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={Bot} label="Instancias conectadas" value={summary.instances_online} />
            <Metric icon={Activity} label="Usuarios activos (24 h)" value={summary.users_active_24h} />
            <Metric icon={UsersRound} label={`Grupos administrados · ${summary.shared_groups ?? 0} compartidos`} value={summary.groups} />
            <Metric icon={Clock3} label="Acciones pendientes" value={data.pending?.total} />
          </div>
          <section className="rounded-xl border p-4">
            <h3 className="font-semibold">Acciones master</h3>
            <p className="mb-3 text-sm text-muted-foreground">Los mismos centros de gestión de la MiniApp, organizados para la web.</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {MASTER_SECTIONS.map(([label, id]) => (
                <Button key={id} variant={activeSection === id ? 'default' : 'outline'} className="h-auto justify-start py-3 text-left" onClick={() => openSection(id)}>
                  {label}
                </Button>
              ))}
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Recursos del servidor</h3><div className="space-y-2 text-sm"><p className="flex justify-between"><span className="flex gap-2"><Cpu className="h-4 w-4" />CPU</span><b>{resources.cpu ?? 'â€”'}%</b></p><p className="flex justify-between"><span className="flex gap-2"><MemoryStick className="h-4 w-4" />RAM</span><b>{resources.ram ?? 'â€”'}%</b></p><p className="flex justify-between"><span className="flex gap-2"><HardDrive className="h-4 w-4" />Disco</span><b>{resources.disk ?? 'â€”'}%</b></p></div></section>
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Servicios</h3><div className="space-y-2">{data.services?.map((service) => <div key={service.name} className="flex items-center justify-between text-sm"><span className="flex gap-2"><Database className="h-4 w-4" />{service.name}</span><Badge variant={service.status === 'online' ? 'default' : 'secondary'}>{service.status}</Badge></div>)}</div></section>
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Rendimiento por bot</h3><div className="space-y-3">{data.instances?.map((bot) => <div key={`${bot.id}-${bot.username}`} className="rounded-lg border bg-muted/20 p-3 text-sm"><div className="flex items-start justify-between gap-2"><span><b className="block">{bot.name || bot.username}</b><small className="text-muted-foreground">@{bot.username}</small></span><Badge variant={bot.status === 'online' ? 'default' : 'destructive'}>{bot.status}</Badge></div><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{bot.groups} grupos totales</span><span>{bot.exclusive_groups ?? 0} exclusivos</span><span>{bot.shared_groups ?? 0} compartidos</span><span>{bot.updates_processed ?? 0} eventos</span><span>{bot.latency_ms == null ? 'latencia —' : `${bot.latency_ms} ms`}</span><span>{bot.api_errors ?? 0} errores API</span><span>Activo {uptimeLabel(bot.uptime_seconds)}</span><span>{bot.poll_failures ? `${bot.poll_failures} fallos polling` : 'polling correcto'}</span></div></div>)}{!data.instances?.length && <p className="text-sm text-muted-foreground">No hay instancias conectadas.</p>}</div></section>
          </div>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Actividad administrativa reciente</h3><div className="space-y-3">{data.timeline?.slice(0, 8).map((item, index) => <div key={`${item.time}-${index}`} className="flex gap-3 text-sm"><span className="min-w-36 text-muted-foreground">{item.time}</span><span>{item.action}</span></div>)}{!data.timeline?.length && <p className="text-sm text-muted-foreground">TodavÃ­a no hay actividad registrada.</p>}</div></section>
        </>}
      </CardContent>
    </Card>
    {data && activePanel && <section id="moon-active-panel" className="scroll-mt-24"><div className="mt-6 flex items-center justify-between rounded-xl border bg-background p-3"><Button variant="ghost" onClick={() => setActiveSection('')}><ArrowLeft className="mr-2 h-4 w-4" />Volver al índice</Button><Badge variant="secondary">{activeLabel}</Badge></div><Suspense fallback={<div className="mt-4 h-40 animate-pulse rounded-2xl border bg-muted/20" />}>{activePanel}</Suspense></section>}
    </>
  );
};

export default MoonbotAdminOverview;
