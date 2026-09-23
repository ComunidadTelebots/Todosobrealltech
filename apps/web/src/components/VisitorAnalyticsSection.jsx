import React, { useEffect, useState } from 'react';
import { Globe2, RefreshCw } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

const label = code => { try { return new Intl.DisplayNames(['es'], { type: 'region' }).of(code); } catch { return code; } };
const languageLabel = code => { try { return new Intl.DisplayNames(['es'], { type: 'language' }).of(code); } catch { return code; } };
function Ranking({ title, rows, format = v => v }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return <section className="rounded-xl border bg-card p-5"><h3 className="mb-4 font-semibold">{title}</h3><ol className="space-y-3">{rows.slice(0, 12).map(r => <li key={r.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{format(r.label)}</span><b>{r.value.toLocaleString('es')}</b></div><div className="h-1.5 rounded bg-muted"><div className="h-full rounded bg-cyan-500" style={{ width: `${r.value / max * 100}%` }} /></div></li>)}</ol>{!rows.length && <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>}</section>;
}
export default function VisitorAnalyticsSection({ initialSource = 'web' }) {
  const [source, setSource] = useState(initialSource);
  const telegram = source === 'telegram';
  const [origin, setOrigin] = useState('');
  const observations = telegram && Boolean(origin);
  const unit = observations ? 'observaciones de mensajes' : 'usuarios';
  const [range, setRange] = useState('7d');
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null); setLanguage('');
    apiServerClient.fetch(telegram ? `/telegram-language-map${origin ? `?origin=${origin}` : ''}` : `/visitor-analytics?range=${range}&source=${source}`, { signal: controller.signal })
      .then(async response => { const result = await apiServerClient.readJson(response); if (!response.ok || !result.ok) throw new Error(result.error || 'AnalÃ­tica no disponible'); if (!controller.signal.aborted) setData(telegram ? {
      totalRecorded: result.total_users, views: result.total_users,
      mapped: result.points.filter(p => p.mapped).reduce((n,p) => n + p.users, 0),
      unmapped: result.points.filter(p => !p.mapped).reduce((n,p) => n + p.users, 0),
      points: result.points.filter(p => p.mapped).map(p => ({ country: p.region_hint, lat: p.lat, lon: p.lon, views: p.users, languages: { [p.language]: p.users } })),
      languages: result.points.map(p => ({ label: p.language, value: p.users })),
      countries: [], cities: [], pages: [], devices: [], daily: [],
    } : result); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, reload, source, telegram, origin]);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><Globe2 className="text-cyan-500"/>Mapa de actividad</h2><p className="mt-1 text-sm text-muted-foreground">{telegram ? 'Usuarios cuyo idioma ha registrado Moonbot al recibir mensajes. PosiciÃ³n ilustrativa segÃºn idioma; no es geolocalizaciÃ³n ni conteo de mensajes.' : `Vistas de pÃ¡gina de ${source === 'hub' ? 'Hub' : 'la web'} con analÃ­tica habilitada. No son visitantes Ãºnicos ni peticiones de la API.`}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Origen del mapa" value={source} onChange={e => setSource(e.target.value)} className="rounded-lg border bg-background p-2"><option value="telegram">Telegram Â· idiomas</option><option value="web">Visitas de la web</option><option value="hub">Visitas del Hub</option></select>{telegram && <select aria-label="Tipo de chat Telegram" value={origin} onChange={e => setOrigin(e.target.value)} className="rounded-lg border bg-background p-2"><option value="">Histórico de usuarios · todos</option><option value="private">Chat privado / usuario</option><option value="group">Grupo / supergrupo</option><option value="channel">Canal</option></select>}<select disabled={telegram} aria-label="Periodo de visitas" value={range} onChange={e => setRange(e.target.value)} className="rounded-lg border bg-background p-2">{[['24h','Ãšltimas 24 horas'],['7d','Ãšltimos 7 dÃ­as'],['30d','Ãšltimos 30 dÃ­as'],['90d','Ãšltimos 90 dÃ­as']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><button aria-label="Actualizar visitas" disabled={loading} onClick={() => setReload(v => v + 1)} className="rounded-lg border p-2"><RefreshCw className="h-5 w-5"/></button></div></div>
    {loading ? <p role="status">Cargando visitas registradasâ€¦</p> : error ? <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">{error}</p> : data && <>
      <div className="grid gap-3 sm:grid-cols-4">{[[telegram ? (observations ? 'Observaciones registradas' : 'Usuarios con idioma') : 'Vistas registradas',data.totalRecorded],[telegram ? (observations ? 'Observaciones analizadas' : 'Usuarios analizados') : 'Vistas analizadas',data.views],[telegram ? 'Con referencia lingÃ¼Ã­stica' : 'Con ubicaciÃ³n aproximada',data.mapped],[telegram ? 'Sin referencia en el mapa' : 'Sin ubicaciÃ³n',data.unmapped]].map(([name,value]) => <div className="rounded-xl border bg-card p-4" key={name}><p className="text-sm text-muted-foreground">{name}</p><strong className="text-3xl">{value.toLocaleString('es')}</strong></div>)}</div>
      {data.truncated && <p role="status" className="text-amber-600">El mapa y los desgloses representan las Ãºltimas 10.000 vistas del periodo. Reduce el periodo para analizar menos datos.</p>}
      {!data.views && <p className="rounded-xl border p-4">{telegram ? 'Moonbot todavÃ­a no tiene idiomas registrados para mostrar.' : 'TodavÃ­a no hay visitas registradas en este periodo. Se mostrarÃ¡n tras desplegar la recogida y habilitar la analÃ­tica.'}</p>}
      <div className="overflow-hidden rounded-2xl border bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-2 p-4 text-slate-200"><span>{telegram ? 'DistribuciÃ³n por idioma Â· histÃ³rico disponible' : 'UbicaciÃ³n aproximada por IP Â· agrupada a grados enteros'}</span><select aria-label="Idioma del mapa" className="rounded border border-slate-600 bg-slate-900 p-2" value={language} onChange={e => setLanguage(e.target.value)}><option value="">Todos los idiomas</option>{data.languages.map(r => <option value={r.label} key={r.label}>{languageLabel(r.label)}</option>)}</select></div><svg viewBox="0 0 1000 500" role="img" aria-label={telegram ? 'Mapa lingÃ¼Ã­stico de usuarios de Telegram' : 'Mapa de visitas por ubicaciÃ³n aproximada'}><image href="/world-outline.svg" width="1000" height="500"/>{data.points.map(p => { const count = language ? (p.languages[language] || 0) : p.views; if (!count) return null; return <circle key={`${p.country}:${p.lat}:${p.lon}:${Object.keys(p.languages).join()}`} cx={(p.lon + 180) / 360 * 1000} cy={(90 - p.lat) / 180 * 500} r={Math.min(24, 4 + Math.sqrt(count) * 2)} fill="#22d3ee" fillOpacity=".65" stroke="#cffafe"><title>{label(p.country)}: {count} {telegram ? unit : 'vistas'} Â· {Object.entries(p.languages).map(([l,n]) => `${languageLabel(l)}: ${n}`).join(', ')}</title></circle>; })}</svg></div>
      <p className="text-xs text-muted-foreground">{telegram ? 'Telegram no facilita la IP del remitente. Los puntos representan idiomas, no paÃ­ses de residencia. Los canales pueden no aportar idioma del remitente: se muestran como desconocido. Sin filtro temporal para este histórico.' : 'El selector de idioma filtra solo el mapa. El idioma procede del navegador; no implica nacionalidad. Las VPN y redes mÃ³viles pueden alterar la ubicaciÃ³n. Fechas en UTC.'} CartografÃ­a: Natural Earth (dominio pÃºblico).</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!telegram && <><Ranking title="PaÃ­ses" rows={data.countries} format={v => v === 'UNK' ? 'PaÃ­s desconocido' : label(v)}/><Ranking title="Ciudades aproximadas" rows={data.cities}/><Ranking title="Secciones consultadas" rows={data.pages}/><Ranking title="Dispositivos" rows={data.devices}/><Ranking title="Vistas por dÃ­a Â· UTC" rows={data.daily.slice(-12)}/></>}<Ranking title={telegram ? "Idiomas de Telegram" : "Idiomas del navegador"} rows={data.languages} format={languageLabel}/></div>
    </>}
  </div>;
}
