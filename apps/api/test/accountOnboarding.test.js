import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeOnboardingStep, buildAccountOnboarding, diagnoseCreatorAccount } from '../src/utils/accountOnboarding.js';

test('personaliza el recorrido y calcula progreso desde estado verificable', () => {
  const result = buildAccountOnboarding({ account: { role: 'admin', name: 'Ana', verified: true, telegram_id: '12' }, communicationPreferences: { updated_at: '2026-08-11' }, acknowledged: ['welcome'] });
  assert.equal(result.role, 'admin');
  assert.equal(result.completed, 4);
  assert.ok(result.steps.some((step) => step.id === 'security_review'));
  assert.ok(!result.steps.some((step) => step.id === 'creator_resources'));
});

test('el diagnostico solo existe para creator y no expone datos personales', () => {
  assert.equal(diagnoseCreatorAccount({ account: { role: 'admin' } }), null);
  const result = diagnoseCreatorAccount({ account: { role: 'creator', verified: true, telegram_id: '9', name: 'C', email: 'c@example.test', is_frozen: false }, proxies: [{ status: 'active' }] });
  assert.equal(result.healthy, true);
  assert.equal(result.score, 100);
  assert.equal(JSON.stringify(result).includes('c@example.test'), false);
});

test('solo permite confirmar pasos opcionales sin falsear comprobaciones', () => {
  assert.deepEqual(acknowledgeOnboardingStep(['welcome'], 'welcome'), ['welcome']);
  assert.throws(() => acknowledgeOnboardingStep([], 'telegram'), /estado real/);
});
