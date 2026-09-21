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
  return <details className="rounded-lg border p-3 text-sm">
    <summary className="cursor-pointer font-medium">Redes publicadas por Telegram · 9 IPv4 y 5 IPv6</summary>
    <p className="mt-3 text-xs text-muted-foreground">Inventario de rangos CIDR, consultado el 21/09/2026. La latencia superior corresponde únicamente a los destinos medidos; un rango completo no tiene un ping único. No se escanean sus direcciones.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{networks.map((cidr) => <div key={cidr} className="flex items-center justify-between gap-2 rounded border px-3 py-2"><code className="text-xs">{cidr}</code><span className="text-xs text-muted-foreground">{cidr.includes(':') ? 'IPv6' : 'IPv4'}</span></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Fuente: <a className="underline" href="https://core.telegram.org/resources/cidr.txt" target="_blank" rel="noreferrer">lista oficial de Telegram</a>. Referencia adicional: <a className="underline" href="https://networksdb.io/ip-addresses-of/telegram-messenger-inc" target="_blank" rel="noreferrer">NetworksDB · Telegram Messenger Inc</a>. Un registro de organización no identifica por sí solo el DC, el servicio CDN ni su ubicación física.</p>
  </details>;
}
