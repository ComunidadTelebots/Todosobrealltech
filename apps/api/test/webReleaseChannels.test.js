import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const compose = read('docker-compose.yml');
const releaseCompose = read('docker-compose.release.yml');
const dockerfile = read('apps/web/Dockerfile');
const header = read('apps/web/src/components/Header.jsx');
const releaseConfig = read('apps/web/src/lib/releaseChannel.js');
const apiRoute = read('apps/api/src/routes/moonbot-admin.js');

test('keeps the existing stable web service as the default channel', () => {
  assert.match(compose, /web:\s+[\s\S]*VITE_RELEASE_CHANNEL: stable/);
  assert.doesNotMatch(compose, /web:\s+[\s\S]*profiles:/);
});

test('declares isolated opt-in rc, beta and alpha services', () => {
  for (const channel of ['rc', 'beta', 'alpha']) {
    assert.match(releaseCompose, new RegExp(`web-${channel}:`));
    assert.match(releaseCompose, new RegExp(`profiles:\\s*\\["${channel}"\\]`));
    assert.match(releaseCompose, new RegExp(`VITE_RELEASE_CHANNEL: ${channel}`));
  }
  assert.match(releaseCompose, /traefik\.enable=\$\{RELEASE_CHANNELS_PUBLIC:-false\}/);
});

test('bakes and visibly renders the executed channel and version', () => {
  assert.match(dockerfile, /ARG VITE_RELEASE_CHANNEL=stable/);
  assert.match(dockerfile, /ARG VITE_RELEASE_VERSION=local/);
  assert.match(releaseConfig, /\['stable', 'rc', 'beta', 'alpha'\]/);
  assert.match(header, /releaseLabel/);
  assert.match(header, /Canal ejecutado/);
});

test('reuses feature_release_access for the authenticated user entitlement', () => {
  assert.match(apiRoute, /router\.get\('\/feature-release-access\/me'/);
  assert.match(apiRoute, /releaseChannelForUser\(auth\.user, actorRole\)/);
  assert.match(header, /feature-release-access\/me/);
});
