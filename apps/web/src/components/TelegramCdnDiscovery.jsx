import React, { useEffect, useState } from 'react';

export default function TelegramCdnDiscovery({ client }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await client.fetch('/moonbot-admin/cluster/cdn', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
        const result = await client.readJson(response);
        if (!response.ok || !result.ok) throw new Error(result.error || 'CDN no disponible');
        if (!controller.signal.aborted) { setData(result); setError(''); }
      } catch (reason) { if (!controller.signal.aborted) setError(reason.message); }
      finally { busy = false; }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [client]);
  const date = (value) => value ? new Date(value * 1000).toLocaleString() : '—';
  return <section className="space-y-2 rounded-lg border p-3 text-sm">
    <h4 className="font-semibold">CDN descubiertos por MTProto</h4>
    <p className="text-xs text-muted-foreground">Consulta help.getConfig desde Moonbot; renueva según la caducidad de Telegram. Estas direcciones aún no tienen medición de latencia asociada.</p>
    {error && <p role="alert">{error}</p>}
    {data && <><p>{!data.enabled ? 'Descubrimiento desactivado' : !data.configured ? 'Faltan API ID / API hash en Moonbot' : data.refreshing ? 'Consultando Telegram…' : data.stale ? 'Lista pendiente de renovación' : 'Lista vigente'}</p>
      <p className="text-xs">Consulta: {date(data.fetchedAt)} · Caduca: {date(data.expiresAt)}</p>
      {data.error && <p>{data.error}</p>}
      <ul>{data.targets?.map((target) => <li className="font-mono text-xs" key={`${target.dcId}-${target.host}-${target.port}`}>DC {target.dcId} · {target.host} · puerto {target.port}</li>)}</ul>
      {data.enabled && data.configured && !data.stale && !data.targets?.length && <p>Telegram no devolvió destinos CDN en esta consulta.</p>}</>}
  </section>;
}
