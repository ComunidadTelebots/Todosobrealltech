import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overview = fs.readFileSync(new URL('../../web/src/components/MoonbotAdminOverview.jsx', import.meta.url), 'utf8');
const center = fs.readFileSync(new URL('../../web/src/components/MoonbotFeatureCenter.jsx', import.meta.url), 'utf8');
const form = fs.readFileSync(new URL('../../web/src/components/MoonbotSchemaFeatureForm.jsx', import.meta.url), 'utf8');

test('uses one automatic verified-feature panel instead of duplicating operation panels', () => {
  assert.match(overview, /MoonbotFeatureCenter/);
  assert.doesNotMatch(overview, /MoonbotSpecificOperationsCenter|moon-specific-operations/);
  assert.equal((overview.match(/'moon-features'/g) || []).length, 2);
});

test('keeps the feature editor as a popup with an explicit back action', () => {
  assert.match(center, /fixed inset-0/);
  assert.match(center, /ArrowLeft/);
  assert.match(center, /aria-label="Volver a los paneles"/);
});

test('renders future registered functions from input_schema without hardcoded APIs', () => {
  assert.match(center, /body\.features/);
  assert.match(center, /MoonbotSchemaFeatureForm/);
  assert.match(form, /feature\?\.input_schema\?\.parameters/);
  assert.match(form, /parameter\.control === 'boolean'/);
  assert.match(form, /parameter\.control === 'json'/);
  assert.match(form, /parameter\.binding === 'args'/);
});

test('uses only the established feature roles', () => {
  for (const role of ['user', 'group_admin', 'group_creator', 'master']) assert.match(center, new RegExp(`value="${role}"`));
  assert.doesNotMatch(center, /superadmin|owner_role|root_role/);
});
