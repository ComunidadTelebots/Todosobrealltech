import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import apiServerClient from '@/lib/apiServerClient.js';

const ranges = [['24h', '24 horas'], ['7d', '7 días'], ['30d', '30 días'], ['90d', '90 días']];
const metricLabels = { view: 'Visitas web', impression: 'Impresiones Telegram', click: 'Clics' };

const MetricBars = ({ title, rows = [], limit = 16 }) => {
  const visible = rows.slice(-limit);
  const max = Math.max(1, ...visible.map((row) => Number(row.value || 0)));
  return <section className="rounded-xl border p-3"><h4 className="mb-3 text-sm font-semibold">{title}</h4><div className="space-y-2">{visible.map((row) => <div key={row.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-xs"><span className="truncate text-muted-foreground" title={row.label}>{row.label}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, Number(row.value || 0) * 100 / max)}%` }}/></div><b className="text-right">{Number(row.value || 0).toLocaleString('es-ES')}</b></div>)}{!visible.length && <p className="text-sm text-muted-foreground">Todavía no hay datos en este periodo.</p>}</div></section>;
};

export default function ContentAnalyticsDialog({ open, onOpenChange, kind, targetId, title }) {
  const metrics = kind === 'news' ? ['view', 'impression'] : ['click', 'impression'];
  const [metric, setMetric] = useState(metrics[0]);
  const [range, setRange] = useState('7d');
  const [country, setCountry] = useState('');
  const [data, setData] = useState(null);
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid', []);

  useEffect(() => {
    if (!open || !targetId) return undefined;
    const controller = new AbortController();
    setLoading(true); setError('');
    const query = new URLSearchParams({ kind, target_id: targetId, event: metric, range, timezone });
    if (country) query.set('country', country);
    apiServerClient.fetch(`/content-analytics?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await apiServerClient.readJson(response);
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la analítica');
        setData(payload);
        if (!country) setCountries(payload.countries || []);
      })
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, targetId, kind, metric, range, country, timezone]);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-600"/>Estadísticas de la publicación</DialogTitle><DialogDescription className="line-clamp-2">{title}</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2">{metrics.map((value) => <Button key={value} size="sm" variant={metric === value ? 'default' : 'outline'} onClick={() => { setMetric(value); setCountry(''); }}>{metricLabels[value]}</Button>)}{ranges.map(([value, label]) => <Button key={value} size="sm" variant={range === value ? 'secondary' : 'ghost'} onClick={() => setRange(value)}>{label}</Button>)}<select aria-label="Filtrar por país" className="h-9 rounded-md border bg-background px-3 text-sm" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Todos los países</option>{countries.map((row) => <option key={row.label} value={row.label}>{row.label} · {row.value}</option>)}</select></div>{loading ? <div className="grid min-h-56 place-items-center text-muted-foreground"><span className="flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Cargando estadísticas…</span></div> : error ? <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">{error}</p> : data && <><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><small className="text-muted-foreground">{metricLabels[metric]}</small><strong className="block text-2xl">{Number(data.total || 0).toLocaleString('es-ES')}</strong></div><div className="rounded-xl border p-3"><small className="text-muted-foreground">Total oficial Telegram</small><strong className="block text-2xl">{Number(data.official_telegram_total || 0).toLocaleString('es-ES')}</strong></div><div className="rounded-xl border p-3"><small className="text-muted-foreground">Zona horaria</small><strong className="block truncate text-sm">{data.timezone}</strong></div></div>{data.history_note && <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">{data.history_note}</p>}<div className="grid gap-3 lg:grid-cols-2"><MetricBars title="Por hora" rows={data.hourly}/><MetricBars title="Por día" rows={data.daily}/><MetricBars title="Por país" rows={data.countries}/><MetricBars title="Por ubicación" rows={data.placements}/></div></>}</DialogContent></Dialog>;
}
