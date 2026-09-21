import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import apiServerClient from '@/lib/apiServerClient';
import TelegramNetworkInventory from './TelegramNetworkInventory';
import TelegramCdnDiscovery from './TelegramCdnDiscovery';
const dcLocations = { dc1: 'Miami, EE. UU.', dc2: 'Ámsterdam, Países Bajos', 'dc2-alt': 'Ámsterdam, Países Bajos', dc3: 'Miami, EE. UU.', dc4: 'Ámsterdam, Países Bajos', dc5: 'Singapur' };
const ms = (value) => value == null ? '—' : `${value.toLocaleString('es-ES')} ms`;

export default function TelegramNetworkPanel({ client = apiServerClient }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const load = useCallback(async (signal) => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try {
      const response = await client.fetch('/moonbot-admin/cluster/network', { signal: signal || AbortSignal.timeout(6000) });
      const payload = await client.readJson(response);
      if (!response.ok || !payload.ok || !Array.isArray(payload.targets)) throw new Error(payload.error || 'No se pudo medir la red de Telegram');
      if (!signal?.aborted) { setData(payload); setError(''); }
    } catch (reason) { if (!signal?.aborted) setError(reason.message); }
    finally { running.current = false; if (!signal?.aborted) setBusy(false); }
  }, [client]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const timer = window.setInterval(() => { if (!document.hidden) load(controller.signal); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [load]);
  return <section className="space-y-4 rounded-xl border p-4" aria-label="Ping Telegram CDN y centros de datos"><header className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold">Ping · CDN y centros de datos de Telegram</h3><p className="mt-1 text-xs text-muted-foreground">Conexión TCP al puerto 443 desde el servidor API. No es ICMP ni tiempo de respuesta de MTProto; no envía mensajes.</p></div><Button variant="outline" size="sm" onClick={() => load()} disabled={busy}>{busy ? 'Midiendo…' : 'Actualizar medición'}</Button></header>
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>Origen: {data?.origin || 'servidor API'}</span><span>Ubicación del servidor API: {data?.originLocation || 'Sin configurar'}</span><span>Muestreo bajo demanda cada 30 s · hasta 60 muestras</span>{data && <time>Medido: {new Date(data.measuredAt).toLocaleTimeString()}</time>}</div>
    {error && <p role="alert" className="rounded-lg border border-amber-500/30 p-3 text-sm">{error}. {data ? 'Se conserva la última medición.' : ''}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{['Destino', 'IP / dominio', 'Ubicación de referencia', 'Estado', 'Último', 'Media', 'Mín. / máx.', 'Conexiones'].map((label) => <th className="whitespace-nowrap border-b p-2" key={label}>{label}</th>)}</tr></thead><tbody>{data?.targets.map((target) => <tr key={target.id}><td className="whitespace-nowrap p-2 font-medium">{target.label}</td><td className="p-2 font-mono text-xs">{target.host}:{target.port}</td><td className="p-2 text-xs">{dcLocations[target.id] || 'No confirmada · depende del destino DNS'}</td><td className={`whitespace-nowrap p-2 text-xs ${target.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{target.ok ? 'Conecta' : ['EACCES', 'EPERM'].includes(target.error) ? 'Bloqueado en origen' : target.error === 'TIMEOUT' ? 'Sin respuesta' : target.error}</td><td className="whitespace-nowrap p-2 tabular-nums">{ms(target.ms)}</td><td className="whitespace-nowrap p-2 tabular-nums">{ms(target.avgMs)}</td><td className="whitespace-nowrap p-2 text-xs tabular-nums">{ms(target.minMs)} / {ms(target.maxMs)}</td><td className="whitespace-nowrap p-2 text-xs">{target.successful}/{target.samples} correctas</td></tr>)}</tbody></table>{!data && <p className="p-4 text-sm text-muted-foreground">{busy ? 'Comprobando los destinos públicos de Telegram…' : 'Sin mediciones disponibles.'}</p>}</div>
    <p className="text-xs text-muted-foreground">Los dominios incluyen resolución DNS. Un fallo puede deberse a la red de este servidor; no demuestra una caída global. No se mide pérdida de paquetes ICMP.</p><p className="text-xs text-muted-foreground">DC: direcciones de arranque del <a className="underline" href="https://github.com/telegramdesktop/tdesktop/blob/dev/Telegram/SourceFiles/mtproto/mtproto_dc_options.cpp" target="_blank" rel="noreferrer">cliente oficial</a>. CDN: hosts públicos de medios observados en <a className="underline" href="https://t.me/s/telegram" target="_blank" rel="noreferrer">Telegram News</a>. Los CDN cifrados de MTProto se asignan dinámicamente y no se descubren con esta prueba.</p>
    <p className="text-xs text-muted-foreground">Ubicaciones DC según la <a className="underline" href="https://docs.pyrogram.org/faq/what-are-the-ip-addresses-of-telegram-data-centers" target="_blank" rel="noreferrer">documentación de Pyrogram</a>, consultada el 21/09/2026: referencia regional, no geolocalización en vivo ni garantía de la ubicación del punto de acceso. La Bot API utiliza su propio dominio; este panel no redirige bots al DC con menor ping.</p>
    <TelegramCdnDiscovery client={client} />
    <TelegramNetworkInventory />
  </section>;
}
