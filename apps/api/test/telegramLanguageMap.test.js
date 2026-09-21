import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOONBOT_INTERNAL_URL = 'http://moonbot:5000';
process.env.MOONBOT_PUBLIC_URL = 'https://cintiabot.example';

const { requestLanguageMap } = await import('../src/routes/telegram-language-map.js');

test('consulta primero el servicio interno de Moonbot', async () => {
  const calls = [];
  const expected = { ok: true, total_users: 2, languages: 1, points: [] };
  const result = await requestLanguageMap(async (url) => {
    calls.push(url);
    return { ok: true, json: async () => expected };
  });
  assert.deepEqual(result, expected);
  assert.equal(calls[0], 'http://moonbot:5000/api/public/stats/language-map');
  assert.equal(calls.length, 1);
});

test('usa la URL pública solo como respaldo', async () => {
  const calls = [];
  const result = await requestLanguageMap(async (url) => {
    calls.push(url);
    if (url.startsWith('http://moonbot:5000')) throw new Error('interno no disponible');
    return { ok: true, json: async () => ({ ok: true, total_users: 1, languages: 1, points: [] }) };
  });
  assert.equal(result.total_users, 1);
  assert.equal(calls.length, 5);
  assert.ok(calls.slice(0, 4).every((url) => url.startsWith('http://moonbot:5000')));
  assert.match(calls[4], /^https:\/\/cintiabot\.example/);
});

test('rechaza respuestas que no cumplen el contrato', async () => {
  await assert.rejects(
    requestLanguageMap(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    /inválida/,
  );
});
