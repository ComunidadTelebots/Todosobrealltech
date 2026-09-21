import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCommunicationPreferences, sanitizeCommunicationPreferences } from '../src/utils/accountCommunicationPreferences.js';

test('sanitizes synchronized communication preferences', () => {
  const value = sanitizeCommunicationPreferences({ channels: { email: false, unknown: true }, topics: { security: false }, digest: 'weekly', quiet_hours: { enabled: true, start: '23:30', end: '07:15', timezone: 'Europe/Madrid' } });
  assert.equal(value.channels.email, false);
  assert.equal(Object.hasOwn(value.channels, 'unknown'), false);
  assert.equal(value.topics.security, false);
  assert.equal(value.topics.system, true);
  assert.equal(value.digest, 'weekly');
  assert.equal(value.quiet_hours.start, '23:30');
});

test('rejects invalid timezone and preserves defaults for invalid choices', () => {
  assert.throws(() => sanitizeCommunicationPreferences({ quiet_hours: { timezone: '<script>' } }));
  const value = sanitizeCommunicationPreferences({ digest: 'hourly' }, defaultCommunicationPreferences());
  assert.equal(value.digest, 'daily');
});
