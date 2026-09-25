import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import pb from '@/lib/pocketbaseClient.js';
import { BarChart3, Users, Bot, Network } from 'lucide-react';
import StatCard from '@/components/StatCard.jsx';
import TrafficChartsSection from '@/components/TrafficChartsSection.jsx';
import VisitorAnalyticsSection from '@/components/VisitorAnalyticsSection.jsx';

const inventory = [
  { collection: 'users', title: 'Usuarios registrados', icon: Users },
  { collection: 'bots', title: 'Bots registrados', icon: Bot },
  { collection: 'onion_webs', title: 'Webs onion registradas', icon: Network },
];

export default function AdminStatisticsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.allSettled(inventory.map(({ collection }) =>
      pb.collection(collection).getList(1, 1, { requestKey: null })
    )).then(results => { if (active) setMetrics(results); });
    return () => { active = false; };
  }, []);
  return <>
    <Helmet><title>Estadísticas y mapa de actividad</title></Helmet>
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-12">
      <div className="container max-w-7xl space-y-8">
        <header>
          <h1 className="flex items-center gap-3 text-3xl font-bold"><BarChart3 className="text-primary"/>Estadísticas de actividad</h1>
          <p className="mt-2 text-muted-foreground">Visitas registradas en la web y el Hub, e idiomas observados en Telegram.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          {inventory.map((item, index) => <StatCard key={item.collection} icon={item.icon} title={item.title}
            value={!metrics ? 'Cargando…' : metrics[index].status === 'fulfilled' ? metrics[index].value.totalItems.toLocaleString('es') : 'No disponible'}
            description="Total actual del registro; no indica actividad ni visitantes únicos." />)}
        </div>
        <VisitorAnalyticsSection selectedRange={dateRange} onRangeChange={setDateRange}/>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tráfico de la web · mismo periodo del mapa</h2>
          <TrafficChartsSection dateRange={dateRange}/>
        </section>
      </div>
    </div>
  </>;
}
