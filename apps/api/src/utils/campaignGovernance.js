import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const STORE = process.env.CAMPAIGN_GOVERNANCE_FILE || '/data/campaign-governance.json';
const ACTIONS = new Set(['note', 'assign', 'due_date', 'tags', 'checklist', 'saved_view', 'snapshot', 'watch']);
const clean = (value, limit = 200) => String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/[<>]/g, '').trim().slice(0, limit);
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const id = (value) => {
  const candidate = String(value || '');
  return /^[A-Za-z0-9_-]{1,80}$/.test(candidate) && !RESERVED_KEYS.has(candidate.toLowerCase()) ? candidate : '';
};
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function normalizeGovernanceAction(input = {}) {
  const action = clean(input.action, 32);
  if (!ACTIONS.has(action)) throw new TypeError('Acción de gobernanza no válida');
  const campaignId = id(input.campaign_id);
  if (!campaignId && !['saved_view'].includes(action)) throw new TypeError('Campaña no válida');
  const payload = { action, campaign_id: campaignId };
  if (action === 'note') payload.text = clean(input.text, 800);
  if (action === 'assign') payload.assignee = clean(input.assignee, 80);
  if (action === 'due_date') payload.due_at = input.due_at && Number.isFinite(Date.parse(input.due_at)) ? new Date(input.due_at).toISOString() : '';
  if (action === 'tags') payload.tags = [...new Set((Array.isArray(input.tags) ? input.tags : []).map((item) => clean(item, 32).toLowerCase()).filter(Boolean))].slice(0, 20);
  if (action === 'checklist') { payload.item = clean(input.item, 120); payload.completed = input.completed === true; }
  if (action === 'saved_view') { payload.name = clean(input.name, 60); payload.filters = Object.fromEntries(Object.entries(record(input.filters)).slice(0, 12).map(([key, value]) => [clean(key, 32), clean(value, 80)]).filter(([key]) => key && !RESERVED_KEYS.has(key.toLowerCase()))); }
  if (action === 'snapshot') payload.summary = clean(input.summary, 240);
  if (action === 'watch') payload.enabled = input.enabled !== false;
  return payload;
}

export function applyGovernanceAction(state = {}, input, actor = {}) {
  const action = normalizeGovernanceAction(input);
  const next = structuredClone(state || {});
  next.campaigns = record(next.campaigns); next.saved_views = Array.isArray(next.saved_views) ? next.saved_views : [];
  if (action.action === 'saved_view') {
    next.saved_views.unshift({ id: crypto.randomUUID(), name: action.name || 'Vista', filters: action.filters, owner_id: clean(actor.id, 80), created_at: new Date().toISOString() });
    next.saved_views = next.saved_views.slice(0, 50);
    return next;
  }
  if (!Object.hasOwn(next.campaigns, action.campaign_id) && Object.keys(next.campaigns).length >= 1000) throw new RangeError('Límite de campañas coordinadas alcanzado');
  const current = next.campaigns[action.campaign_id] ||= { notes: [], checklist: [], snapshots: [], tags: [], assignee: '', due_at: '', watchers: [] };
  current.notes = Array.isArray(current.notes) ? current.notes : [];
  current.checklist = Array.isArray(current.checklist) ? current.checklist : [];
  current.snapshots = Array.isArray(current.snapshots) ? current.snapshots : [];
  current.watchers = Array.isArray(current.watchers) ? current.watchers : [];
  if (action.action === 'note' && action.text) { current.notes.unshift({ id: crypto.randomUUID(), text: action.text, actor_id: clean(actor.id, 80), created_at: new Date().toISOString() }); current.notes = current.notes.slice(0, 100); }
  if (action.action === 'assign') current.assignee = action.assignee;
  if (action.action === 'due_date') current.due_at = action.due_at;
  if (action.action === 'tags') current.tags = action.tags;
  if (action.action === 'checklist' && action.item) {
    const found = current.checklist.find((item) => item.text === action.item);
    if (found) found.completed = action.completed; else current.checklist.push({ id: crypto.randomUUID(), text: action.item, completed: action.completed });
    current.checklist = current.checklist.slice(0, 50);
  }
  if (action.action === 'snapshot') { current.snapshots.unshift({ id: crypto.randomUUID(), summary: action.summary, actor_id: clean(actor.id, 80), created_at: new Date().toISOString() }); current.snapshots = current.snapshots.slice(0, 30); }
  if (action.action === 'watch') { const actorId = clean(actor.id, 80); current.watchers = action.enabled ? [...new Set([...current.watchers, actorId])].slice(0, 100) : current.watchers.filter((item) => item !== actorId); }
  current.updated_at = new Date().toISOString();
  return next;
}

export async function readCampaignGovernance() {
  try { const value = JSON.parse(await fs.readFile(STORE, 'utf8')); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}

export async function writeCampaignGovernance(value) {
  const temporary = `${STORE}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(temporary, STORE);
}

export function governanceSummary(state = {}, now = Date.now()) {
  const campaigns = Object.entries(state.campaigns || {});
  return { campaigns: campaigns.length, overdue: campaigns.filter(([, item]) => item.due_at && Date.parse(item.due_at) < now).length, open_checklist: campaigns.reduce((sum, [, item]) => sum + (item.checklist || []).filter((entry) => !entry.completed).length, 0), saved_views: (state.saved_views || []).length };
}

export const campaignGovernanceActions = ACTIONS;
