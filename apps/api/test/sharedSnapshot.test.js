import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedSnapshot } from '../src/utils/sharedSnapshot.js';

test('1000 concurrent readers share one collection, then reuse it until expiry', async () => {
  let calls = 0, now = 0;
  const cache = sharedSnapshot(async () => ({ sequence: ++calls }), { clock: () => now });
  const rows = await Promise.all(Array.from({ length: 1000 }, () => cache.read()));
  assert.equal(calls, 1);
  assert.ok(rows.every(row => row.sequence === 1));
  now = 1999;
  assert.equal((await cache.read()).sequence, 1);
  now = 2000;
  assert.equal((await cache.read()).sequence, 2);
  assert.equal(cache.stats().joined, 999);
});

test('invalidation during collection discards old state for all waiting readers', async () => {
  let release, calls = 0;
  const barrier = new Promise(resolve => { release = resolve; });
  const cache = sharedSnapshot(async () => { const sequence = ++calls; if (sequence === 1) await barrier; return sequence; });
  const first = cache.read();
  await Promise.resolve();
  cache.invalidate();
  const second = cache.read();
  release();
  assert.deepEqual(await Promise.all([first, second]), [2, 2]);
  assert.equal(calls, 2);
});

test('failures are shared but never cached as healthy data', async () => {
  let calls = 0;
  const cache = sharedSnapshot(async () => { if (++calls === 1) throw new Error('offline'); return 'recovered'; });
  const outcomes = await Promise.allSettled([cache.read(), cache.read()]);
  assert.ok(outcomes.every(row => row.status === 'rejected'));
  assert.equal(await cache.read(), 'recovered');
});
