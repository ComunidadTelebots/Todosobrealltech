const boundaries = [10, 50, 100, 250, 500, 1000, 3000, Infinity];
const blank = () => ({ requests: 0, errors4xx: 0, errors5xx: 0, limited: 0, aborted: 0, durationMs: 0, histogram: boundaries.map(() => 0) });
const families = new Set(['moonbot-admin', 'auth', 'stats', 'bots', 'proxies', 'mtproto-proxies', 'onion', 'noticias', 'house-ads', 'community-cards', 'health']);

export function createApiTraffic(now = Date.now) {
  const startedAt = now();
  const totals = blank();
  const minutes = new Map();
  const seconds = new Map();
  const routes = new Map();
  let inflight = 0;
  function prune() {
    const time = now();
    for (const key of minutes.keys()) if (key < Math.floor(time / 60000) - 59) minutes.delete(key);
    for (const key of seconds.keys()) if (key < Math.floor(time / 1000) - 59) seconds.delete(key);
  }
  function record({ status, durationMs, family = 'other', aborted = false }) {
    prune();
    const minute = Math.floor(now() / 60000);
    const second = Math.floor(now() / 1000);
    family = families.has(family) ? family : 'other';
    if (!minutes.has(minute)) minutes.set(minute, blank());
    if (!seconds.has(second)) seconds.set(second, blank());
    if (!routes.has(family)) routes.set(family, blank());
    const duration = Math.max(0, Number(durationMs) || 0);
    for (const bucket of [totals, minutes.get(minute), seconds.get(second), routes.get(family)]) {
      bucket.requests++;
      bucket.errors4xx += Number(status >= 400 && status < 500);
      bucket.errors5xx += Number(status >= 500);
      bucket.limited += Number(status === 429);
      bucket.aborted += Number(aborted);
      bucket.durationMs += duration;
      bucket.histogram[boundaries.findIndex((limit) => duration <= limit)]++;
    }
  }
  function summarize(bucket) {
    let count = 0;
    const p95 = bucket.requests ? boundaries.find((limit, index) => { count += bucket.histogram[index]; return count >= Math.ceil(bucket.requests * 0.95); }) : null;
    return { requests: bucket.requests, errors4xx: bucket.errors4xx, errors5xx: bucket.errors5xx, limited: bucket.limited, aborted: bucket.aborted,
      avgMs: bucket.requests ? Math.round(bucket.durationMs / bucket.requests) : null, p95Ms: p95 === Infinity ? null : p95, p95Overflow: p95 === Infinity };
  }
  function snapshot() {
    prune();
    const recent = blank();
    for (const value of seconds.values()) for (const key of Object.keys(recent)) {
      if (key === 'histogram') value.histogram.forEach((count, index) => { recent.histogram[index] += count; });
      else recent[key] += value[key];
    }
    const minute = Math.floor(now() / 60000);
    return { since: new Date(startedAt).toISOString(), inflight, total: summarize(totals), last60s: summarize(recent),
      history: Array.from({ length: Math.min(60, minute - Math.floor(startedAt / 60000) + 1) }, (_, index) => {
        const key = Math.max(Math.floor(startedAt / 60000), minute - 59) + index;
        return { at: new Date(key * 60000).toISOString(), ...summarize(minutes.get(key) || blank()) };
      }), routes: [...routes].map(([family, bucket]) => ({ family, ...summarize(bucket) })).sort((a, b) => b.requests - a.requests) };
  }
  function middleware(req, res, next) {
    const start = performance.now();
    const family = req.path.split('/')[1];
    inflight++;
    let done = false;
    const finish = (aborted) => {
      if (done) return;
      done = true; inflight--;
      record({ status: aborted ? 0 : res.statusCode, durationMs: performance.now() - start, family, aborted });
    };
    res.once('finish', () => finish(false));
    res.once('close', () => finish(!res.writableFinished));
    next();
  }
  return { record, snapshot, middleware };
}
export const apiTraffic = createApiTraffic();
