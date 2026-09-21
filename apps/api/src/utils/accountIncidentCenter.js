import crypto from 'node:crypto';

const severityRank = Object.freeze({ medium: 1, high: 2, critical: 3 });
const slaMinutes = Object.freeze({ medium: 1440, high: 240, critical: 30 });

const stableId = (accountId, causes) => `aci_${crypto.createHash('sha256')
  .update(`${accountId}|${causes.map((item) => item.type).sort().join('|')}`)
  .digest('hex').slice(0, 20)}`;

export const correlateAccountIncidents = ({ anomalies = [], approvals = [], now = new Date() } = {}) => {
  const grouped = new Map();
  for (const anomaly of Array.isArray(anomalies) ? anomalies : []) {
    for (const accountId of Array.isArray(anomaly.account_ids) ? anomaly.account_ids : []) {
      const key = String(accountId || '').trim();
      if (!key) continue;
      const current = grouped.get(key) || [];
      current.push({ type: String(anomaly.type || 'unknown'), severity: severityRank[anomaly.severity] ? anomaly.severity : 'medium', explanation: String(anomaly.explanation || '').slice(0, 300) });
      grouped.set(key, current);
    }
  }
  for (const approval of Array.isArray(approvals) ? approvals : []) {
    if (approval?.status !== 'pending' || !approval.account_id) continue;
    const key = String(approval.account_id);
    const current = grouped.get(key) || [];
    current.push({ type: 'pending_role_approval', severity: 'medium', explanation: 'Existe una elevación de rol pendiente de decisión.' });
    grouped.set(key, current);
  }
  return [...grouped.entries()].map(([accountId, causes]) => {
    const severity = causes.reduce((best, item) => severityRank[item.severity] > severityRank[best] ? item.severity : best, 'medium');
    const deadline = new Date(now.getTime() + slaMinutes[severity] * 60_000).toISOString();
    return {
      id: stableId(accountId, causes), account_id: accountId, severity, causes,
      correlated_signals: causes.length,
      escalation: { target_role: severity === 'critical' ? 'creator' : 'admin', sla_minutes: slaMinutes[severity], deadline },
    };
  }).sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.correlated_signals - a.correlated_signals || a.id.localeCompare(b.id));
};

export const applyAccountIncidentState = (incident, state, now = new Date()) => {
  if (!incident) return null;
  const saved = state?.[incident.id] || {};
  const snoozed = saved.snoozed_until && Date.parse(saved.snoozed_until) > now.getTime();
  return { ...incident, status: saved.resolved_at ? 'resolved' : snoozed ? 'snoozed' : saved.acknowledged_at ? 'acknowledged' : 'open',
    acknowledged_at: saved.acknowledged_at || null, snoozed_until: snoozed ? saved.snoozed_until : null,
    resolved_at: saved.resolved_at || null, actor_id: saved.actor_id || null };
};

export const updateAccountIncidentState = (state, input, actorId, now = new Date()) => {
  const incidentId = String(input?.incident_id || '');
  if (!/^aci_[a-f0-9]{20}$/.test(incidentId)) throw new Error('Incidencia no válida');
  const action = String(input?.action || '');
  if (!['acknowledge', 'snooze', 'resolve', 'reopen'].includes(action)) throw new Error('Acción no válida');
  const next = { ...(state || {}) }; const current = { ...(next[incidentId] || {}), actor_id: String(actorId), updated_at: now.toISOString() };
  if (action === 'acknowledge') current.acknowledged_at = now.toISOString();
  if (action === 'snooze') { const hours = Number(input?.hours); if (![1, 4, 24].includes(hours)) throw new Error('Duración no válida'); current.snoozed_until = new Date(now.getTime() + hours * 3600000).toISOString(); }
  if (action === 'resolve') current.resolved_at = now.toISOString();
  if (action === 'reopen') { delete current.resolved_at; delete current.snoozed_until; }
  next[incidentId] = current;
  return next;
};
