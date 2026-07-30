import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../src/routes/moonbot-admin.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../../pocketbase/pb_migrations/1785200001_add_feature_release_access.js', import.meta.url), 'utf8');

test('release assignment is isolated from editable user profiles and creator-only', () => {
  assert.match(route, /auth\.user\.role !== 'creator'/);
  assert.match(route, /feature_release_access/);
  assert.doesNotMatch(route, /auth\.user\.release_channel/);
  assert.match(migration, /createRule: "@request\.auth\.role = 'creator'"/);
  assert.match(migration, /UNIQUE INDEX idx_feature_release_telegram/);
});

test('web and Moonbot must agree on account and Telegram identity', () => {
  assert.match(route, /account_id=.*telegram_id=.*enabled=true/);
  assert.match(route, /La cuenta debe vincular primero Telegram/);
  assert.match(route, /X-Moon-Release-Channel/);
  assert.match(route, /Cache-Control': 'private, no-store, max-age=0'/);
  assert.match(route, /Vary: 'Authorization'/);
  assert.match(route, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(route, /releaseLevel\[currentChannel\] < releaseLevel\[required\]/);
  assert.match(route, /release-forward-auth\/:channel/);
  assert.match(route, /payload\.exp - payload\.iat > RELEASE_SESSION_TTL_SECONDS/);
  assert.doesNotMatch(route, /requestedReleaseChannel|x-forwarded-host/);
});
