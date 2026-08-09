import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUrlInspectionRequest } from '../src/utils/moonbotSecurityProxy.js';

test('el proxy del inspector conserva solo la acción y URL necesarias', () => {
  assert.deepEqual(sanitizeUrlInspectionRequest({
    value: ' https://example.com/path?q=1 ',
    action: 'delete',
    admin_key: 'no-debe-pasar',
  }), { url: 'https://example.com/path?q=1' });
});

test('el proxy rechaza valores vacíos, controles y cargas excesivas', () => {
  assert.throws(() => sanitizeUrlInspectionRequest({ value: '' }), /URL/);
  assert.throws(() => sanitizeUrlInspectionRequest({ value: 'https://example.com/\nheader: value' }), /URL/);
  assert.throws(() => sanitizeUrlInspectionRequest({ value: `https://example.com/${'a'.repeat(2048)}` }), /URL/);
});
