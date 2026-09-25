import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMoonbotCluster, parseNodes } from '../src/utils/moonbotCluster.js';

const nodes = [{ id: 'primary', container: 'moon-primary', url: 'http://primary:5000' }, { id: 'backup', container: 'moon-backup', url: 'http://backup:5000' }];

test('starts balance telemetry while resource requests are still pending', async (t) => {
  const started = [];
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  const { cluster } = await setup(t, { overrides: { token: 'test', adminKey: 'test-admin', fetcher: async (url) => {
    if (url.endsWith('/health')) return { ok: true, json: async () => ({ ok: true }) };
    started.push(new URL(url).pathname);
    if (started.length === 6) release();
    await barrier;
    return { ok: true, json: async () => ({ ok: true, state: {}, stats: {} }) };
  } } });
  const timeout = setTimeout(release, 1000);
  try {
    const pending = cluster.snapshot();
    await barrier;
    assert.deepEqual(started.sort(), ['/api/ia/load_balancer', '/api/status', '/api/telemetry/operations', '/api/telemetry/tdlib-migration', '/api/internal/traffic', '/api/internal/peer-latency'].sort(), 'all independent telemetry requests must start before any completes');
    await pending;
  } finally { clearTimeout(timeout); release(); }
});
async function setup(t, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'moon-cluster-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const running = { 'moon-primary': true, 'moon-backup': false };
  const calls = [];
  const docker = async (container, action = 'json') => {
    calls.push(`${container}/${action}`);
    if (action === 'start') running[container] = true;
    if (action.startsWith('stop') && !options.refuseStop) running[container] = false;
    return { State: { Running: running[container], Status: running[container] ? 'running' : 'exited' } };
  };
  const stateFile = path.join(dir, 'state.json');
  const cluster = createMoonbotCluster({ nodes, docker, stateFile, wait: async () => {}, attempts: 1, fetcher: async (url) => ({ ok: true, json: async () => ({ ok: !(options.unhealthyBackup && url.includes('backup')) }) }), ...options.overrides });
  return { cluster, calls, running, stateFile };
}
test('keeps worker telemetry separate and leaves failed workers unknown', async t => {
  const requested = [];
  let failBackup = false;
  const { cluster, running } = await setup(t, { overrides: { token: 'test', fetcher: async url => {
    if (url.endsWith('/api/telemetry/operations')) {
      const host = new URL(url).hostname;
      requested.push(host);
      if (host === 'backup' && failBackup) throw new Error('offline');
      return { ok: true, json: async () => ({ ok: true, schema: 1, total: {}, last60s: { calls: host === 'primary' ? 75 : 25 } }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  } } });
  running['moon-backup'] = true;
  let status = await cluster.snapshot();
  assert.deepEqual(status.workers.map(row => [row.node, row.operations.last60s.calls]), [['primary', 75], ['backup', 25]]);
  assert.equal(requested.filter(host => host === 'primary').length, 1);
  failBackup = true;
  status = await cluster.snapshot();
  assert.equal(status.workers[1].operations, null);
  assert.ok(status.workers[1].error);
  requested.length = 0;
  running['moon-backup'] = false;
  status = await cluster.snapshot();
  assert.equal(status.workers[1].operations, null);
  assert.ok(!requested.includes('backup'));
});

test('validates configured origins and rejects duplicates and injected container names', () => {
  assert.equal(parseNodes(JSON.stringify(nodes)).length, 2);
  assert.throws(() => parseNodes(JSON.stringify([nodes[0], nodes[0]])));
  assert.throws(() => parseNodes(JSON.stringify([{ ...nodes[0], container: 'x/stop' }])));
  assert.throws(() => parseNodes(JSON.stringify([{ ...nodes[0], url: 'file:///tmp' }])));
  assert.throws(() => parseNodes(JSON.stringify([{ ...nodes[0], url: 'http://user:password@host' }])));
});
test('stops source before starting backup and persists verified active node', async (t) => {
  const { cluster, calls, running, stateFile } = await setup(t);
  assert.equal((await cluster.switchTo({ from: 'primary', to: 'backup', actor: 'admin' })).active, 'backup');
  assert.ok(calls.indexOf('moon-primary/stop?t=15') < calls.indexOf('moon-backup/start'));
  assert.deepEqual(running, { 'moon-primary': false, 'moon-backup': true });
  assert.equal(await cluster.activeUrl('fallback'), 'http://backup:5000');
  const saved = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  assert.equal(saved.active, 'backup');
  assert.equal(saved.events[0].status, 'completed');
  assert.equal(saved.events[0].actor, 'admin');
});
test('unhealthy target is stopped before restoring original source', async (t) => {
  const { cluster, running, calls } = await setup(t, { unhealthyBackup: true });
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'backup' }), /restaurado/);
  assert.deepEqual(running, { 'moon-primary': true, 'moon-backup': false });
  assert.ok(calls.indexOf('moon-backup/stop?t=15') < calls.indexOf('moon-primary/start'));
  assert.equal((await cluster.snapshot()).events[0].status, 'rolled_back');
});
test('never starts backup if source stop cannot be verified', async (t) => {
  const { cluster, calls } = await setup(t, { refuseStop: true });
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'backup' }), /parada/);
  assert.ok(!calls.includes('moon-backup/start'));
});
test('rejects another running container, unknown targets, and stale source', async (t) => {
  const { cluster, running, calls } = await setup(t);
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'arbitrary' }), /configurados/);
  await assert.rejects(cluster.switchTo({ from: 'backup', to: 'primary' }), /activo cambió/);
  running['moon-backup'] = true;
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'backup' }), /otro contenedor/);
  assert.ok(!calls.some((call) => call.includes('/stop')));
});
test('serializes switches and rejects concurrent submissions', async (t) => {
  const { cluster } = await setup(t);
  const first = cluster.switchTo({ from: 'primary', to: 'backup' });
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'backup' }), /en curso/);
  await first;
});
test('reports Docker unavailability without inventing healthy nodes', async (t) => {
  const { cluster } = await setup(t, { overrides: { docker: async () => { throw new Error('Docker offline'); } } });
  const status = await cluster.snapshot();
  assert.ok(status.nodes.every((node) => node.status === 'unavailable' && !node.healthy));
  assert.equal(status.balancer, null);
});

async function finishJob(cluster) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const snapshot = await cluster.snapshot();
    if (!snapshot.busy && snapshot.job?.status !== 'running') return snapshot;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('job did not finish');
}

test('pauses routing persistently and resumes only after container health', async t => {
  const { cluster, running, stateFile } = await setup(t);
  await cluster.startJob({ action: 'pause-container', node: 'primary', actor: 'creator' });
  const paused = await finishJob(cluster);
  assert.equal(paused.paused, true);
  assert.equal(paused.active, null);
  assert.equal(running['moon-primary'], false);
  await assert.rejects(cluster.activeUrl('fallback'), /pausado/);
  assert.equal(JSON.parse(await fs.readFile(stateFile)).paused, true);
  await cluster.startJob({ action: 'resume-container', node: 'primary', actor: 'creator' });
  assert.equal((await finishJob(cluster)).job.status, 'completed');
  assert.equal(await cluster.activeUrl('fallback'), 'http://primary:5000');
});

test('updates the stopped reserve from the allowlist and serializes with switching', async t => {
  const replacements = [];
  const { cluster } = await setup(t, { overrides: { releases: [{ id: 'alpha', image: 'fixed-digest' }], replaceContainer: async options => { replacements.push(options); return { backup: 'previous' }; } } });
  await assert.rejects(cluster.startJob({ action: 'update', node: 'backup', release: 'arbitrary' }));
  await cluster.startJob({ action: 'update', node: 'backup', release: 'alpha', actor: 'creator' });
  await assert.rejects(cluster.switchTo({ from: 'primary', to: 'backup' }), /en curso/);
  assert.equal((await finishJob(cluster)).job.status, 'completed');
  assert.equal(replacements[0].image, 'fixed-digest');
  await cluster.startJob({ action: 'update', node: 'primary', release: 'alpha' });
  assert.equal((await finishJob(cluster)).job.status, 'failed');
  assert.equal(replacements.length, 1);
});

test('transfers bot only after confirmed drain and keeps source paused on uncertain destination', async t => {
  const bot = 'aabbccddeeff'; const operations = [];
  const states = { primary: { id: bot, controllable: true, paused: false, revision: 0, offset: 17, inflight: 0 }, backup: { id: bot, controllable: true, paused: true, revision: 0, offset: 0, inflight: 0 } };
  const { cluster, running } = await setup(t, { overrides: { adminKey: 'private-key', fetcher: async (url, options) => {
    const node = new URL(url).hostname;
    if (url.endsWith('/health')) return { ok: true, json: async () => ({ ok: true }) };
    if (options?.method === 'POST') {
      const request = JSON.parse(options.body); operations.push(`${node}/${request.action}`);
      states[node].paused = request.action === 'pause'; states[node].revision++;
      if (request.offset != null) states[node].offset = request.offset;
      if (node === 'backup') throw new Error('reply lost');
    }
    return { ok: true, json: async () => ({ ok: true, node, bots: [{ ...states[node] }] }) };
  } } });
  running['moon-backup'] = true;
  await cluster.startJob({ action: 'transfer-bot', node: 'primary', to: 'backup', bot });
  const result = await finishJob(cluster);
  assert.equal(result.job.status, 'failed');
  assert.deepEqual(operations, ['primary/pause', 'backup/resume']);
  assert.equal(states.primary.paused, true);
  assert.equal(states.backup.offset, 17);
});

test('a restarted API blocks new operations when the prior job was unfinished', async t => {
  const { stateFile } = await setup(t);
  await fs.writeFile(stateFile, JSON.stringify({ active: 'primary', events: [], job: { status: 'running' } }));
  const cluster = createMoonbotCluster({ nodes, stateFile, docker: async () => { throw new Error('must not mutate'); } });
  await assert.rejects(cluster.startJob({ action: 'pause-container', node: 'primary' }), /interrumpida/);
});


test('shared monitoring coalesces readers and invalidates after a switch', async t => {
  const { cluster, calls } = await setup(t);
  const rows = await Promise.all(Array.from({ length: 1000 }, () => cluster.sharedSnapshot()));
  assert.ok(rows.every(row => row.active === 'primary'));
  assert.equal(calls.filter(call => call.endsWith('/json')).length, 2);
  await cluster.switchTo({ from: 'primary', to: 'backup', actor: 'creator' });
  assert.equal((await cluster.sharedSnapshot()).active, 'backup');
});
