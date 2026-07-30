import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addAccountConfigTemplateVersion,
  createAccountConfigTemplate,
  previewAccountConfigTemplate,
  validateAccountTemplateConfig,
} from '../src/utils/accountConfigTemplates.js';

const firstDate = '2026-07-30T10:00:00.000Z';

test('creates an immutable versioned account configuration template', () => {
  const config = { role: 'user', verified: true, preferences: { compact: true } };
  const template = createAccountConfigTemplate({
    id: 'secure-default', name: 'Cuenta segura', config, createdBy: 'creator-1', now: firstDate,
  });
  config.preferences.compact = false;

  assert.equal(template.current_version, 1);
  assert.equal(template.versions[0].created_at, firstDate);
  assert.deepEqual(template.versions[0].config, { role: 'user', verified: true, preferences: { compact: true } });
});

test('adds versions without changing the previous template', () => {
  const original = createAccountConfigTemplate({
    id: 'ops-default', name: 'Operaciones', config: { language: 'es' }, createdBy: 'u1', now: firstDate,
  });
  const updated = addAccountConfigTemplateVersion(original, {
    config: { language: 'en', notifications: { security: true } }, createdBy: 'u2', now: '2026-07-30T11:00:00Z',
  });

  assert.equal(original.versions.length, 1);
  assert.equal(updated.current_version, 2);
  assert.deepEqual(updated.versions.map((item) => item.version), [1, 2]);
});

test('validates supported fields and types', () => {
  assert.deepEqual(validateAccountTemplateConfig({ role: 'creator', is_frozen: false }), { valid: true, errors: [] });
  const invalid = validateAccountTemplateConfig({ role: 'owner', password: 'secret', verified: 'yes' });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 3);
  assert.throws(() => createAccountConfigTemplate({ id: 'bad', name: 'Bad', config: {}, createdBy: 'u1' }), /al menos un campo/);
});

test('applies a selected version only as a non-executable preview', () => {
  const account = { id: 'account-7', role: 'user', verified: false, language: 'ca' };
  const before = structuredClone(account);
  let template = createAccountConfigTemplate({
    id: 'verified-user', name: 'Verificada', config: { verified: true, language: 'es' }, createdBy: 'u1', now: firstDate,
  });
  template = addAccountConfigTemplateVersion(template, {
    config: { role: 'admin', verified: true }, createdBy: 'u2', now: firstDate,
  });

  const preview = previewAccountConfigTemplate(template, account, 1);
  assert.equal(preview.mode, 'preview');
  assert.equal(preview.executable, false);
  assert.deepEqual(preview.changes.map((change) => change.field), ['verified', 'language']);
  assert.equal(preview.after.verified, true);
  assert.equal(preview.after.role, 'user');
  assert.deepEqual(account, before);
  assert.throws(() => previewAccountConfigTemplate(template, account, 99), /no encontrada/);
});
