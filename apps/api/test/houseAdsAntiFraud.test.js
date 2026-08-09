import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptAdClick, adRequestFingerprint, resetAdFraudState } from '../src/utils/houseAdsAntiFraud.js';

test('genera huella irreversible y limita rÃ¡fagas de clics', () => {
  resetAdFraudState();
  const req = { ip: '203.0.113.1', get: (name) => name === 'user-agent' ? 'browser' : '' };
  const fingerprint = adRequestFingerprint(req, 'campaign-1');
  assert.match(fingerprint, /^[a-f0-9]{32}$/);
  assert.equal(fingerprint.includes(req.ip), false);
  for (let index = 0; index < 8; index += 1) assert.equal(acceptAdClick(fingerprint, 1000 + index).accepted, true);
  assert.equal(acceptAdClick(fingerprint, 1010).accepted, false);
  assert.equal(acceptAdClick(fingerprint, 61_100).accepted, true);
});
