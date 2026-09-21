import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAccountIncidentState, correlateAccountIncidents, updateAccountIncidentState } from '../src/utils/accountIncidentCenter.js';

const now = new Date('2026-08-11T12:00:00.000Z');

test('correlates signals by account and produces deterministic privacy-safe escalation', () => {
  const incidents = correlateAccountIncidents({ now, anomalies: [
    { type: 'duplicate_telegram', severity: 'critical', account_ids: ['a1'], explanation: 'ID repetido' },
    { type: 'proxy_concentration', severity: 'high', account_ids: ['a1'], explanation: '25 proxies', value: 'secret@example.com' },
  ], approvals: [{ account_id: 'a2', status: 'pending' }] });
  assert.equal(incidents.length, 2);
  assert.equal(incidents[0].account_id, 'a1');
  assert.equal(incidents[0].severity, 'critical');
  assert.equal(incidents[0].correlated_signals, 2);
  assert.equal(incidents[0].escalation.target_role, 'creator');
  assert.equal(JSON.stringify(incidents).includes('secret@example.com'), false);
  assert.deepEqual(incidents, correlateAccountIncidents({ now, anomalies: [
    { type: 'duplicate_telegram', severity: 'critical', account_ids: ['a1'], explanation: 'ID repetido' },
    { type: 'proxy_concentration', severity: 'high', account_ids: ['a1'], explanation: '25 proxies' },
  ], approvals: [{ account_id: 'a2', status: 'pending' }] }));
});

test('acknowledges, snoozes, resolves and reopens allowlisted incidents', () => {
  const [incident] = correlateAccountIncidents({ now, anomalies: [{ type: 'risk', severity: 'high', account_ids: ['a1'], explanation: 'Riesgo' }] });
  let state = updateAccountIncidentState({}, { incident_id: incident.id, action: 'acknowledge' }, 'admin1', now);
  assert.equal(applyAccountIncidentState(incident, state, now).status, 'acknowledged');
  state = updateAccountIncidentState(state, { incident_id: incident.id, action: 'snooze', hours: 4 }, 'admin1', now);
  assert.equal(applyAccountIncidentState(incident, state, now).status, 'snoozed');
  state = updateAccountIncidentState(state, { incident_id: incident.id, action: 'resolve' }, 'admin1', now);
  assert.equal(applyAccountIncidentState(incident, state, now).status, 'resolved');
  state = updateAccountIncidentState(state, { incident_id: incident.id, action: 'reopen' }, 'admin1', now);
  assert.equal(applyAccountIncidentState(incident, state, now).status, 'acknowledged');
});

test('rejects arbitrary incident ids, actions and snooze durations', () => {
  assert.throws(() => updateAccountIncidentState({}, { incident_id: '__proto__', action: 'resolve' }, 'admin', now));
  assert.throws(() => updateAccountIncidentState({}, { incident_id: `aci_${'a'.repeat(20)}`, action: 'delete' }, 'admin', now));
  assert.throws(() => updateAccountIncidentState({}, { incident_id: `aci_${'a'.repeat(20)}`, action: 'snooze', hours: 1000 }, 'admin', now));
});
