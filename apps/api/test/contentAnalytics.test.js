import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateContentEvents, requestCountry } from '../src/utils/contentAnalytics.js';

test('agrega conteos por hora, día, país y ubicación sin almacenar IP', () => {
  const result = aggregateContentEvents([
    { created: '2026-07-31T10:05:00Z', country: 'ES', placement: 'web', count: 2 },
    { created: '2026-07-31T10:40:00Z', country: 'ES', placement: 'web', count: 1 },
    { created: '2026-07-31T11:00:00Z', country: 'FR', placement: 'telegram_channel', count: 4 },
  ], { timeZone: 'UTC' });
  assert.equal(result.total, 7);
  assert.deepEqual(result.hourly, [{ label: '2026-07-31 10:00', value: 3 }, { label: '2026-07-31 11:00', value: 4 }]);
  assert.deepEqual(result.daily, [{ label: '2026-07-31', value: 7 }]);
  assert.deepEqual(result.countries, [{ label: 'ES', value: 3 }, { label: 'FR', value: 4 }].sort((a, b) => b.value - a.value));
});

test('prioriza el país fiable del proxy y no devuelve la dirección', () => {
  const req = { headers: { 'cf-ipcountry': 'es', 'x-forwarded-for': '203.0.113.20' }, socket: {} };
  assert.equal(requestCountry(req), 'ES');
});
