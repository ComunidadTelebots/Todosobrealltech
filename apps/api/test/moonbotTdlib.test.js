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
