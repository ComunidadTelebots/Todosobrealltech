import React from 'react';

// Snapshot of https://core.telegram.org/resources/cidr.txt, 2026-09-21.
const networks = [
  '91.108.56.0/22', '91.108.4.0/22', '91.108.8.0/22',
  '91.108.16.0/22', '91.108.12.0/22', '149.154.160.0/20',
  '91.105.192.0/23', '91.108.20.0/22', '185.76.151.0/24',
  '2001:b28:f23d::/48', '2001:b28:f23f::/48', '2001:67c:4e8::/48',
  '2001:b28:f23c::/48', '2a0a:f280::/32',
];

export default function TelegramNetworkInventory() {
  return <div className="space-y-3"><details className="rounded-lg border p-3 text-sm">
    <summary className="cursor-pointer font-medium">Redes publicadas por Telegram · 9 IPv4 y 5 IPv6</summary>
    <p className="mt-3 text-xs text-muted-foreground">Inventario de rangos CIDR, consultado el 21/09/2026. La latencia superior corresponde únicamente a los destinos medidos; un rango completo no tiene un ping único. No se escanean sus direcciones.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{networks.map((cidr) => <div key={cidr} className="flex items-center justify-between gap-2 rounded border px-3 py-2"><code className="text-xs">{cidr}</code><span className="text-xs text-muted-foreground">{cidr.includes(':') ? 'IPv6' : 'IPv4'}</span></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Fuente: <a className="underline" href="https://core.telegram.org/resources/cidr.txt" target="_blank" rel="noreferrer">lista oficial de Telegram</a>. Referencia adicional: <a className="underline" href="https://networksdb.io/ip-addresses-of/telegram-messenger-inc" target="_blank" rel="noreferrer">NetworksDB · Telegram Messenger Inc</a>. Un registro de organización no identifica por sí solo el DC, el servicio CDN ni su ubicación física.</p>
  </details>
    <details className="rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">CDN regionales · alcance y evidencia de ubicación</summary>
      <p className="mt-3 text-xs text-muted-foreground">El anuncio oficial del 23/07/2017 describe mejoras de descarga de medios públicos para estas regiones. Es una referencia histórica de cobertura, no un inventario actual de servidores ni una medición de disponibilidad.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{['Sudamérica', 'Turquía', 'Indonesia', 'India', 'Irán', 'Irak'].map((region) => <div className="rounded border p-3" key={region}><strong>{region}</strong><p className="mt-1 text-xs text-muted-foreground">Región citada · ciudad e IP no publicadas en el anuncio · sin ping asociado</p></div>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Azerbaiyán: NetworksDB atribuye a ese país el rango CDN 91.108.20.0/22. Esto no confirma Bakú, la capacidad de interconexión ni la ubicación física de cada dirección.</p>
      <p className="mt-2 text-xs text-muted-foreground">Bakú, Teherán, Yakarta, Estambul, São Paulo y Buenos Aires: ciudades no confirmadas por las fuentes aportadas. No se vinculan a los destinos medidos.</p>
      <p className="mt-2 text-xs text-muted-foreground">Fuentes: <a className="underline" href="https://telegram.org/blog/encrypted-cdns" target="_blank" rel="noreferrer">anuncio oficial de CDN (2017)</a> · <a className="underline" href="https://networksdb.io/ip-addresses-of/telegram-messenger-inc" target="_blank" rel="noreferrer">inventario NetworksDB</a>. Consultadas el 21/09/2026.</p>
    </details>
  </div>;
}
