import assert from 'node:assert/strict';
import test from 'node:test';
import { searchAccountsSemantically } from '../src/utils/accountSemanticSearch.js';

const accounts = [
  { id: 'a2', name: 'Ana Operaciones', email: 'ana@example.test', role: 'admin', verified: true, is_frozen: false, language: 'es' },
  { id: 'a1', name: 'Berta', email: 'berta@example.test', role: 'admin', verified: false, is_frozen: true, language: 'ca' },
  { id: 'u1', name: 'Carlos', email: 'carlos@example.test', role: 'user', verified: true, is_frozen: false, language: 'es' },
];

test('ranks by intent and Spanish synonyms instead of literal-only matching', () => {
  const results = searchAccountsSemantically(accounts, 'administradores activos');

  assert.deepEqual(results.map((result) => result.account_id), ['a2', 'a1', 'u1']);
  assert.deepEqual(results[0].matched_concepts, ['role_admin', 'status_active']);
  assert.ok(results[0].score > results[1].score);
  assert.ok(results[1].score > results[2].score);
});

test('understands multi-word verification and proxy intentions', () => {
  const results = searchAccountsSemantically(accounts, 'cuentas sin verificar con proxy', {
    proxies: [{ id: 'p1', user_id: 'a1' }],
  });

  assert.equal(results[0].account_id, 'a1');
  assert.deepEqual(results[0].matched_concepts, ['unverified', 'has_proxy']);
  assert.deepEqual(results[0].matched_fields, ['proxy', 'verified']);
});

test('uses account fields while keeping sensitive values out of explanations', () => {
  const [result] = searchAccountsSemantically(accounts, 'ana operaciones');

  assert.equal(result.account_id, 'a2');
  assert.deepEqual(result.matched_fields, ['email', 'name']);
  assert.equal(result.explanation, 'Coincidencia por campos: email, name.');
  assert.equal(result.explanation.includes('Ana'), false);
  assert.equal(result.explanation.includes('example.test'), false);
});

test('is deterministic, bounded and does not mutate input', () => {
  const before = structuredClone(accounts);
  const first = searchAccountsSemantically(accounts, 'verificados', { limit: 1 });
  const second = searchAccountsSemantically(accounts, 'verificados', { limit: 1 });

  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.deepEqual(accounts, before);
  assert.deepEqual(searchAccountsSemantically(null, 'admin'), []);
  assert.deepEqual(searchAccountsSemantically(accounts, '   '), []);
});
