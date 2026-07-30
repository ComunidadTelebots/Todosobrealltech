import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canElevateWebRole, createAdminInvite, hashAdminInviteToken, publicAdminInvite } from '../src/utils/webAdminInvites.js';

test('creates expiring administration links without persisting the bearer token', () => {
  const now = new Date('2026-07-31T10:00:00.000Z');
  const created = createAdminInvite({ role: 'admin', expiresHours: 24, maxUses: 1, creatorId: 'master1', now });
  assert.match(created.token, /^[A-Za-z0-9_-]{40,64}$/);
  assert.equal(created.record.token_hash, hashAdminInviteToken(created.token));
  assert.equal(created.record.token, undefined);
  assert.equal(publicAdminInvite(created.record, now).valid, true);
});

test('rejects unsafe roles, excessive validity and downgrades', () => {
  assert.throws(() => createAdminInvite({ role: 'creator', expiresHours: 1, maxUses: 1, creatorId: 'master1' }));
  assert.throws(() => createAdminInvite({ role: 'admin', expiresHours: 169, maxUses: 1, creatorId: 'master1' }));
  assert.equal(canElevateWebRole('user', 'moderator'), false);
  assert.equal(canElevateWebRole('moderator', 'admin'), true);
  assert.equal(canElevateWebRole('admin', 'moderator'), false);
  assert.equal(canElevateWebRole('creator', 'admin'), false);
});

test('routes keep web administration independent from Telegram group permissions', () => {
  const route = fs.readFileSync(new URL('../src/routes/moonbot-admin.js', import.meta.url), 'utf8');
  assert.match(route, /web-admin-invitations\/redeem/);
  assert.match(route, /auth\.user\.role !== 'creator'/);
  assert.match(route, /hashAdminInviteToken/);
  assert.match(route, /los permisos de grupos Telegram no han cambiado/);
  assert.doesNotMatch(route.match(/router\.all\('\/web-admin-invitations'[\s\S]*?router\.all\('\/account-tools\/approvals'/)?.[0] || '', /X-Moon-Actor-Role|group_id|chat_id/);
});

test('PocketBase prevents clients from assigning or changing their own web role', () => {
  const migration = fs.readFileSync(new URL('../../pocketbase/pb_migrations/1785210001_protect_web_admin_roles.js', import.meta.url), 'utf8');
  assert.match(migration, /createRule = "@request\.body\.role = 'user'"/);
  assert.match(migration, /@request\.body\.role:changed = false/);
  assert.match(migration, /@request\.auth\.role = 'creator'/);
});
