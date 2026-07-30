import assert from 'node:assert/strict';
import test from 'node:test';
import { forecastAccounts } from '../src/utils/accountForecast.js';

const now = new Date('2026-07-30T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString();

test('weights recent account growth more than older growth', () => {
  const recent = forecastAccounts(Array.from({ length: 12 }, (_, id) => ({ id, created: daysAgo(id % 7) })), now);
  const old = forecastAccounts(Array.from({ length: 12 }, (_, id) => ({ id, created: daysAgo(49 + (id % 7)) })), now);
  assert.ok(recent.projected_30d > old.projected_30d);
  assert.equal(recent.sample_56d, 12);
});

test('returns a bounded interval and low confidence for sparse history', () => {
  const result = forecastAccounts([{ id: 'a', created: daysAgo(2) }], now);
  assert.equal(result.confidence, 'low');
  assert.ok(result.interval.min >= 0);
  assert.ok(result.interval.max >= result.projected_30d);
});
