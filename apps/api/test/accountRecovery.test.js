import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountRecoveryPlan } from '../src/utils/accountRecovery.js';

test('creates a selective plan with only requested recoverable fields', () => {
  const plan = createAccountRecoveryPlan(
    { role: 'admin', is_frozen: true },
    { id: 'event-1', account_id: 'user-1', action: 'freeze', before: { role: 'user', is_frozen: false } },
    ['is_frozen'],
  );
  assert.deepEqual(plan.restore, { is_frozen: false });
  assert.deepEqual(plan.current, { is_frozen: true });
});

test('protects creator accounts and rejects deleted-account events', () => {
  assert.throws(() => createAccountRecoveryPlan(
    { role: 'creator' },
    { id: 'event-1', account_id: 'owner', action: 'role', before: { role: 'admin' } },
    ['role'],
  ), /protegida/);
  assert.throws(() => createAccountRecoveryPlan(
    { role: 'user' },
    { id: 'event-2', account_id: 'deleted', action: 'delete', before: { role: 'user' } },
    ['role'],
  ), /no recuperable/);
});
