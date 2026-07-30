import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseFeatureInGroup, canUseMoonbotFeature, filterMoonbotFeatures,
  moonRoleFor, normalizeFeatureGroups, normalizeReleaseChannel, payloadGroupId } from '../src/utils/moonbotFeatureAccess.js';

const features = [
  { id: 'public', minimum_role: 'user' },
  { id: 'admin', minimum_role: 'group_admin' },
  { id: 'owner', minimum_role: 'group_creator' },
  { id: 'master', minimum_role: 'master' },
];

test('release channels progressively expose stable, rc, beta and alpha features', () => {
  const channelFeatures = [
    { id: 'stable', minimum_role: 'user', release_channel: 'stable' },
    { id: 'rc', minimum_role: 'user', release_channel: 'rc' },
    { id: 'beta', minimum_role: 'user', release_channel: 'beta' },
    { id: 'alpha', minimum_role: 'user', release_channel: 'alpha' },
  ];
  assert.deepEqual(filterMoonbotFeatures(channelFeatures, 'user', 'beta').map((item) => item.id), ['stable', 'rc', 'beta']);
  assert.equal(normalizeReleaseChannel('invalid'), 'stable');
});

test('maps application roles to Moonbot roles without privilege escalation', () => {
  assert.equal(moonRoleFor('creator'), 'master');
  assert.equal(moonRoleFor('admin'), 'group_admin');
  assert.equal(moonRoleFor('moderator'), 'group_admin');
  assert.equal(moonRoleFor('unknown'), 'user');
});

test('each role only receives its own feature level and lower levels', () => {
  assert.deepEqual(filterMoonbotFeatures(features, 'user').map(({ id }) => id), ['public']);
  assert.deepEqual(filterMoonbotFeatures(features, 'admin').map(({ id }) => id), ['public', 'admin']);
  assert.deepEqual(filterMoonbotFeatures(features, 'group_creator').map(({ id }) => id), ['public', 'admin', 'owner']);
  assert.deepEqual(filterMoonbotFeatures(features, 'creator').map(({ id }) => id), ['public', 'admin', 'owner', 'master']);
});

test('execution authorization is deny-by-default for malformed or unknown roles', () => {
  assert.equal(canUseMoonbotFeature('user', features[1]), false);
  assert.equal(canUseMoonbotFeature('admin', features[1]), true);
  assert.equal(canUseMoonbotFeature('admin', features[3]), false);
  assert.equal(canUseMoonbotFeature('creator', features[3]), true);
  assert.equal(canUseMoonbotFeature('creator', { minimum_role: 'root' }), false);
  assert.equal(canUseMoonbotFeature('creator', {}), true);
});

test('normalizes the real group context without duplicate or malformed ids', () => {
  assert.deepEqual(normalizeFeatureGroups([
    { chat_id: '-1001', title: 'Uno', admin_status: 'creator' },
    { id: '-1001', name: 'Duplicado' },
    { id: 'not-a-group', name: 'Inválido' },
  ]), [{ id: '-1001', name: 'Uno', access_role: 'creator', type: 'group' }]);
});

test('prevents changing a group-scoped feature to an inaccessible group', () => {
  const scoped = { minimum_role: 'group_admin', input_schema: { parameters: [
    { name: 'group_id', binding: 'kwargs', required: true },
  ] } };
  const allowed = [{ id: '-1001', name: 'Administrado' }];
  assert.equal(payloadGroupId(scoped, { kwargs: { group_id: '-1001' } }), '-1001');
  assert.equal(canUseFeatureInGroup(scoped, { kwargs: { group_id: '-1001' } }, allowed, 'group_admin'), true);
  assert.equal(canUseFeatureInGroup(scoped, { kwargs: { group_id: '-9999' } }, allowed, 'group_admin'), false);
  assert.equal(canUseFeatureInGroup(scoped, { kwargs: {} }, allowed, 'group_admin'), false);
});

test('supports positional group ids and keeps unscoped features available', () => {
  const positional = { input_schema: { parameters: [
    { name: 'label', binding: 'args' }, { name: 'chat_id', binding: 'args' },
  ] } };
  assert.equal(payloadGroupId(positional, { args: ['Aviso', '-1002'] }), '-1002');
  assert.equal(canUseFeatureInGroup(positional, { args: ['Aviso', '-1002'] }, [{ id: '-1002' }], 'group_creator'), true);
  assert.equal(canUseFeatureInGroup({ input_schema: { parameters: [] } }, {}, [], 'user'), true);
});
