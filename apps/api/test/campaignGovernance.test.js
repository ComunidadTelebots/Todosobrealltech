import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGovernanceAction, governanceSummary, normalizeGovernanceAction } from '../src/utils/campaignGovernance.js';

test('normaliza acciones y rechaza campañas o acciones arbitrarias', () => {
  assert.throws(() => normalizeGovernanceAction({ action: 'delete_everything', campaign_id: 'a' }), /no válida/);
  assert.throws(() => normalizeGovernanceAction({ action: 'note', campaign_id: '../etc', text: 'x' }), /Campaña/);
  assert.deepEqual(normalizeGovernanceAction({ action: 'tags', campaign_id: 'ad-1', tags: [' Urgente ', 'urgente', 'Seguridad'] }).tags, ['urgente', 'seguridad']);
});

test('coordina notas, asignación, fechas, etiquetas, checklist, seguimiento e instantáneas', () => {
  const actor = { id: 'admin-1', role: 'admin' };
  let state = {};
  state = applyGovernanceAction(state, { action: 'note', campaign_id: 'ad-1', text: 'Revisar destino' }, actor);
  state = applyGovernanceAction(state, { action: 'assign', campaign_id: 'ad-1', assignee: 'equipo-seguridad' }, actor);
  state = applyGovernanceAction(state, { action: 'due_date', campaign_id: 'ad-1', due_at: '2026-08-10T10:00:00Z' }, actor);
  state = applyGovernanceAction(state, { action: 'tags', campaign_id: 'ad-1', tags: ['urgente'] }, actor);
  state = applyGovernanceAction(state, { action: 'checklist', campaign_id: 'ad-1', item: 'Comprobar enlace', completed: false }, actor);
  state = applyGovernanceAction(state, { action: 'watch', campaign_id: 'ad-1', enabled: true }, actor);
  state = applyGovernanceAction(state, { action: 'snapshot', campaign_id: 'ad-1', summary: 'Estado inicial' }, actor);
  const item = state.campaigns['ad-1'];
  assert.equal(item.notes[0].text, 'Revisar destino');
  assert.equal(item.assignee, 'equipo-seguridad');
  assert.deepEqual(item.tags, ['urgente']);
  assert.deepEqual(item.watchers, ['admin-1']);
  assert.equal(item.snapshots.length, 1);
  assert.deepEqual(governanceSummary(state, Date.parse('2026-08-11T00:00:00Z')), { campaigns: 1, overdue: 1, open_checklist: 1, saved_views: 0 });
});

test('guarda vistas con filtros limitados y sin datos ejecutables', () => {
  const state = applyGovernanceAction({}, { action: 'saved_view', name: ' Pendientes ', filters: { status: 'pending', script: '<script>alert(1)</script>' } }, { id: 'creator' });
  assert.equal(state.saved_views[0].name, 'Pendientes');
  assert.equal(state.saved_views[0].filters.status, 'pending');
  assert.equal(typeof state.saved_views[0].filters.script, 'string');
});

test('bloquea claves de prototipo y tolera colecciones malformadas', () => {
  for (const campaign_id of ['__proto__', 'prototype', 'constructor']) {
    assert.throws(() => normalizeGovernanceAction({ action: 'note', campaign_id, text: 'x' }), /no v.lida/i);
  }
  assert.deepEqual(normalizeGovernanceAction({ action: 'tags', campaign_id: 'ad-1', tags: { map: 'evil' } }).tags, []);
  const state = applyGovernanceAction({ campaigns: [], saved_views: {} }, { action: 'saved_view', name: 'Segura', filters: null }, { id: 'creator' });
  assert.equal(Array.isArray(state.saved_views), true);
  assert.equal(Object.prototype.polluted, undefined);
});

test('acota crecimiento y repara arrays persistidos malformados', () => {
  const repaired = applyGovernanceAction({ campaigns: { 'ad-1': { notes: {}, checklist: {}, snapshots: {}, watchers: {} } } }, { action: 'note', campaign_id: 'ad-1', text: 'segura' }, { id: 'admin' });
  assert.equal(repaired.campaigns['ad-1'].notes.length, 1);
  const campaigns = Object.fromEntries(Array.from({ length: 1000 }, (_, index) => [`ad-${index}`, {}]));
  assert.throws(() => applyGovernanceAction({ campaigns }, { action: 'note', campaign_id: 'overflow', text: 'x' }, { id: 'admin' }), /mite/);
});
