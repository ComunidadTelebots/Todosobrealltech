import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createPermissionAbuseMonitor } from '../src/utils/permissionAbuse.js';
import { createEnvironmentService, environmentConfig } from '../src/utils/moonbotEnvironments.js';

async function setup(t, override = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'permission-abuse-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let timestamp = 1800000000000;
  const options = { stateFile: path.join(directory, 'audit.json'), now: () => timestamp, ...override };
  const monitor = createPermissionAbuseMonitor(options);
  return { monitor, options, advance: (ms) => { timestamp += ms; } };
}

test('thresholds use a rolling window and never alert on ordinary sparse requests', async (t) => {
  const { monitor, advance } = await setup(t);
  for (let n = 0; n < 4; n++) await monitor.record({ kind: 'denied_open', actor: 'alice', target: 'alpha' });
  assert.equal((await monitor.snapshot()).alerts.length, 0);
  advance(300001);
  await monitor.record({ kind: 'denied_open', actor: 'alice' });
  assert.equal((await monitor.snapshot()).alerts.length, 0);
  for (let n = 0; n < 4; n++) await monitor.record({ kind: 'denied_open', actor: 'alice' });
  const [alert] = (await monitor.snapshot()).alerts;
  assert.equal(alert.count, 5); assert.equal(alert.actor, 'alice');
});

test('asset storms are sampled; invalid-cookie identities and arbitrary payload fields are not persisted', async (t) => {
  const { monitor, advance, options } = await setup(t);
  for (let n = 0; n < 100; n++) await monitor.record({ kind: 'denied_gate', actor: 'alice', target: 'alpha', cookie: 'SECRET', ip: 'PRIVATE' });
  assert.equal((await monitor.snapshot()).alerts.length, 0);
  for (let n = 0; n < 4; n++) { advance(30001); await monitor.record({ kind: 'denied_gate', actor: 'alice', target: 'alpha' }); }
  assert.equal((await monitor.snapshot()).alerts[0].count, 5);
  assert.equal(await monitor.record({ kind: 'unknown', actor: 'alice', body: 'SECRET' }), false);
  const content = await fs.readFile(options.stateFile, 'utf8');
  assert.ok(!content.includes('SECRET')); assert.ok(!content.includes('PRIVATE'));
});

test('concurrent observations survive restart and reviewed alerts reopen on new evidence', async (t) => {
  const { monitor, options, advance } = await setup(t);
  await Promise.all(Array.from({ length: 20 }, () => monitor.record({ kind: 'sessions', actor: 'alice' })));
  const restored = createPermissionAbuseMonitor(options);
  const [alert] = (await restored.snapshot()).alerts;
  assert.equal(alert.count, 20);
  await restored.review(alert.id, 'owner', 'expected');
  assert.equal((await restored.snapshot()).alerts[0].status, 'reviewed');
  advance(1);
  await restored.record({ kind: 'sessions', actor: 'alice' });
  const reopened = (await restored.snapshot()).alerts[0];
  assert.equal(reopened.status, 'open'); assert.equal(reopened.reviewedBy, 'owner');
  advance(7 * 86400000 + 1);
  assert.equal((await restored.snapshot()).alerts.length, 0);
});

test('corrupt audit state is reported without overwriting it or throwing into authorization', async (t) => {
  const { monitor, options } = await setup(t);
  await fs.writeFile(options.stateFile, 'broken audit');
  assert.equal(await monitor.record({ kind: 'denied_assign', actor: 'alice' }), false);
  assert.equal((await monitor.snapshot()).available, false);
  assert.equal(await fs.readFile(options.stateFile, 'utf8'), 'broken audit');
});

test('failed persistence of a review does not mark it reviewed in memory', async (t) => {
  let failWrites = false;
  const { monitor } = await setup(t, { io: { ...fs, writeFile: (...args) => failWrites ? Promise.reject(new Error('disk full')) : fs.writeFile(...args) } });
  await monitor.record({ kind: 'denied_assign', actor: 'alice' });
  const [alert] = (await monitor.snapshot()).alerts;
  failWrites = true;
  await assert.rejects(monitor.review(alert.id, 'owner', 'investigate'), (error) => error.status === 503);
  const snapshot = await monitor.snapshot();
  assert.equal(snapshot.available, false); assert.equal(snapshot.alerts[0].status, 'open');
});

test('service records denied grants, global expansion and genuine denials but ignores expired or missing cookies', async (t) => {
  const { monitor, advance, options } = await setup(t);
  const users = { owner: { id: 'owner', role: 'creator' }, alice: { id: 'alice', role: 'admin' } };
  const policies = new Map();
  const config = environmentConfig(JSON.stringify([{ id: 'alpha', channel: 'alpha', url: 'https://alpha.todosobreall.tech' }]));
  const service = createEnvironmentService({ ...config, secret: 'secret-that-is-long-enough-for-tests', now: options.now, monitor,
    repository: { user: async (id) => users[id], policy: async (scope) => policies.get(scope), admins: async () => [users.alice], save: async (_, next) => policies.set(next.scope, next) } });
  await assert.rejects(service.assign('alice', { scope: 'global', mode: 'custom', targets: [], revision: 0 }));
  await service.assign('owner', { scope: 'global', mode: 'custom', targets: ['alpha'], revision: 0 });
  const security = (await service.view('owner')).security;
  assert.deepEqual(new Set(security.alerts.map((row) => row.kind)), new Set(['denied_assign', 'broad_grant']));
  assert.deepEqual(security.alerts.find((row) => row.kind === 'broad_grant').added, ['alpha']);
  assert.equal((await service.view('alice')).security, undefined);
  await assert.rejects(service.reviewAlert('alice', security.alerts[0].id, 'expected'), (error) => error.status === 403);
  await service.reviewAlert('owner', security.alerts[0].id, 'expected');
  const session = await service.open('alice', 'alpha');
  advance(600001);
  for (let i = 0; i < 25; i++) {
    await assert.rejects(service.authorize('alpha', session.cookie, 'alpha.todosobreall.tech', 'https'));
    await assert.rejects(service.authorize('alpha', '', 'alpha.todosobreall.tech', 'https'));
  }
  assert.ok(!(await monitor.snapshot()).alerts.some((row) => ['denied_gate', 'invalid_signature'].includes(row.kind)));
  // An attacker cannot blame 'owner' by inserting that subject in an unsigned cookie.
  const forged = `__Secure-moon_env_alpha=${Buffer.from(JSON.stringify({ sub: 'owner' })).toString('base64url')}.bad-signature`;
  for (let i = 0; i < 20; i++) { advance(2001); await assert.rejects(service.authorize('alpha', forged, 'alpha.todosobreall.tech', 'https')); }
  const invalid = (await monitor.snapshot()).alerts.find((row) => row.kind === 'invalid_signature');
  assert.equal(invalid.actor, null);
  assert.equal(invalid.count, 20);
});
