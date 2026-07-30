import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendAccounts } from '../src/utils/accountRecommendations.js';

const now = new Date('2026-07-30T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString();

test('prioritizes frozen and privileged unverified accounts with explainable signals', () => {
  const recommendations = recommendAccounts([
    { id: 'normal', role: 'user', verified: true, created: daysAgo(100) },
    { id: 'admin', role: 'admin', verified: false, created: daysAgo(100) },
    { id: 'frozen', role: 'creator', verified: true, is_frozen: true, created: daysAgo(20) },
  ], [], now);

  assert.deepEqual(recommendations.map((item) => item.account_id), ['frozen', 'admin', 'normal']);
  assert.equal(recommendations[0].priority, 'critical');
  assert.equal(recommendations[0].action, 'review_frozen_account');
  assert.equal(recommendations[1].action, 'verify_privileged_account');
  assert.deepEqual(recommendations[1].reasons.map((reason) => reason.signal), ['verified']);
  assert.equal(recommendations[0].automated, false);
});

test('uses proxy ownership and account age without mutating either input', () => {
  const users = [
    { id: 'owner', role: 'user', verified: true, created: daysAgo(40) },
    { id: 'new', role: 'user', verified: true, created: daysAgo(2) },
  ];
  const proxies = Array.from({ length: 12 }, (_, index) => ({ id: index, user_id: 'owner' }));
  const usersBefore = structuredClone(users);
  const proxiesBefore = structuredClone(proxies);

  const recommendations = recommendAccounts(users, proxies, now);

  assert.equal(recommendations[0].account_id, 'owner');
  assert.equal(recommendations[0].action, 'review_proxy_concentration');
  assert.equal(recommendations[0].reasons[0].value, 12);
  assert.equal(recommendations[1].action, 'monitor_new_account');
  assert.deepEqual(users, usersBefore);
  assert.deepEqual(proxies, proxiesBefore);
});

test('keeps healthy accounts at low priority and handles missing collections', () => {
  const [healthy] = recommendAccounts([
    { id: 'healthy', role: 'creator', verified: true, created: daysAgo(90) },
  ], undefined, now);

  assert.equal(healthy.action, 'maintain');
  assert.equal(healthy.priority, 'low');
  assert.equal(healthy.reasons[0].signal, 'status');
  assert.deepEqual(recommendAccounts(null, null, now), []);
});
