import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseMoonbotFeature, filterMoonbotFeatures, moonRoleFor } from '../src/utils/moonbotFeatureAccess.js';

const features = [
  { id: 'public', minimum_role: 'user' },
  { id: 'admin', minimum_role: 'group_admin' },
  { id: 'owner', minimum_role: 'group_creator' },
  { id: 'master', minimum_role: 'master' },
];

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
