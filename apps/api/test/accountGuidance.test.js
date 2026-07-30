import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountGuidance } from '../src/utils/accountGuidance.js';

test('builds explainable manual steps ordered by urgency', () => {
  const steps = buildAccountGuidance({
    anomalies: [{ id: 'a1', type: 'duplicate_telegram', severity: 'critical', account_ids: ['u2', 'u1'], explanation: 'ID duplicado.' }],
    recommendations: [{ account_id: 'u3', action: 'complete_verification', priority: 'medium', score: 45, explanation: 'Falta verificar.' }],
    approvals: [{ id: 'p1', account_id: 'u4', status: 'pending', change: { field: 'role', before: 'user', after: 'admin' } }],
    proxies: [{ id: 'px1', user_id: 'u5', status: 'offline' }],
  });

  assert.deepEqual(steps.map((step) => step.source), ['anomaly', 'approval', 'proxy', 'recommendation']);
  assert.deepEqual(steps.map((step) => step.order), [1, 2, 3, 4]);
  assert.equal(steps[0].explanation, 'ID duplicado.');
  assert.deepEqual(steps[0].account_ids, ['u2', 'u1']);
  assert.deepEqual(steps[2].account_ids, ['u5']);
  assert.ok(steps.every((step) => step.automated === false && step.requires_confirmation === true));
});

test('ignores completed approvals, healthy proxies and maintenance recommendations', () => {
  const steps = buildAccountGuidance({
    approvals: [{ id: 'done', account_id: 'u1', status: 'approved' }],
    proxies: [{ id: 'healthy', account_id: 'u1', status: 'online' }],
    recommendations: [{ account_id: 'u1', action: 'maintain', priority: 'low' }],
  });

  assert.deepEqual(steps, []);
});

test('is deterministic, defensive and does not mutate input collections', () => {
  const input = {
    anomalies: [{ type: 'unverified_privileged', severity: 'unexpected', account_ids: ['u1', 'u1', ''] }],
    approvals: [{ account_id: 'u2', change: { field: 'role' } }],
    proxies: [{ id: 'slow', account_id: 'u3', status: 'degraded' }],
  };
  const before = structuredClone(input);

  const first = buildAccountGuidance(input);
  const second = buildAccountGuidance(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.deepEqual(first[0].account_ids, ['u1']);
  assert.equal(first[0].priority, 'high');
  assert.deepEqual(buildAccountGuidance(), []);
  assert.deepEqual(buildAccountGuidance({ anomalies: null, proxies: 'invalid' }), []);
});
