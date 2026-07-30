import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateAccountBatch, simulateAccountChanges } from '../src/utils/accountSandbox.js';

test('simulates role, freeze and proxy changes on an isolated copy', () => {
  const account = {
    id: 'account-1', role: 'user', is_frozen: false,
    proxy: { id: 'proxy-old', enabled: false, region: 'eu' },
    profile: { name: 'Ada' },
  };
  const original = structuredClone(account);
  const result = simulateAccountChanges(account, {
    role: 'admin', is_frozen: true, proxy: { id: 'proxy-new', enabled: true, region: 'us' },
  });

  assert.deepEqual(account, original);
  assert.notStrictEqual(result.before, account);
  assert.notStrictEqual(result.after, account);
  assert.deepEqual(result.diff.map(({ field }) => field), ['role', 'is_frozen', 'proxy']);
  assert.deepEqual(result.risks.map(({ code }) => code), [
    'privilege_escalation', 'account_access_blocked', 'traffic_rerouted',
  ]);
  assert.equal(result.applied, false);
  assert.deepEqual(result.effects, []);
});

test('result mutations cannot leak back into the source account', () => {
  const account = { id: 'account-2', role: 'moderator', is_frozen: false, profile: { name: 'Lin' } };
  const result = simulateAccountChanges(account, { role: 'user' });
  result.after.profile.name = 'Changed only in sandbox';
  result.before.profile.name = 'Also isolated';
  assert.equal(account.profile.name, 'Lin');
});

test('reports unchanged fields without fabricated risks', () => {
  const result = simulateAccountChanges(
    { id: 'account-3', role: 'admin', is_frozen: true },
    { role: 'admin', is_frozen: true },
  );
  assert.deepEqual(result.diff, []);
  assert.deepEqual(result.risks, []);
  assert.equal(result.applied, false);
});

test('rejects unsupported or malformed real-world operations', () => {
  const account = { id: 'account-4', role: 'user', is_frozen: false };
  assert.throws(() => simulateAccountChanges(account, { delete: true }), /solo admite/);
  assert.throws(() => simulateAccountChanges(account, { role: 'owner' }), /Rol de destino/);
  assert.throws(() => simulateAccountChanges(account, { is_frozen: 'yes' }), /congelación/);
  assert.throws(() => simulateAccountChanges(account, {
    proxy: { id: 'proxy-1', enabled: true, url: 'http://secret-proxy.local' },
  }), /Proxy no válido/);
});

test('summarizes a batch without mutating any account', () => {
  const accounts = [
    { id: 'account-5', role: 'user', is_frozen: false },
    { id: 'account-6', role: 'admin', is_frozen: false },
  ];
  const original = structuredClone(accounts);
  const result = simulateAccountBatch(accounts, { role: 'admin' });
  assert.deepEqual(accounts, original);
  assert.equal(result.affected_accounts, 1);
  assert.equal(result.total_risks, 1);
  assert.equal(result.applied, false);
  assert.deepEqual(result.effects, []);
  assert.throws(() => simulateAccountBatch([accounts[0], accounts[0]], { role: 'admin' }), /únicas/);
});
