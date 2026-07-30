import assert from 'node:assert/strict';
import test from 'node:test';
import { detectAccountAnomalies } from '../src/utils/accountAnomalies.js';

test('detects duplicate Telegram identities and privileged accounts without verification', () => {
  const anomalies = detectAccountAnomalies([
    { id: 'a', telegram_id: '123', email: 'a@example.test', role: 'admin', verified: false },
    { id: 'b', telegram_id: '123', email: 'b@example.test', role: 'user', verified: true },
  ]);
  assert.deepEqual(anomalies.map((item) => item.type), ['duplicate_telegram', 'unverified_privileged']);
});

test('detects proxy concentration and ignores ordinary accounts', () => {
  const proxies = Array.from({ length: 10 }, (_, index) => ({ id: String(index), user_id: 'a' }));
  const anomalies = detectAccountAnomalies([{ id: 'a', role: 'user', verified: true }], proxies);
  assert.equal(anomalies[0].type, 'proxy_concentration');
  assert.equal(anomalies[0].count, 10);
});
