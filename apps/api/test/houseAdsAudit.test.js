import test from 'node:test';
import assert from 'node:assert/strict';
import { houseAdsAuditConstants } from '../src/utils/houseAdsAudit.js';

test('la auditoría solo admite acciones administrativas conocidas', () => {
  assert.equal(houseAdsAuditConstants.ACTIONS.has('upsert'), true);
  assert.equal(houseAdsAuditConstants.ACTIONS.has('approve'), true);
  assert.equal(houseAdsAuditConstants.ACTIONS.has('raw_secret_dump'), false);
});
