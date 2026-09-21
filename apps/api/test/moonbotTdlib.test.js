import test from 'node:test';
import assert from 'node:assert/strict';
import { projectTdlibMigration } from '../src/utils/moonbotTelemetry.js';

test('TDLib migration exposes counters without credentials, content or unsupported readiness', () => {
  const result = projectTdlibMigration({ ok: true, schema: 1, configured: true, ready_for_full_migration: true,
    api_hash: 'secret', audit: { methods: 60, call_sites: 181, dynamic_calls: 5, parse_errors: 0, token: 'secret' },
    bots: [{ id: '112233445566', token: 'secret', me: { phone_number: 'secret' }, ready: true, incoming: 'bot_api',
      receiver: { events: 5, queued: 0, capacity: 4096, overflows: -1, payload: 'secret' } }, { id: 'bad' }] });
  assert.equal(result.readyForFullMigration, false);
  assert.equal(result.bots.length, 1);
  assert.equal(result.bots[0].receiver.events, 5);
  assert.equal(result.bots[0].receiver.overflows, null);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.throws(() => projectTdlibMigration({ ok: true, bots: [] }));
});

test('gateway and inbox expose only aggregate counters', () => {
  const result = projectTdlibMigration({ ok: true, schema: 1, bots: [
    { id: '112233445566', incoming: 'local_bot_api_tdlib' },
  ], inbox: { enabled: true, capacity: 10000, oldest_pending_seconds: 3,
    states: { done: 1, payload: 'secret' }, payload: 'secret',
    workers: [{ id: 'worker-1', paused: 0, running: 0, completed: 1, token: 'secret' }] } });
  assert.equal(result.bots[0].incoming, 'local_bot_api_tdlib');
  assert.deepEqual(result.inbox.states, { pending: 0, claimed: 0, running: 0, uncertain: 0, done: 1 });
  assert.equal(result.inbox.workers[0].completed, 1);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.deepEqual(projectTdlibMigration({ ok: true, schema: 1, bots: [],
    inbox: { enabled: true, error: 'secret' } }).inbox, { enabled: true, error: 'Cola no disponible' });
});
