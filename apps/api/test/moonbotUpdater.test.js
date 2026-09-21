import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReleases, replaceStoppedContainer } from '../src/utils/moonbotUpdater.js';

const image = `ghcr.io/example/moonbot@sha256:${'a'.repeat(64)}`;
test('release catalog requires pinned images and unique ids', () => {
  assert.equal(parseReleases(JSON.stringify([{ id: 'alpha', image }]))[0].image, image);
  for (const rows of [[{ id: 'alpha', image: 'moonbot:latest' }], [{ id: 'x', image }, { id: 'x', image }], [{ id: '../x', image }]]) assert.throws(() => parseReleases(JSON.stringify(rows)));
});
function fixture({ running = false, failCreate = false } = {}) {
  const calls = []; let renamed = false;
  const old = { Id: 'old-id', Config: { Image: 'old-image', Env: ['TOKEN=PRIVATE'], Labels: {} }, State: { Running: running }, HostConfig: { RestartPolicy: { Name: 'always' }, Binds: [] }, Mounts: [{ Type: 'volume', Name: 'persisted-volume', Destination: '/app/data', RW: true }], NetworkSettings: { Networks: { internal: { Aliases: ['moon'] } } } };
  const engine = async (path, method, body) => {
    calls.push({ path, method, body });
    if (path.startsWith('/images/create')) return {};
    if (path.startsWith('/images/')) return { Id: 'new-image-id', RepoDigests: [image] };
    if (path === '/containers/moon/json') { if (renamed) throw new Error('not found'); return structuredClone(old); }
    if (path.startsWith('/containers/moon/rename')) { renamed = true; return {}; }
    if (path.startsWith('/containers/create')) { if (failCreate) throw new Error('create failed'); return { Id: 'new' }; }
    if (path === '/containers/new/json') return { Image: 'new-image-id', State: { Running: false } };
    return {};
  };
  return { calls, engine };
}
test('updates only stopped containers, preserves volumes, keeps old container without auto restart', async () => {
  const { engine, calls } = fixture();
  const result = await replaceStoppedContainer({ container: 'moon', image, suffix: 'test', engine });
  const create = calls.find(row => row.path.startsWith('/containers/create'));
  assert.deepEqual(create.body.HostConfig.Binds, ['persisted-volume:/app/data:rw']);
  assert.deepEqual(create.body.Config, undefined);
  assert.equal(create.body.Env[0], 'TOKEN=PRIVATE');
  assert.equal(create.body.Image, image);
  assert.equal(calls.find(row => row.path.endsWith('/update')).body.RestartPolicy.Name, 'no');
  assert.ok(!calls.some(row => row.path.endsWith('/start')));
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.equal(result.backup, 'moon-previous-test');
});
test('rejects running containers before downloading and restores name on failed create', async () => {
  const active = fixture({ running: true });
  await assert.rejects(replaceStoppedContainer({ container: 'moon', image, suffix: 'test', engine: active.engine }));
  assert.equal(active.calls.length, 1);
  const failed = fixture({ failCreate: true });
  await assert.rejects(replaceStoppedContainer({ container: 'moon', image, suffix: 'test', engine: failed.engine }), /restaurado/);
  assert.ok(failed.calls.some(row => row.path === '/containers/moon-previous-test/rename?name=moon'));
});
