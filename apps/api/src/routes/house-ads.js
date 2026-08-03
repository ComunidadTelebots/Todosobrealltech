import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { authorizeAdminOrCreator } from './stats.js';
import { OFFICIAL_ADS, officialAdsFor } from '../utils/houseAdsCatalog.js';
import { recordContentEvent, requestCountry } from '../utils/contentAnalytics.js';
import { houseAdMatches, normalizeHouseAd, siteFromRequest } from '../utils/houseAdsPolicy.js';

const router = Router();
const MOON_URLS = [...new Set([
  process.env.MOONBOT_INTERNAL_URL,
  'http://moonbot:5000',
].filter(Boolean).map((value) => value.replace(/\/$/, '')))];
const headers = () => ({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-Moon-Admin-Key': String(process.env.MOON_ADMIN_API_KEY || '').trim() });
const isScheduledNow = (ad, now = Date.now()) => (!ad.starts_at || Date.parse(ad.starts_at) <= now) && (!ad.ends_at || Date.parse(ad.ends_at) >= now);
const isTelegramChannelAd = (ad) => /^https:\/\/(?:www\.)?t\.me\/[A-Za-z0-9_]{5,64}\/?$/i.test(String(ad?.url || ''));
const mediaDir = '/data/house-ad-media';
const reportsFile = '/data/house-ad-reports.json';
const imageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const safeAdDestination = (value) => {
  const fallback = 'https://todosobreall.tech';
  try {
    const raw = String(value || '').trim();
    if (raw.startsWith('tg://')) {
      const telegram = new URL(raw);
      if (!['resolve', 'join'].includes(telegram.hostname)) return fallback;
      const domain = telegram.searchParams.get('domain');
      const invite = telegram.searchParams.get('invite');
      if (domain && /^[A-Za-z0-9_]{5,32}$/.test(domain)) return `https://t.me/${domain}`;
      if (invite && /^[A-Za-z0-9_-]{8,128}$/.test(invite)) return `https://t.me/+${invite}`;
      return fallback;
    }
    const destination = new URL(raw);
    return destination.protocol === 'https:' ? destination.toString() : fallback;
  } catch {
    return fallback;
  }
};
const ROTATION_MS = 10 * 60 * 1000;
const rotatedOfficialAdsFor = (placement = '', now = Date.now()) => {
  const ads = officialAdsFor(placement);
  if (ads.length < 2) return ads;
  const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const index = (Math.floor(now / ROTATION_MS) + offset) % ads.length;
  return [...ads.slice(index), ...ads.slice(0, index)];
};

async function moon(options = {}) {
  let lastError;
  for (const baseUrl of MOON_URLS) {
    try {
      return await fetch(`${baseUrl}/api/internal/house-ads`, { ...options, headers: { ...headers(), ...(options.headers || {}) }, signal: AbortSignal.timeout(6000) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Moonbot no disponible');
}

router.get('/', async (req, res) => {
  const placement = String(req.query.placement || '');
  const site = siteFromRequest(req, placement);
  const channelOnly = req.query.channel_only === '1';
  const country = requestCountry(req);
  const fallbackAds = () => rotatedOfficialAdsFor(placement).filter((ad) => !channelOnly || isTelegramChannelAd(ad)).slice(0, 1);
  try {
    const response = await moon();
    const rawBody = await response.text();
    let data;
    try { data = JSON.parse(rawBody); }
    catch { return res.json({ ok: true, ads: fallbackAds(), fallback: true, upstream_status: response.status }); }
    if (!response.ok) return res.json({ ok: true, ads: fallbackAds(), fallback: true, upstream_status: response.status });
    let ads = (data.ads || []).filter((ad) => ad.enabled !== false && ad.approval_status === 'approved' && isScheduledNow(ad) && houseAdMatches(ad, { placement, site }));
    if (channelOnly) ads = ads.filter(isTelegramChannelAd);
    if (!ads.length) ads = officialAdsFor(placement).filter((ad) => !channelOnly || isTelegramChannelAd(ad));
    if (placement && ads.length) {
      const highestPriority = Math.max(...ads.map((ad) => Number(ad.priority || 0)));
      const candidates = ads.filter((ad) => Number(ad.priority || 0) === highestPriority)
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
      const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
      ads = [candidates[(Math.floor(Date.now() / ROTATION_MS) + offset) % candidates.length]];
      if (placement !== 'telegram_channel') {
        moon({ method: 'POST', body: JSON.stringify({ action: 'impression', id: ads[0].id, placement, site, country }) }).catch(() => {});
        recordContentEvent({ kind: 'community_ad', targetId: ads[0].id, eventType: 'impression', country, placement });
      }
    }
    return res.json({ ok: true, ads: ads.map(normalizeHouseAd), delivery: { placement, site } });
  } catch {
    const ads = fallbackAds();
    return res.json({ ok: true, ads, fallback: true });
  }
});

router.post('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const payload = { ...(req.body || {}) };
  if (['approve', 'reject'].includes(payload.action) && auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creador puede revisar campañas' });
  if ((!payload.action || payload.action === 'upsert') && payload.ad) payload.ad = { ...normalizeHouseAd(payload.ad), approval_status: 'pending', submitted_by: auth.user.id };
  try {
    const response = await moon({ method: 'POST', body: JSON.stringify(payload) });
    const rawBody = await response.text();
    try { return res.status(response.status).json(JSON.parse(rawBody)); }
    catch { return res.status(502).json({ ok: false, error: 'Moonbot devolvió una respuesta no válida', upstream_status: response.status }); }
  }
  catch { return res.status(502).json({ ok: false, error: 'Moonbot no responde' }); }
});

async function readReports() {
  try { return JSON.parse(await fs.readFile(reportsFile, 'utf8')); } catch { return []; }
}

router.get('/reports', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  return res.json({ ok: true, reports: await readReports() });
});

router.post('/:id/report', async (req, res) => {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(req.params.id))) return res.status(400).json({ ok: false, error: 'Anuncio no válido' });
  const reason = String(req.body?.reason || '').trim().slice(0, 240);
  if (!['irrelevant', 'misleading', 'offensive', 'unsafe', 'other'].includes(reason)) return res.status(400).json({ ok: false, error: 'Motivo no válido' });
  const reports = await readReports();
  const fingerprint = crypto.createHash('sha256').update(`${req.ip}|${req.get('user-agent') || ''}`).digest('hex').slice(0, 20);
  const duplicate = reports.some((item) => item.ad_id === req.params.id && item.fingerprint === fingerprint && Date.now() - Date.parse(item.created_at) < 86_400_000);
  if (!duplicate) {
    reports.unshift({ id: crypto.randomUUID(), ad_id: String(req.params.id), reason, placement: String(req.body?.placement || '').slice(0, 40), site: String(req.body?.site || '').slice(0, 40), fingerprint, status: 'open', created_at: new Date().toISOString() });
    await fs.writeFile(reportsFile, JSON.stringify(reports.slice(0, 5000)), { mode: 0o600 });
  }
  return res.json({ ok: true, accepted: !duplicate });
});

router.post('/reports/:reportId/resolve', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const reports = await readReports();
  const report = reports.find((item) => item.id === req.params.reportId);
  if (!report) return res.status(404).json({ ok: false, error: 'Reporte no encontrado' });
  report.status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
  report.resolved_at = new Date().toISOString();
  report.resolved_by = auth.user.id;
  await fs.writeFile(reportsFile, JSON.stringify(reports), { mode: 0o600 });
  return res.json({ ok: true, report });
});

router.post('/media', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const match = String(req.body?.data || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !imageTypes[match[1]]) return res.status(400).json({ ok: false, error: 'Imagen no válida. Usa JPG, PNG, WebP o GIF.' });
  const content = Buffer.from(match[2], 'base64');
  if (!content.length || content.length > 4 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'La imagen debe pesar menos de 4 MB.' });
  const signatures = { jpg: content[0] === 0xff && content[1] === 0xd8, png: content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), gif: content.subarray(0, 3).toString() === 'GIF', webp: content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP' };
  const extension = imageTypes[match[1]];
  if (!signatures[extension]) return res.status(400).json({ ok: false, error: 'El contenido no coincide con el formato de la imagen.' });
  await fs.mkdir(mediaDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(mediaDir, filename), content, { mode: 0o644 });
  const publicApi = String(process.env.PUBLIC_API_URL || 'https://api.todosobreall.tech').replace(/\/$/, '');
  return res.json({ ok: true, url: `${publicApi}/house-ads/media/${filename}` });
});

router.get('/media/:filename', async (req, res) => {
  const filename = String(req.params.filename || '');
  if (!/^[a-f0-9-]+\.(?:jpg|png|webp|gif)$/.test(filename)) return res.status(404).end();
  return res.sendFile(path.join(mediaDir, filename), { headers: { 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' } }, (error) => { if (error && !res.headersSent) res.status(404).end(); });
});

router.get('/:id/click', async (req, res) => {
  const officialAd = OFFICIAL_ADS.find((item) => item.id === String(req.params.id));
  const placement = String(req.query.placement || 'unknown').slice(0, 20);
  const site = siteFromRequest(req, placement);
  const country = requestCountry(req);
  if (officialAd) {
    moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: officialAd.id, placement, site, country }) }).catch(() => {});
    recordContentEvent({ kind: 'community_ad', targetId: officialAd.id, eventType: 'click', country, placement });
    return res.redirect(302, officialAd.url);
  }
  try {
    const current = await moon();
    const rawBody = await current.text();
    let data;
    try { data = JSON.parse(rawBody); } catch { return res.redirect(302, 'https://todosobreall.tech'); }
    const ad = (data.ads || []).find((item) => String(item.id) === String(req.params.id));
    if (!ad || !ad.enabled || ad.approval_status !== 'approved' || !isScheduledNow(ad)) return res.redirect(302, 'https://todosobreall.tech');
    const requestedItem = String(req.query.chat || '').slice(0, 64);
    const communityItem = Array.isArray(ad.community_items)
      ? ad.community_items.find((item) => String(item.id) === requestedItem)
      : null;
    const destination = String(communityItem?.url || ad.url || 'https://todosobreall.tech');
    await moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: ad.id, placement, site, country, item_id: communityItem?.id || '' }) });
    recordContentEvent({ kind: 'community_ad', targetId: ad.id, eventType: 'click', country, placement });
    return res.redirect(302, safeAdDestination(destination));
  } catch { return res.redirect(302, 'https://todosobreall.tech'); }
});

export default router;
