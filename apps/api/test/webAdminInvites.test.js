import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canElevateWebRole, createAdminInvite, createTelegramVerification, hashAdminInviteToken,
  normalizeTelegramClaim, publicAdminInvite } from '../src/utils/webAdminInvites.js';

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
  assert.match(route, /pending_verification: true/);
  assert.doesNotMatch(route.match(/router\.all\('\/web-admin-invitations'[\s\S]*?router\.all\('\/account-tools\/approvals'/)?.[0] || '', /X-Moon-Actor-Role|group_id|chat_id/);
});

test('PocketBase prevents clients from assigning or changing their own web role', () => {
  const migration = fs.readFileSync(new URL('../../pocketbase/pb_migrations/1785210001_protect_web_admin_roles.js', import.meta.url), 'utf8');
  assert.match(migration, /createRule = "@request\.body\.role = 'user'"/);
  assert.match(migration, /@request\.body\.role:changed = false/);
  assert.match(migration, /@request\.auth\.role = 'creator'/);
});

test('creates a short Telegram challenge bound to an ID or username', () => {
  assert.deepEqual(normalizeTelegramClaim('@Cuenta_123'), { type: 'username', value: 'cuenta_123' });
  assert.deepEqual(normalizeTelegramClaim('163103382'), { type: 'id', value: '163103382' });
  const created = createTelegramVerification({ accountId: 'account1', role: 'admin', claim: '@Cuenta_123',
    invitationId: 'invite1', now: new Date('2026-07-31T10:00:00Z') });
  assert.match(created.code, /^WEB-[A-Z0-9_-]{12}$/);
  assert.equal(created.record.code, undefined);
  assert.equal(created.record.code_hash, hashAdminInviteToken(created.code));
  assert.equal(created.record.expires_at, '2026-07-31T10:15:00.000Z');
});

test('only the bot can confirm Telegram and the role changes after identity matching', () => {
  const route = fs.readFileSync(new URL('../src/routes/moonbot-admin.js', import.meta.url), 'utf8');
  assert.match(route, /web-admin-verifications\/confirm/);
  assert.match(route, /X-Moon-Admin-Key/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /identityMatches/);
  assert.match(route, /telegram_id: senderId/);
  assert.match(route, /telegram_verified_invitation/);
  assert.match(route, /La aprobación antigua no verifica Telegram/);
});
