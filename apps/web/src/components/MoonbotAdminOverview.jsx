import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bot, Clock3, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Server, UsersRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import MoonbotGroupsManager from '@/components/MoonbotGroupsManager.jsx';
import MoonbotUsersManager from '@/components/MoonbotUsersManager.jsx';
import MoonbotSecurityCenter from '@/components/MoonbotSecurityCenter.jsx';

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border bg-muted/20 p-4">
    <Icon className="mb-2 h-4 w-4 text-cyan-600" />
    <div className="text-2xl font-bold">{value ?? 'â€”'}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

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
            <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Rendimiento por bot</h3><div className="space-y-2">{data.instances?.map((bot) => <div key={`${bot.id}-${bot.username}`} className="flex items-center justify-between text-sm"><span>@{bot.username}</span><span><b>{bot.groups}</b> grupos</span></div>)}{!data.instances?.length && <p className="text-sm text-muted-foreground">No hay instancias conectadas.</p>}</div></section>
          </div>
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Actividad administrativa reciente</h3><div className="space-y-3">{data.timeline?.slice(0, 8).map((item, index) => <div key={`${item.time}-${index}`} className="flex gap-3 text-sm"><span className="min-w-36 text-muted-foreground">{item.time}</span><span>{item.action}</span></div>)}{!data.timeline?.length && <p className="text-sm text-muted-foreground">TodavÃ­a no hay actividad registrada.</p>}</div></section>
        </>}
      </CardContent>
    </Card>
    {data && <MoonbotGroupsManager groups={data.groups || []} />}
    {data && <MoonbotUsersManager groups={data.groups || []} />}
    {data && <MoonbotSecurityCenter />}
    </>
  );
};

export default MoonbotAdminOverview;
