import React from 'react';
import MoonbotLoadBalancer from '@/components/MoonbotLoadBalancer.jsx';

// This fixture is imported only by the development route. No live requests.
const minute = Math.floor(Date.now() / 60000) * 60000;
const history = Array.from({ length: 20 }, (_, i) => ({ at: new Date(minute - (19 - i) * 60000).toISOString(), received: 90 + (i * 17 % 80), sent: 35 + (i * 13 % 45), calls: 140 + (i * 19 % 100), requests: 220 + (i * 23 % 130), errors5xx: i === 12 ? 8 : 0 }));
const traffic = { updates: 196, received: 164, sent: 72, calls: 248, errors: 3, limited: 2, timeouts: 1, retry_after_max: 7, latency_ms: 128960, http: 180, http_errors: 1 };
const http = { requests: 342, errors4xx: 4, errors5xx: 0, limited: 1, aborted: 0, avgMs: 84, p95Ms: 250, p95Overflow: false };
const client = {
  fetch: async () => ({ ok: true }),
  readJson: async () => ({ ok: true, configured: true, active: 'moon-primary', busy: false, observedAt: new Date().toISOString(),
    nodes: [{ id: 'moon-primary', container: 'moonbot', running: true, status: 'running', healthy: true, restarts: 1, oomKilled: false, limits: { memoryBytes: 4294967296, cpus: 2, pids: 256 } }, { id: 'moon-reserve', container: 'moonbot-backup', running: false, status: 'exited', healthy: false }],
    balancer: { active: true, workers: 8, processed_sources: 42, words: 128400, rate: '2150 p/min', plan: { planned_workers: 8, max_workers: 12 } },
    operations: { since: new Date(minute - 7200000).toISOString(), last60s: traffic, total: { ...traffic, received: 18742, sent: 8450, calls: 28400 }, history },
    api: { since: new Date(minute - 7200000).toISOString(), inflight: 3, last60s: http, total: { ...http, requests: 42180 }, history, routes: [{ family: 'moonbot-admin', ...http, requests: 14300 }, { family: 'bots', ...http, requests: 8240 }, { family: 'auth', ...http, requests: 3200 }] },
    resources: { cpu: 42, ram: 68, ramUsedGb: 5.4, ramTotalGb: 8, disk: 72, uptime: '2:04:12', version: 'v16.85.0' },
    telemetryErrors: [], events: [],
  }),
};
export default function MoonbotControlPreview() {
  return <main className="mx-auto max-w-7xl px-4 py-8"><div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><b>Vista previa local · datos de ejemplo</b><p className="text-sm">Esta pantalla permite revisar el diseño sin PocketBase ni Docker. Los controles están deshabilitados. El panel real está en Dashboard → Balanceo y contenedores.</p></div><MoonbotLoadBalancer client={client} readOnly /></main>;
}
