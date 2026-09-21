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
  const { cluster } = await setup(t, { overrides: { token: 'test', fetcher: async (url) => {
    if (url.endsWith('/health')) return { ok: true, json: async () => ({ ok: true }) };
    started.push(new URL(url).pathname);
    if (started.length === 3) release();
    await barrier;
    return { ok: true, json: async () => ({ ok: true, state: {}, stats: {} }) };
  } } });
  const timeout = setTimeout(release, 1000);
  try {
    const pending = cluster.snapshot();
    await barrier;
    assert.equal(started.length, 3, 'all independent telemetry requests must start before any completes');
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
