// Process-local cache for shared, already-projected monitoring data only.
// Authentication and per-user permissions must remain outside this cache.
export function sharedSnapshot(loader, { ttlMs = 2000, clock = Date.now } = {}) {
  let value, expires = 0, pending, generation = 0;
  const counters = { loads: 0, hits: 0, joined: 0 };
  async function read() {
    for (;;) {
      const version = generation;
      if (value !== undefined && clock() < expires) { counters.hits++; return value; }
      if (!pending) {
        counters.loads++;
        const task = Promise.resolve().then(loader).then(result => {
          if (generation === version) { value = result; expires = clock() + ttlMs; }
          return result;
        });
        pending = task;
        task.finally(() => { if (pending === task) pending = null; }).catch(() => {});
      } else counters.joined++;
      const result = await pending;
      // A control operation happened while reading: never publish that old read.
      if (version === generation && value !== undefined) return result;
    }
  }
  return {
    read,
    invalidate() { generation++; value = undefined; expires = 0; },
    stats() { return { ...counters, ttlMs, inFlight: Boolean(pending) }; },
  };
}
