import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCOUNT_WEBHOOK_EVENTS,
  createAccountWebhook,
  createAccountWebhookPayload,
  prepareAccountWebhookDelivery,
  serializeAccountWebhookPayload,
  signAccountWebhookPayload,
  validateAccountWebhookUrl,
} from '../src/utils/accountWebhooks.js';

test('accepts only public HTTPS webhook destinations', () => {
  assert.equal(validateAccountWebhookUrl('https://hooks.example.com/accounts'), 'https://hooks.example.com/accounts');
  for (const url of [
    'http://hooks.example.com', 'https://localhost/hook', 'https://api.local/hook',
    'https://127.0.0.1/hook', 'https://10.0.0.2/hook', 'https://172.16.2.3/hook',
    'https://192.168.1.2/hook', 'https://169.254.1.1/hook', 'https://[::1]/hook',
    'https://[fd00::1]/hook', 'https://user:pass@example.com/hook',
  ]) assert.throws(() => validateAccountWebhookUrl(url), /HTTPS pública|locales o privados/);
});

test('enforces the account event allowlist', () => {
  assert.deepEqual(ACCOUNT_WEBHOOK_EVENTS, [
    'account.created', 'account.role_changed', 'account.frozen', 'account.recovered',
  ]);
  const hook = createAccountWebhook({
    id: 'hook-1', url: 'https://hooks.example.com/account',
    events: ['account.created', 'account.created', 'account.frozen'], secret: 'a-secure-secret-value',
  });
  assert.deepEqual(hook.events, ['account.created', 'account.frozen']);
  assert.throws(() => createAccountWebhook({
    id: 'hook-2', url: 'https://hooks.example.com', events: ['account.deleted'], secret: 'a-secure-secret-value',
  }), /no permitidos/);
});

test('creates an identified, timestamped payload and strips secrets recursively', () => {
  const payload = createAccountWebhookPayload({
    id: 'evt-1', event: 'account.role_changed', timestamp: '2026-07-30T10:00:00.000Z',
    account: { id: 'user-1', role: 'admin', accessToken: 'never-send' },
    data: { before: 'user', after: 'admin', nested: { webhook_secret: 'never-send', visible: true } },
  });
  assert.deepEqual(payload, {
    account: { id: 'user-1', role: 'admin' },
    data: { after: 'admin', before: 'user', nested: { visible: true } },
    event: 'account.role_changed', id: 'evt-1', timestamp: '2026-07-30T10:00:00.000Z',
  });
  assert.throws(() => createAccountWebhookPayload({
    id: 'evt-2', event: 'account.deleted', timestamp: '2026-07-30T10:00:00.000Z', account: {},
  }), /no permitido/);
  assert.throws(() => createAccountWebhookPayload({
    id: 'evt-2', event: 'account.created', timestamp: 'July 30, 2026', account: {},
  }), /timestamp ISO/);
});

test('produces a deterministic HMAC SHA-256 over canonical JSON', () => {
  const secret = '0123456789abcdef';
  const first = { event: 'account.created', data: { z: 1, a: 2 }, id: 'evt', timestamp: '2026-07-30T10:00:00Z' };
  const reordered = { timestamp: '2026-07-30T10:00:00Z', id: 'evt', data: { a: 2, z: 1 }, event: 'account.created' };
  assert.equal(serializeAccountWebhookPayload(first), serializeAccountWebhookPayload(reordered));
  assert.equal(signAccountWebhookPayload(first, secret), signAccountWebhookPayload(reordered, secret));
  assert.match(signAccountWebhookPayload(first, secret), /^[a-f0-9]{64}$/);
  assert.throws(() => signAccountWebhookPayload(first, 'short'), /16 caracteres/);
});

test('prepares but never sends a delivery and never serializes its secret', () => {
  const secret = '0123456789abcdef';
  const payload = createAccountWebhookPayload({
    id: 'evt-3', event: 'account.recovered', timestamp: '2026-07-30T10:00:00Z', account: { id: 'user-3' },
  });
  const delivery = prepareAccountWebhookDelivery({ url: 'https://hooks.example.com/account', secret, payload });
  assert.equal(delivery.method, 'POST');
  assert.match(delivery.headers['x-account-webhook-signature'], /^sha256=[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(delivery).includes(secret), false);
  assert.equal(JSON.stringify(createAccountWebhook({
    id: 'hook-3', url: delivery.url, events: ['account.recovered'], secret,
  })).includes(secret), false);
});
