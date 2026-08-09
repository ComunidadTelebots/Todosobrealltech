import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const AUDIT_FILE = process.env.HOUSE_ADS_AUDIT_FILE || '/data/house-ad-audit.json';
const ACTIONS = new Set(['upsert', 'approve', 'reject', 'toggle', 'clone', 'delete', 'reset_metrics', 'verify_telegram']);
const safe = (value, max = 80) => String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, max);

export async function readHouseAdsAudit(limit = 200) {
  try {
    const records = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8'));
    return Array.isArray(records) ? records.slice(0, Math.min(1000, Math.max(1, Number(limit) || 200))) : [];
  } catch { return []; }
}

export async function appendHouseAdsAudit({ action, actor, adId, before, after }) {
  if (!ACTIONS.has(action)) return false;
  const records = await readHouseAdsAudit(5000);
  const summarize = (ad) => ad ? {
    title: safe(ad.title), enabled: ad.enabled !== false, approval_status: safe(ad.approval_status, 24),
    placements: Array.isArray(ad.placements) ? ad.placements.slice(0, 12).map((item) => safe(item, 32)) : [],
    allowed_sites: Array.isArray(ad.allowed_sites) ? ad.allowed_sites.slice(0, 12).map((item) => safe(item, 32)) : [],
    target_channels: Array.isArray(ad.target_channel_ids) ? ad.target_channel_ids.length : 0,
    target_groups: Array.isArray(ad.target_group_ids) ? ad.target_group_ids.length : 0,
  } : null;
  records.unshift({ id: crypto.randomUUID(), action, ad_id: safe(adId), actor_id: safe(actor?.id, 64), actor_role: safe(actor?.role, 24), before: summarize(before), after: summarize(after), created_at: new Date().toISOString() });
  await fs.writeFile(AUDIT_FILE, JSON.stringify(records.slice(0, 5000)), { mode: 0o600 });
  return true;
}

export const houseAdsAuditConstants = { ACTIONS };
