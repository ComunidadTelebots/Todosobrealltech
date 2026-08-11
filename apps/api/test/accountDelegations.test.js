import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountDelegation, isAccountDelegationActive } from '../src/utils/accountDelegations.js';

const now = new Date('2026-08-11T10:00:00.000Z');

test('creates a bounded read-only account delegation', () => {
  const delegation = createAccountDelegation({ delegate_id: 'user2', permissions: ['view_account_summary', 'delete_accounts'], expires_at: '2026-08-12T10:00:00.000Z' }, 'creator1', now);
  assert.deepEqual(delegation.permissions, ['view_account_summary']);
  assert.equal(isAccountDelegationActive(delegation, 'user2', 'view_account_summary', new Date('2026-08-11T11:00:00.000Z')), true);
  assert.equal(isAccountDelegationActive(delegation, 'user2', 'delete_accounts', now), false);
});

test('rejects self, expired and overlong delegations', () => {
  assert.throws(() => createAccountDelegation({ delegate_id: 'creator1', permissions: ['view_account_summary'], expires_at: '2026-08-12T10:00:00.000Z' }, 'creator1', now));
  assert.throws(() => createAccountDelegation({ delegate_id: 'user2', permissions: ['view_account_summary'], expires_at: '2026-08-10T10:00:00.000Z' }, 'creator1', now));
  assert.throws(() => createAccountDelegation({ delegate_id: 'user2', permissions: ['view_account_summary'], expires_at: '2026-10-12T10:00:00.000Z' }, 'creator1', now));
});
