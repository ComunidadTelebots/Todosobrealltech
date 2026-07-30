import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/routes/onion.js', import.meta.url), 'utf8');

test('la creación Onion no decodifica JWT sin verificar', () => {
  assert.doesNotMatch(source, /decodeJWT|authStore\.save\s*\(/);
  assert.match(source, /authorizeAdminOrCreator\(req\)/);
  assert.match(source, /const userId = auth\.user\.id/);
});
