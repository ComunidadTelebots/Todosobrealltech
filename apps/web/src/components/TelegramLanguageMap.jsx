import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Languages, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiServerClient from '@/lib/apiServerClient';

const continents = [
  'M80 105 L210 55 300 90 280 175 205 205 150 165 90 180 Z',
  'M260 230 L330 210 380 260 345 420 300 370 Z',
  'M430 80 L520 55 565 100 535 145 470 140 Z',
  'M470 160 L570 155 620 235 570 390 505 330 Z',
  'M555 75 L785 55 900 125 835 215 695 200 625 145 Z',
  'M800 300 L900 285 945 350 875 405 805 370 Z',
];

const project = ({ lat, lon }) => ({ x: ((Number(lon) + 180) / 360) * 1000, y: ((90 - Number(lat)) / 180) * 500 });

const TelegramLanguageMap = () => {
  const [data, setData] = useState({ points: [], total_users: 0, languages: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    apiServerClient.fetch('/telegram-language-map')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        setData(payload);
      })
      .catch((reason) => setError(reason.message));
  }, []);

  const points = useMemo(() => (data.points || []).filter((item) => item.mapped).map((item) => ({ ...item, ...project(item) })), [data]);

  return (
    <Card className="mt-8 overflow-hidden border-cyan-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-500" />Mapa lingüístico global de Telegram</CardTitle>
        <CardDescription>Distribución agregada según el idioma configurado en Telegram; no representa la ubicación física real.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border bg-muted/30 p-3"><Users className="mb-1 h-4 w-4 text-cyan-500" /><p className="text-2xl font-bold">{data.total_users}</p><p className="text-xs text-muted-foreground">Usuarios con idioma</p></div>
          <div className="rounded-xl border bg-muted/30 p-3"><Languages className="mb-1 h-4 w-4 text-violet-500" /><p className="text-2xl font-bold">{data.languages}</p><p className="text-xs text-muted-foreground">Idiomas detectados</p></div>
        </div>
        {error ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">{error}</div> : (
          <div className="overflow-hidden rounded-2xl border bg-slate-950">
            <svg viewBox="0 0 1000 500" role="img" aria-label="Mapa estimado por idioma de Telegram" className="h-auto w-full">
              <defs><radialGradient id="mapGlow"><stop offset="0" stopColor="#22d3ee" stopOpacity=".9" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient></defs>
              <rect width="1000" height="500" fill="#020617" />
              {[100, 200, 300, 400].map((y) => <line key={`y${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#1e293b" strokeWidth="1" />)}
              {[200, 400, 600, 800].map((x) => <line key={`x${x}`} x1={x} y1="0" x2={x} y2="500" stroke="#1e293b" strokeWidth="1" />)}
              {continents.map((path, index) => <path key={index} d={path} fill="#172554" stroke="#334155" strokeWidth="2" />)}
              {points.map((point) => {
                const radius = Math.max(7, Math.min(26, 6 + Math.sqrt(point.users) * 3));
                return <g key={point.language}><circle cx={point.x} cy={point.y} r={radius * 2.2} fill="url(#mapGlow)" /><circle cx={point.x} cy={point.y} r={radius} fill="#06b6d4" fillOpacity=".72" stroke="#a5f3fc" strokeWidth="2"><title>{point.label} ({point.language}): {point.users} usuarios · {point.percentage}%</title></circle><text x={point.x} y={point.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">{point.language.toUpperCase()}</text></g>;
              })}
            </svg>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">{(data.points || []).slice(0, 12).map((point) => <span key={point.language} className="rounded-full border px-3 py-1 text-xs">{point.label}: <b>{point.users}</b> ({point.percentage}%)</span>)}</div>
      </CardContent>
    </Card>
  );
};

export default TelegramLanguageMap;
