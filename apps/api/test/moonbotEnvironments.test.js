import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createEnvironmentService, environmentConfig, environmentRepository } from '../src/utils/moonbotEnvironments.js';
import { createEnvironmentRouter } from '../src/routes/moonbot-environments.js';

const entries = ['dev', 'alpha', 'beta', 'rc'].map((channel) => ({ id: `moon-${channel}`, channel, url: `https://moon-${channel}.todosobreall.tech` }));
function setup() {
  let clock = 1_800_000_000_000;
  const users = { owner: { id: 'owner', role: 'creator' }, alice: { id: 'alice', role: 'admin', name: 'Alice' }, bob: { id: 'bob', role: 'admin' }, visitor: { id: 'visitor', role: 'user' } };
  const policies = new Map();
  const repository = { user: async (id) => users[id] || null, admins: async () => [users.alice, users.bob],
    policy: async (scope) => policies.get(scope) || null,
    save: async (_previous, next) => { policies.set(next.scope, structuredClone(next)); } };
  const config = environmentConfig(JSON.stringify(entries));
  const service = createEnvironmentService({ repository, ...config, secret: 'test-secret-with-more-than-32-characters', now: () => clock });
  const assign = (scope, targets, mode = 'custom', revision = policies.get(scope)?.revision || 0, actor = 'owner') => service.assign(actor, { scope, targets, mode, revision });
  return { service, assign, users, repository, policies, advance: (seconds) => { clock += seconds * 1000; } };
}
const denied = (status) => (error) => error.status === status;
const gate = (service, cookie, id = 'moon-alpha') => service.authorize(id, cookie, `${id}.todosobreall.tech`, 'https');

test('catalog only accepts isolated HTTPS subdomains and exact known channels', () => {
  assert.equal(environmentConfig(JSON.stringify(entries)).targets.length, 4);
  for (const url of ['http://moon-alpha.todosobreall.tech', 'https://evil.test', 'https://todosobreall.tech', 'https://moon-alpha.todosobreall.tech.evil.test', 'https://user:pass@moon-alpha.todosobreall.tech', 'https://moon-alpha.todosobreall.tech:444', 'https://moon-alpha.todosobreall.tech/path', 'https://moon-alpha.todosobreall.tech?token=x']) {
    assert.throws(() => environmentConfig(JSON.stringify([{ ...entries[1], url }])));
  }
  assert.throws(() => environmentConfig(JSON.stringify([entries[0], entries[0]])));
  assert.throws(() => environmentConfig(JSON.stringify([{ ...entries[0], id: '../admin' }])));
  assert.throws(() => environmentConfig(JSON.stringify([{ ...entries[0], channel: 'master' }])));
  assert.throws(() => environmentConfig('[]', '.todosobreall.tech; Secure'));
});

test('defaults deny admins; global inheritance and explicit exceptions do not imply higher/lower channels', async () => {
  const { service, assign } = setup();
  assert.equal((await service.view('alice')).targets.length, 0);
  assert.equal((await service.view('owner')).targets.length, 4);
  await assign('global', ['moon-rc']);
  assert.deepEqual((await service.view('alice')).targets.map((row) => row.id), ['moon-rc']);
  await assign('alice', ['moon-alpha']);
  assert.deepEqual((await service.view('alice')).targets.map((row) => row.id), ['moon-alpha']);
  await assert.rejects(service.open('alice', 'moon-rc'), denied(403));
  await assert.rejects(service.open('alice', 'moon-dev'), denied(403));
  await assign('alice', []);
  assert.equal((await service.view('alice')).targets.length, 0);
  await assign('alice', [], 'inherit');
  assert.deepEqual((await service.view('alice')).targets.map((row) => row.id), ['moon-rc']);
});

test('only fresh active creators assign, invalid scopes/targets and stale edits cannot overwrite grants', async () => {
  const { service, assign, users, policies } = setup();
  await assert.rejects(assign('alice', ['moon-dev'], 'custom', 0, 'alice'), denied(403));
  await assert.rejects(assign('visitor', ['moon-dev']), denied(400));
  await assert.rejects(assign('alice', ['unknown']), denied(404));
  await assert.rejects(assign('alice', ['moon-dev', 'moon-dev']), denied(400));
  await assert.rejects(assign('alice', ['moon-dev'], 'inherit'), denied(400));
  await assign('alice', ['moon-alpha']);
  await assert.rejects(assign('alice', ['moon-dev'], 'custom', 0), denied(409));
  assert.equal(policies.get('alice').history[0].actor, 'owner');
  users.owner.role = 'admin';
  await assert.rejects(assign('alice', []), denied(403));
  users.owner.role = 'creator'; users.owner.is_frozen = true;
  await assert.rejects(service.view('owner'), denied(403));
});

test('signed sessions are bound to target and destination, expire, and do not expose signing secrets', async () => {
  const { service, assign, advance } = setup();
  await assign('alice', ['moon-alpha', 'moon-beta']);
  const session = await service.open('alice', 'moon-alpha');
  assert.equal(session.url, entries[1].url);
  assert.match(session.cookie, /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.ok(!session.cookie.includes('test-secret'));
  assert.equal(await gate(service, session.cookie), true);
  await assert.rejects(gate(service, session.cookie, 'moon-beta'), denied(403));
  await assert.rejects(service.authorize('moon-alpha', session.cookie, 'moon-beta.todosobreall.tech', 'https'), denied(403));
  await assert.rejects(service.authorize('moon-alpha', session.cookie, 'moon-alpha.todosobreall.tech', 'http'), denied(403));
  await assert.rejects(gate(service, session.cookie.replace('=', '=x')), denied(403));
  await assert.rejects(gate(service, ''), denied(403));
  advance(600);
  await assert.rejects(gate(service, session.cookie), denied(403));
});

test('revocations, role changes and freezes apply to existing cookies on the next request', async () => {
  const { service, assign, users } = setup();
  await assign('global', ['moon-alpha']);
  const { cookie } = await service.open('alice', 'moon-alpha');
  await assign('global', []);
  await assert.rejects(gate(service, cookie), denied(403));
  await assign('alice', ['moon-alpha']);
  assert.equal(await gate(service, cookie), true);
  users.alice.role = 'user';
  await assert.rejects(gate(service, cookie), denied(403));
  users.alice.role = 'admin'; users.alice.is_frozen = true;
  await assert.rejects(gate(service, cookie), denied(403));
  await assign('alice', []); // A creator can revoke a frozen account too.
  users.alice.is_frozen = false;
  await assert.rejects(gate(service, cookie), denied(403));
});

test('admins cannot read other accounts or inaccessible destinations; missing secret fails closed', async () => {
  const { service, repository } = setup();
  const view = await service.view('alice');
  assert.equal(view.accounts, undefined); assert.equal(view.global, undefined);
  assert.equal(JSON.stringify(view).includes('moon-dev.todosobreall.tech'), false);
  await assert.rejects(service.view('visitor'), denied(403));
  const unconfigured = createEnvironmentService({ repository, ...environmentConfig(JSON.stringify(entries)), secret: '' });
  await assert.rejects(unconfigured.open('owner', 'moon-alpha'), denied(503));
});

test('repository treats outages as errors and only a missing policy as no access', async () => {
  const repo = environmentRepository({ collection: () => ({ getFirstListItem: async () => { throw { status: 503 }; } }) });
  await assert.rejects(repo.policy('alice'), (error) => error.status === 503);
  const empty = environmentRepository({ collection: () => ({ getFirstListItem: async () => { throw { status: 404 }; } }) });
  assert.equal(await empty.policy('alice'), null);
});

test('HTTP routes enforce authentication, protect direct URLs and do not return session tokens in JSON', async (t) => {
  const { service, assign, repository } = setup();
  const app = express();
  app.use('/moonbot-environments', createEnvironmentRouter({ service: () => service,
    authenticate: async (req) => req.headers.authorization ? { user: { id: req.headers.authorization } } : { status: 401, error: 'Login required' } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}/moonbot-environments`;
  assert.equal((await fetch(origin)).status, 401);
  assert.equal((await fetch(`${origin}/access`, { method: 'PUT', headers: { Authorization: 'alice', 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'global', mode: 'custom', targets: ['moon-dev'], revision: 0 }) })).status, 403);
  await assign('alice', ['moon-alpha']);
  const response = await fetch(`${origin}/moon-alpha/open`, { method: 'POST', headers: { Authorization: 'alice' } });
  const cookie = response.headers.get('set-cookie');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.ok(cookie);
  assert.deepEqual(await response.json(), { ok: true, url: entries[1].url, expiresIn: 600 });
  const gateUrl = `${origin}/forward-auth/moon-alpha`;
  const headers = { Cookie: cookie, 'X-Forwarded-Host': 'moon-alpha.todosobreall.tech', 'X-Forwarded-Proto': 'https' };
  assert.equal((await fetch(gateUrl)).status, 403);
  assert.equal((await fetch(gateUrl, { headers })).status, 204);
  repository.policy = async () => { throw new Error('database credentials should not leak'); };
  const unavailable = await fetch(gateUrl, { headers });
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes('credentials'));
  const logout = await fetch(`${origin}/session`, { method: 'DELETE' });
  assert.equal(logout.status, 204);
  assert.equal(logout.headers.getSetCookie().length, 4);
  logout.headers.getSetCookie().forEach((value) => assert.match(value, /Max-Age=0/));
});
