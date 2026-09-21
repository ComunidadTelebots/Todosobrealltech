import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createTelegramNetwork, TELEGRAM_NETWORK_TARGETS, tcpProbe } from '../src/utils/telegramNetwork.js';

test('uses only immutable official/public targets on port 443', () => {
  assert.equal(TELEGRAM_NETWORK_TARGETS.length, 9);
  assert.ok(TELEGRAM_NETWORK_TARGETS.every((target) => target.port === 443));
  assert.throws(() => { TELEGRAM_NETWORK_TARGETS[0].host = '127.0.0.1'; });
});
test('coalesces concurrent probes and reuses cached samples for 30 seconds', async () => {
  let now = 0;
  let calls = 0;
  const monitor = createTelegramNetwork({ now: () => now, probe: async () => { calls++; return { ok: true, ms: 20 }; } });
  const [a, b] = await Promise.all([monitor.snapshot(), monitor.snapshot()]);
  assert.equal(calls, 9);
  assert.deepEqual(a, b);
  await monitor.snapshot();
  assert.equal(calls, 9);
  now = 30001;
  assert.equal((await monitor.snapshot()).targets[0].samples, 2);
  assert.equal(calls, 18);
});
test('bounds history and excludes failures from measured latency', async () => {
  let now = 0;
  const monitor = createTelegramNetwork({ now: () => now, probe: async () => now === 0 ? { ok: false, error: 'TIMEOUT', ms: null } : { ok: true, ms: 40 } });
  const first = await monitor.snapshot();
  assert.equal(first.targets[0].avgMs, null);
  now = 30001;
  const second = await monitor.snapshot();
  assert.equal(second.targets[0].avgMs, 40);
  assert.equal(second.targets[0].successful, 1);
  for (let index = 0; index < 65; index++) { now += 30001; await monitor.snapshot(); }
  assert.equal((await monitor.snapshot()).targets[0].history.length, 60);
});
test('a blocked TCP probe closes its socket and exposes no raw error detail', async () => {
  let socket;
  const result = await tcpProbe(TELEGRAM_NETWORK_TARGETS[0], { connect: () => {
    socket = new EventEmitter();
    socket.destroy = () => { socket.closed = true; };
    queueMicrotask(() => socket.emit('error', Object.assign(new Error('PRIVATE'), { code: 'EACCES' })));
    return socket;
  } });
  assert.equal(result.error, 'EACCES');
  assert.equal(result.ms, null);
  assert.ok(socket.closed);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
test('a stalled socket is timed out and destroyed', async () => {
  const socket = new EventEmitter();
  socket.destroy = () => { socket.closed = true; };
  const result = await tcpProbe(TELEGRAM_NETWORK_TARGETS[0], { timeoutMs: 5, connect: () => socket });
  assert.equal(result.error, 'TIMEOUT');
  assert.ok(socket.closed);
});
