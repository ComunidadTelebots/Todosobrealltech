import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOnionMetrics } from '../src/utils/dashboardStats.js';

test('cuenta solo Onion Webs activas y conserva el total real', () => {
  const source = [{ enabled: true }, { enabled: false }, { enabled: true }, {}];
  assert.deepEqual(summarizeOnionMetrics(source, 17), {
    total: 4,
    active: 2,
    accessesMonth: 17,
  });
  assert.equal(source.length, 4);
});

test('normaliza entradas ausentes sin inventar actividad', () => {
  assert.deepEqual(summarizeOnionMetrics(null, -2), {
    total: 0,
    active: 0,
    accessesMonth: 0,
  });
});
