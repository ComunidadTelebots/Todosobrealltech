import crypto from 'node:crypto';

const events = new Map();
const WINDOW_MS = 60_000;
const MAX_CLICKS = 8;
const EPHEMERAL_SALT = crypto.randomBytes(32);

export function adRequestFingerprint(req, adId = '') {
  const salt = process.env.HOUSE_AD_FRAUD_SALT || process.env.JWT_SECRET || EPHEMERAL_SALT;
  const source = `${req.ip || ''}|${String(req.get?.('user-agent') || '').slice(0, 300)}|${String(adId)}`;
  return crypto.createHmac('sha256', salt).update(source).digest('hex').slice(0, 32);
}

export function acceptAdClick(fingerprint, now = Date.now()) {
  const recent = (events.get(fingerprint) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  const accepted = recent.length < MAX_CLICKS;
  if (accepted) recent.push(now);
  events.set(fingerprint, recent);
  if (events.size > 10_000) {
    for (const [key, timestamps] of events) if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) events.delete(key);
  }
  return { accepted, retry_after_seconds: accepted ? 0 : Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)) };
}

export function resetAdFraudState() { events.clear(); }
