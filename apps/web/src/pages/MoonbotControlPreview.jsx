import React from 'react';
import MoonbotMessageRanking from '@/components/MoonbotMessageRanking.jsx';
import MoonbotLoadBalancer from '@/components/MoonbotLoadBalancer.jsx';
import MoonbotEnvironments from '@/components/MoonbotEnvironments.jsx';

const rankingPreview = {
  fetch: async (url) => ({ ok: true, url }),
  readJson: async (response) => {
    const params = new URL(response.url, 'http://localhost').searchParams;
    const days = Number(params.get('days')); const kind = params.get('kind');
    const rows = [{ id: '-10001', name: 'Telebots · ejemplo', types: { text: 120, photo: 32, voice: 8 } }, { id: '-10002', name: 'Moonbot · ejemplo', types: { text: 80, video: 42, sticker: 60 } }].map(row => {
      const types = Object.fromEntries(Object.entries(row.types).map(([key, value]) => [key, value * days]));
      const total = Object.values(types).reduce((a, b) => a + b, 0);
      return { ...row, types, total, score: kind === 'all' ? total : types[kind] || 0 };
    }).filter(row => row.score).sort((a, b) => b.score - a.score);
    return { ok: true, rows, total: rows.reduce((sum, row) => sum + row.score, 0), chats: rows.length, observed_since: Date.now() / 1000 - days * 86400 };
  },
};

const environmentPreview = {
  fetch: async () => ({ ok: true }),
  readJson: async () => ({ ok: true, canManage: true, source: 'creator', configured: true, accessReady: true,
    security: { available: true, rules: [{ kind: 'denied_open', title: 'Accesos reiterados sin permiso', threshold: 5 }], alerts: [
      { id: 'demo-denied', kind: 'denied_open', actor: 'admin-demo-ana', target: 'moon-dev', status: 'open', severity: 'warning', count: 6, lastAt: Date.now(), title: 'Accesos reiterados sin permiso', explanation: 'Ejemplo: seis aperturas de desarrollo denegadas en cinco minutos. Revisa si se trata de un enlace antiguo o un intento de acceso indebido.' },
      { id: 'demo-grant', kind: 'broad_grant', actor: 'creador-demo', scope: 'global', added: ['moon-rc'], status: 'reviewed', severity: 'warning', count: 1, lastAt: Date.now() - 600000, reviewedAt: Date.now() - 300000, reviewedBy: 'creador-demo', outcome: 'expected', title: 'Ampliación de permisos para revisar', explanation: 'Ejemplo: se concedió acceso general a RC.' },
    ] },
    targets: ['dev', 'alpha', 'beta', 'rc'].map((channel) => ({ id: `moon-${channel}`, channel,
      name: `Moonbot ${channel === 'alpha' ? 'Alfa' : channel.toUpperCase()}`, version: `18.23.17-${channel}.3`,
      host: `moon-${channel}.todosobreall.tech`, url: `https://moon-${channel}.todosobreall.tech` })),
    global: { scope: 'global', mode: 'custom', targets: ['moon-rc'], revision: 1 },
    accounts: [
      { id: 'admin-demo-ana', name: 'Ana · ejemplo', policy: { scope: 'admin-demo-ana', mode: 'custom', targets: ['moon-alpha', 'moon-beta'], revision: 1 } },
      { id: 'admin-demo-luis', name: 'Luis · ejemplo', policy: { scope: 'admin-demo-luis', mode: 'inherit', targets: [], revision: 1 } },
    ],
  }),
};

// This fixture is imported only by the development route. No live requests.
const minute = Math.floor(Date.now() / 60000) * 60000;
const history = Array.from({ length: 20 }, (_, i) => ({ at: new Date(minute - (19 - i) * 60000).toISOString(), received: 90 + (i * 17 % 80), sent: 35 + (i * 13 % 45), calls: 140 + (i * 19 % 100), requests: 220 + (i * 23 % 130), errors5xx: i === 12 ? 8 : 0 }));
const traffic = { updates: 196, received: 164, sent: 72, calls: 248, errors: 3, limited: 2, timeouts: 1, retry_after_max: 7, latency_ms: 128960, http: 180, http_errors: 1 };
const http = { requests: 342, errors4xx: 4, errors5xx: 0, limited: 1, aborted: 0, avgMs: 84, p95Ms: 250, p95Overflow: false };
const previewNetwork = { ok: true, measuredAt: new Date().toISOString(), origin: 'Ejemplo · servidor simulado', intervalSeconds: 30,
  targets: [['DC 1', '149.154.175.50', 108], ['DC 2', '149.154.167.51', 32], ['DC 2 · alternativo', '95.161.76.100', 35], ['DC 3', '149.154.175.100', 112], ['DC 4', '149.154.167.91', 34], ['DC 5', '149.154.171.5', 184], ['CDN público 1', 'cdn1.telesco.pe', 25], ['CDN público 4', 'cdn4.telesco.pe', 28], ['Bot API', 'api.telegram.org', 31]].map(([label, host, latency], i) => ({ id: ['dc1', 'dc2', 'dc2-alt', 'dc3', 'dc4', 'dc5', 'cdn1', 'cdn4', 'bot-api'][i], label, host, port: 443, ok: true, ms: latency, avgMs: latency + 2, minMs: latency - 3, maxMs: latency + 9, successful: 20, samples: 20 })),
};
const client = {
  fetch: async (endpoint) => ({ ok: true, endpoint }),
  readJson: async (response) => response.endpoint?.endsWith('/cdn') ? { ok: true, enabled: false, configured: false, stale: true, targets: [] } : response.endpoint?.endsWith('/network') ? previewNetwork : ({ ok: true, configured: true, active: 'moon-primary', busy: false, observedAt: new Date().toISOString(),
    nodes: [{ id: 'moon-primary', container: 'moonbot', running: true, status: 'running', healthy: true, restarts: 1, oomKilled: false, limits: { memoryBytes: 4294967296, cpus: 2, pids: 256 } }, { id: 'moon-reserve', container: 'moonbot-backup', running: false, status: 'exited', healthy: false }],
    balancer: { active: true, workers: 8, processed_sources: 42, words: 128400, rate: '2150 p/min', plan: { planned_workers: 8, max_workers: 12 } },
    operations: { bots: [{ id: 'aabbccddeeff', last60s: { received: 140, calls: 210, sent: 60, errors: 2, limited: 1 } }, { id: '112233445566', last60s: { received: 24, calls: 38, sent: 12, errors: 1, limited: 1 } }, { id: 'abcdef123456', last60s: { received: 0, calls: 0, sent: 0, errors: 0, limited: 0 } }], since: new Date(minute - 7200000).toISOString(), last60s: traffic, total: { ...traffic, received: 18742, sent: 8450, calls: 28400 }, history },
    api: { since: new Date(minute - 7200000).toISOString(), inflight: 3, last60s: http, total: { ...http, requests: 42180 }, history, routes: [{ family: 'moonbot-admin', ...http, requests: 14300 }, { family: 'bots', ...http, requests: 8240 }, { family: 'auth', ...http, requests: 3200 }] },
    resources: { cpu: 42, ram: 68, ramUsedGb: 5.4, ramTotalGb: 8, disk: 72, uptime: '2:04:12', version: 'v16.85.0' },
    telemetryErrors: [], events: [],
  }),
};
export default function MoonbotControlPreview() {
  return <main className="mx-auto max-w-7xl px-4 py-8"><div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><b>Vista previa local · datos de ejemplo</b><p className="text-sm">Esta pantalla permite revisar el diseño sin PocketBase ni Docker. Las acciones sobre Docker están deshabilitadas; puedes probar los filtros del ranking. En el Dashboard encontrarás Versiones y entornos y Balanceo y contenedores.</p></div><MoonbotMessageRanking client={rankingPreview} /><MoonbotEnvironments client={environmentPreview} readOnly /><MoonbotLoadBalancer client={client} readOnly /></main>;
}
