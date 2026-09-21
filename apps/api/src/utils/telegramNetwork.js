import net from 'node:net';

// Bootstrap endpoints from Telegram Desktop, plus public media CDN hosts
// observed on https://t.me/s/telegram on 2026-09-21. No user-supplied destinations.
export const TELEGRAM_NETWORK_TARGETS = Object.freeze([
  { id: 'dc1', label: 'DC 1', kind: 'dc', host: '149.154.175.50' },
  { id: 'dc2', label: 'DC 2', kind: 'dc', host: '149.154.167.51' },
  { id: 'dc2-alt', label: 'DC 2 · alternativo', kind: 'dc', host: '95.161.76.100' },
  { id: 'dc3', label: 'DC 3', kind: 'dc', host: '149.154.175.100' },
  { id: 'dc4', label: 'DC 4', kind: 'dc', host: '149.154.167.91' },
  { id: 'dc5', label: 'DC 5', kind: 'dc', host: '149.154.171.5' },
  { id: 'cdn1', label: 'CDN público 1', kind: 'cdn', host: 'cdn1.telesco.pe' },
  { id: 'cdn4', label: 'CDN público 4', kind: 'cdn', host: 'cdn4.telesco.pe' },
  { id: 'bot-api', label: 'Bot API', kind: 'api', host: 'api.telegram.org' },
].map((target) => Object.freeze({ ...target, port: 443 })));

export function tcpProbe(target, { timeoutMs = 2500, connect = net.createConnection } = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    let done = false;
    let socket;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, ms: null, error: 'TIMEOUT' }), timeoutMs);
    try {
      socket = connect({ host: target.host, port: target.port });
      socket.once('connect', () => finish({ ok: true, ms: Math.round((performance.now() - start) * 10) / 10, error: null }));
      socket.once('error', (error) => finish({ ok: false, ms: null, error: ['EACCES', 'EPERM', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH'].includes(error.code) ? error.code : 'CONNECTION_ERROR' }));
    } catch { finish({ ok: false, ms: null, error: 'PROBE_ERROR' }); }
  });
}

export function createTelegramNetwork({ probe = tcpProbe, now = Date.now, intervalMs = 30000 } = {}) {
  let cached = null;
  let completedAt = -Infinity;
  let pending = null;
  const histories = new Map();
  async function collect() {
    const rows = await Promise.all(TELEGRAM_NETWORK_TARGETS.map(async (target) => {
      let result;
      try { result = await probe(target); } catch { result = { ok: false, ms: null, error: 'PROBE_ERROR' }; }
      const at = new Date(now()).toISOString();
      const sample = { at, ok: result.ok === true, ms: result.ok === true ? result.ms : null, error: result.error || null };
      const history = [...(histories.get(target.id) || []).slice(-59), sample];
      histories.set(target.id, history);
      const successes = history.filter((entry) => entry.ok);
      const times = successes.map((entry) => entry.ms);
      const rounded = (number) => Math.round(number * 10) / 10;
      return { ...target, ...sample, samples: history.length, successful: successes.length,
        avgMs: times.length ? rounded(times.reduce((a, b) => a + b, 0) / times.length) : null,
        minMs: times.length ? Math.min(...times) : null, maxMs: times.length ? Math.max(...times) : null,
        history };
    }));
    completedAt = now();
    cached = { ok: true, measuredAt: new Date(completedAt).toISOString(), intervalSeconds: intervalMs / 1000, origin: 'Servidor API de todosobreall.tech', method: 'TCP connect :443 (DNS incluido para dominios)', targets: rows };
    return cached;
  }
  function snapshot() {
    if (cached && now() - completedAt < intervalMs) return Promise.resolve(cached);
    if (!pending) pending = collect().finally(() => { pending = null; });
    return pending;
  }
  return { snapshot };
}
export const telegramNetwork = createTelegramNetwork();
