import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAccountMetricsSnapshot,
  createAccountMetricsState,
  ingestAccountMetricEvent,
  ingestAccountMetricEvents,
} from '../src/utils/accountRealtimeMetrics.js';

const event = (id, type, timestamp, extra = {}) => ({ id, type, timestamp, ...extra });

test('aggregates account and proxy events incrementally in a temporal window', () => {
  const state = ingestAccountMetricEvents(createAccountMetricsState(), [
    event('evt-1', 'account.created', '2026-07-30T09:50:00Z', { email: 'private@example.com' }),
    event('evt-2', 'account.role_changed', '2026-07-30T09:55:00Z', { role: 'admin', account_id: 'private-id' }),
    event('evt-3', 'proxy.assigned', '2026-07-30T09:58:00Z', { proxy_id: 'private-proxy', ip: '203.0.113.1' }),
    event('evt-4', 'proxy.health_changed', '2026-07-30T09:59:00Z', { proxy_status: 'degraded' }),
  ]);
  const snapshot = createAccountMetricsSnapshot(state, { now: '2026-07-30T10:00:00Z', window_ms: 15 * 60_000 });
  assert.deepEqual(snapshot.totals, { events: 4, account_events: 2, proxy_events: 2 });
  assert.equal(snapshot.by_type['account.created'], 1);
  assert.equal(snapshot.dimensions.role_changes_to.admin, 1);
  assert.equal(snapshot.dimensions.proxy_health.degraded, 1);
});

test('deduplicates ids idempotently without changing state', () => {
  const input = event('evt-repeat', 'account.frozen', '2026-07-30T09:59:30Z');
  const once = ingestAccountMetricEvent(createAccountMetricsState(), input);
  const twice = ingestAccountMetricEvent(once, { ...input, type: 'account.recovered' });
  assert.strictEqual(twice, once);
  const snapshot = createAccountMetricsSnapshot(twice, { now: '2026-07-30T10:00:00Z', window_ms: 60_000 });
  assert.equal(snapshot.totals.events, 1);
  assert.equal(snapshot.by_type['account.frozen'], 1);
});

test('applies exact window boundaries and excludes future events', () => {
  const state = ingestAccountMetricEvents(createAccountMetricsState(), [
    event('evt-old', 'account.created', '2026-07-30T09:00:00Z'),
    event('evt-in', 'account.recovered', '2026-07-30T09:00:00.001Z'),
    event('evt-now', 'proxy.unassigned', '2026-07-30T10:00:00Z'),
    event('evt-future', 'account.frozen', '2026-07-30T10:00:00.001Z'),
  ]);
  const snapshot = createAccountMetricsSnapshot(state, { now: '2026-07-30T10:00:00Z', window_ms: 3_600_000 });
  assert.equal(snapshot.totals.events, 2);
  assert.equal(snapshot.by_type['account.recovered'], 1);
  assert.equal(snapshot.by_type['proxy.unassigned'], 1);
});

test('never exposes PII or raw identities in explainable snapshots', () => {
  const pii = ['private@example.com', 'Ada Lovelace', 'account-private', 'proxy-private', '203.0.113.8'];
  const state = ingestAccountMetricEvent(createAccountMetricsState(), event(
    'evt-safe', 'account.created', '2026-07-30T09:59:00Z',
    { email: pii[0], name: pii[1], account_id: pii[2], proxy_id: pii[3], ip: pii[4] },
  ));
  const serialized = JSON.stringify(createAccountMetricsSnapshot(state, {
    now: '2026-07-30T10:00:00Z', window_ms: 60_000,
  }));
  for (const value of pii) assert.equal(serialized.includes(value), false);
  assert.match(serialized, /Repeated event ids/);
});

test('rejects malformed events, dimensions and windows', () => {
  const state = createAccountMetricsState();
  assert.throws(() => ingestAccountMetricEvent(state, event('email@example.com', 'account.created', '2026-07-30T10:00:00Z')), /id opaco/);
  assert.throws(() => ingestAccountMetricEvent(state, event('evt-1', 'account.deleted', '2026-07-30T10:00:00Z')), /no permitido/);
  assert.throws(() => ingestAccountMetricEvent(state, event('evt-2', 'account.role_changed', '2026-07-30T10:00:00Z', { role: 'owner' })), /Rol métrico/);
  assert.throws(() => createAccountMetricsSnapshot(state, { now: '2026-07-30T10:00:00Z', window_ms: 0 }), /Ventana/);
});
