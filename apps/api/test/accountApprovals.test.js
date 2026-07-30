import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoleApproval, decideRoleApproval } from '../src/utils/accountApprovals.js';

test('creates a pending admin elevation with immutable before and after values', () => {
  const request = createRoleApproval({ accountId: 'abc123', currentRole: 'user', requestedRole: 'admin', requester: { id: 'admin1', role: 'admin' } });
  assert.equal(request.status, 'pending');
  assert.deepEqual(request.change, { field: 'role', before: 'user', after: 'admin' });
});

test('requires a different creator to approve an elevation', () => {
  const request = createRoleApproval({ accountId: 'abc123', currentRole: 'user', requestedRole: 'admin', requester: { id: 'admin1', role: 'admin' } });
  assert.throws(() => decideRoleApproval(request, { id: 'admin2', role: 'admin' }, 'approved'), /creator/);
  assert.throws(() => decideRoleApproval(request, { id: 'admin1', role: 'creator' }, 'approved'), /propia/);
  assert.equal(decideRoleApproval(request, { id: 'owner', role: 'creator' }, 'approved').status, 'approved');
});
