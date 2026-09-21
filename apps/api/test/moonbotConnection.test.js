import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMoonbot } from '../src/utils/moonbotConnection.js';

test('reintenta lecturas mientras Moonbot arranca', async () => {
  let calls = 0;
  const response = await requestMoonbot('/health', {
    retryDelayMs: 1,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) throw new Error('ECONNREFUSED');
      return new Response('{"ok":true}', { status: 200 });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
});

test('no repite escrituras administrativas', async () => {
  let calls = 0;
  await assert.rejects(() => requestMoonbot('/api/internal/action', {
    method: 'POST', retryDelayMs: 1,
    fetchImpl: async () => { calls += 1; throw new Error('ECONNRESET'); },
  }));
  assert.equal(calls, 1);
});

test('las lecturas reintentadas usan el nodo activo actual tras una conmutación', async () => {
  const origins = ['http://primary:5000', 'http://backup:5000'];
  const urls = [];
  await requestMoonbot('/health', {
    retryDelayMs: 1, resolveOrigin: async () => origins.shift(),
    fetchImpl: async (url) => { urls.push(url); return new Response('{}', { status: urls.length === 1 ? 503 : 200 }); },
  });
  assert.deepEqual(urls, ['http://primary:5000/health', 'http://backup:5000/health']);
});
