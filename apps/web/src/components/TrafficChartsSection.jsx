import React, { useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrafficChartsSection({ dateRange = '7d' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    const range = ['24h', '7d', '30d', '90d'].includes(dateRange) ? dateRange : '7d';
    apiServerClient.fetch(`/visitor-analytics?source=web&range=${range}`, { signal: controller.signal })
      .then(async response => {
        const body = await apiServerClient.readJson(response);
        if (!response.ok || !body.ok) throw new Error(body.error || 'No se puede consultar el tráfico real.');
        if (!controller.signal.aborted) setData(body);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [dateRange]);
  if (error) return <p role="alert" className="rounded-xl border p-4 text-amber-600">{error}</p>;
  if (!data) return <p role="status">Cargando tráfico registrado…</p>;
  return <section className="space-y-4">
    <p className="text-sm text-muted-foreground">Vistas de página registradas con consentimiento. No representan visitantes únicos. {data.recentViews ?? 0} vistas en los últimos 5 minutos de esta lectura.</p>
    {data.truncated && <p className="text-amber-600">Los gráficos utilizan las últimas 10.000 vistas del periodo.</p>}
    {!data.views && <p className="rounded-xl border p-4">Todavía no hay visitas registradas para este periodo.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Vistas por día · UTC</CardTitle></CardHeader><CardContent>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily}>
          <XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/>
          <Line dataKey="value" name="Vistas registradas" stroke="#0891b2" type="linear" />
        </LineChart></ResponsiveContainer></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Vistas por hora · UTC</CardTitle></CardHeader><CardContent>
        <p className="mb-2 text-xs text-muted-foreground">Hora actual y las 23 anteriores.</p>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.hourly || []}>
          <XAxis dataKey="at" tickFormatter={v => v.slice(11,16)}/><YAxis allowDecimals={false}/><Tooltip labelFormatter={v => String(v).replace('T',' ').slice(0,16)+' UTC'}/>
          <Bar dataKey="value" name="Vistas registradas" fill="#0891b2"/>
        </BarChart></ResponsiveContainer></div>
      </CardContent></Card>
    </div>
  </section>;
}
