import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { authorizeAdminOrCreator, authorizeAuthenticatedUser } from './stats.js';
import { OFFICIAL_ADS, officialAdsFor } from '../utils/houseAdsCatalog.js';
import { recordContentEvent, requestCountry } from '../utils/contentAnalytics.js';
import { disclosureFor, houseAdMatches, normalizeHouseAd, normalizeHouseAdDestination, normalizeTelegramBoostUrl, normalizeTelegramTargetIds, selectAdVariant, siteFromRequest } from '../utils/houseAdsPolicy.js';
import { insideAdsDestinationFor, insideAdsPresetByUrl, insideAdsPresetsFor, mayManageInsideAdsCampaign, mayReadInsideAdsPresets } from '../utils/insideAdsPresets.js';
import { acceptAdClick, adRequestFingerprint } from '../utils/houseAdsAntiFraud.js';
import { appendHouseAdsAudit, readHouseAdsAudit } from '../utils/houseAdsAudit.js';
import { applyGovernanceAction, governanceSummary, readCampaignGovernance, writeCampaignGovernance } from '../utils/campaignGovernance.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

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
const CATALOG_FRESH_MS = 60_000;
const CATALOG_STALE_MS = 10 * 60_000;
const catalogCache = { data: null, fetchedAt: 0, refresh: null };
const deliveryFrequency = new Map();
const affiliateApplicationRate = new Map();
const viewerCookie = 'tsa_ad_viewer';
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
const requestLanguage = (req) => {
  const explicit = String(req.query.language || '').trim().toLowerCase().replace('_', '-');
  if (/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(explicit)) return explicit;
  return String(req.get('accept-language') || '').split(',')[0].split(';')[0].trim().toLowerCase().replace('_', '-').slice(0, 8);
};
const requestViewer = (req, res, chatId = '') => {
  const explicit = String(req.query.viewer_id || '').trim();
  if (explicit && validInternalRequest(req) && /^[A-Za-z0-9:_-]{5,80}$/.test(explicit)) {
    return `internal:${crypto.createHash('sha256').update(explicit).digest('hex').slice(0, 32)}`;
  }
  // Una entrega editorial a un canal/grupo no equivale a una impresión de un
  // usuario. El límite se aplica cuando Hub/MiniApp envían viewer_id.
  if (chatId) return '';
  const fromCookie = String(req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${viewerCookie}=`))?.slice(viewerCookie.length + 1);
  if (/^[a-f0-9]{32}$/.test(String(fromCookie || ''))) return `web:${fromCookie}`;
  const id = crypto.randomBytes(16).toString('hex');
  res.append('Set-Cookie', `${viewerCookie}=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`);
  return `web:${id}`;
};
const belowFrequencyCap = (ad, viewer, now = Date.now()) => {
  const cap = Number(ad.frequency_cap || 0);
  if (!cap || !ad.id || !viewer) return true;
  const windowMs = Number(ad.frequency_window_hours || 24) * 3_600_000;
  const key = `${ad.id}:${viewer}`;
  const recent = (deliveryFrequency.get(key) || []).filter((stamp) => now - stamp < windowMs);
  deliveryFrequency.set(key, recent);
  return recent.length < cap;
};
const recordFrequency = (ad, viewer, now = Date.now()) => {
  if (!Number(ad.frequency_cap || 0) || !ad.id || !viewer) return;
  const key = `${ad.id}:${viewer}`;
  deliveryFrequency.set(key, [...(deliveryFrequency.get(key) || []), now].slice(-100));
  if (deliveryFrequency.size > 50_000) {
    const oldest = deliveryFrequency.keys().next().value;
    deliveryFrequency.delete(oldest);
  }
};
const rotatedOfficialAdsFor = (placement = '', now = Date.now()) => {
  const ads = officialAdsFor(placement);
  if (ads.length < 2) return ads;
  const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const index = (Math.floor(now / ROTATION_MS) + offset) % ads.length;
  return [...ads.slice(index), ...ads.slice(0, index)];
};

async function moon(options = {}) {
  const { timeoutMs = 6000, ...fetchOptions } = options;
  let lastError;
  for (const baseUrl of MOON_URLS) {
    try {
      return await fetch(`${baseUrl}/api/internal/house-ads`, { ...fetchOptions, headers: { ...headers(), ...(fetchOptions.headers || {}) }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Moonbot no disponible');
}

async function moonEndpoint(endpoint, options = {}) {
  const { timeoutMs = 6000, ...fetchOptions } = options;
  let lastError;
  for (const baseUrl of MOON_URLS) {
    try {
      return await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, headers: { ...headers(), ...(fetchOptions.headers || {}) }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Moonbot no disponible');
}

const validInternalRequest = (req) => {
  const expected = Buffer.from(String(process.env.MOON_ADMIN_API_KEY || '').trim());
  const supplied = Buffer.from(String(req.get('X-Moon-Admin-Key') || '').trim());
  return expected.length >= 32 && supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
};

router.post('/apply', async (req, res) => {
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: 'Debes registrarte o iniciar sesión para solicitar una afiliación' });
  const fingerprint = crypto.createHash('sha256').update(`${req.ip}|${req.get('user-agent') || ''}`).digest('hex').slice(0, 32);
  const now = Date.now();
  const recent = (affiliateApplicationRate.get(fingerprint) || []).filter((stamp) => now - stamp < 86_400_000);
  if (recent.length >= 3) return res.status(429).json({ ok: false, error: 'Has alcanzado el límite de solicitudes de hoy' });
  if (String(req.body?.company_website || '').trim()) return res.status(202).json({ ok: true });
  const title = String(req.body?.title || '').trim().replace(/[<>]/g, '').slice(0, 80);
  const description = String(req.body?.description || '').trim().replace(/[<>]/g, '').slice(0, 240);
  const contact = String(req.body?.contact || '').trim().slice(0, 120);
  const destination = normalizeHouseAdDestination(req.body?.url);
  const kind = ['telegram', 'website', 'social', 'project'].includes(req.body?.kind) ? req.body.kind : 'project';
  if (title.length < 3 || description.length < 10 || !destination) return res.status(400).json({ ok: false, error: 'Completa el nombre, la descripción y un enlace HTTPS válido' });
  if (!/^@?[A-Za-z0-9_.+-]{3,64}$/.test(contact) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return res.status(400).json({ ok: false, error: 'Indica un correo o usuario de Telegram válido' });
  if (req.body?.accepted_terms !== true) return res.status(400).json({ ok: false, error: 'Debes aceptar las condiciones de colaboración' });
  const reference = `NW3-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const campaignId = `affiliate-${crypto.randomUUID()}`;
  try {
    await pocketbaseClient.collection('nw3_affiliate_applications').create({ user: auth.user.id, reference, campaign_id: campaignId, title, description, url: destination, contact, kind, status: 'pending', requested_placements: Array.isArray(req.body?.placements) ? req.body.placements.filter((item) => ['top', 'left', 'right', 'inline', 'footer'].includes(item)).slice(0, 5) : [] });
  } catch (error) {
    return res.status(503).json({ ok: false, error: 'No se pudo registrar la solicitud' });
  }
  affiliateApplicationRate.set(fingerprint, [...recent, now]);
  try {
    await moon({ method: 'POST', body: JSON.stringify({ action: 'upsert', ad: normalizeHouseAd({ id: campaignId, title, description, url: destination, cta: 'Visitar', enabled: false, approval_status: 'pending', relationship_type: 'affiliate', disclosure_type: 'affiliate', placement: 'all', placements: Array.isArray(req.body?.placements) ? req.body.placements : ['all'], priority: 10, submitted_by: auth.user.id }) }) });
  } catch { /* La solicitud persiste aunque Moonbot esté reiniciándose. */ }
  return res.status(201).json({ ok: true, reference, status: 'pending', message: 'Solicitud enviada para revisión' });
});

router.get('/apply/:reference', async (req, res) => {
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: 'Debes iniciar sesión para consultar la solicitud' });
  const reference = String(req.params.reference || '').trim().toUpperCase();
  if (!/^NW3-[A-F0-9]{12}$/.test(reference)) return res.status(400).json({ ok: false, error: 'Referencia no válida' });
  try {
    const record = await pocketbaseClient.collection('nw3_affiliate_applications').getFirstListItem(`reference="${reference}"`, { fields: 'reference,status,updated,user' });
    if (String(record.user) !== String(auth.user.id) && !['admin', 'creator'].includes(auth.user.role)) return res.status(403).json({ ok: false, error: 'No puedes consultar esta solicitud' });
    return res.json({ ok: true, application: record });
  } catch { return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' }); }
});

async function ownerReferralEligible(user) {
  const telegramId = String(user?.telegram_id || '').trim();
  if (!/^\d{5,20}$/.test(telegramId)) return false;
  try {
    const response = await moonEndpoint(`/api/internal/get_user_channels?telegram_id=${encodeURIComponent(telegramId)}`, { timeoutMs: 3000 });
    if (!response.ok) return false;
    const payload = await response.json();
    const channels = Array.isArray(payload.channels) ? payload.channels : Array.isArray(payload.items) ? payload.items : [];
    return channels.some((channel) => String(channel.status || channel.role || channel.member_status || '').toLowerCase() === 'creator');
  } catch { return false; }
}

async function ownerDeliveryEligible(req, placement = '') {
  // Una publicación de canal no representa a una persona concreta.
  if (placement === 'telegram_channel') return false;
  if (validInternalRequest(req)) return true;
  if (!req.headers.authorization) return false;
  const auth = await authorizeAuthenticatedUser(req);
  return !auth.error && ownerReferralEligible(auth.user);
}

async function refreshCatalog() {
  if (catalogCache.refresh) return catalogCache.refresh;
  catalogCache.refresh = (async () => {
    const response = await moon({ timeoutMs: 2000 });
    const rawBody = await response.text();
    let data;
    try { data = JSON.parse(rawBody); }
    catch { throw new Error(`Moonbot devolvió contenido no JSON (${response.status})`); }
    if (!response.ok || !Array.isArray(data.ads)) throw new Error(data.error || `Moonbot HTTP ${response.status}`);
    catalogCache.data = data;
    catalogCache.fetchedAt = Date.now();
    return data;
  })().finally(() => { catalogCache.refresh = null; });
  return catalogCache.refresh;
}

async function cachedCatalog() {
  const age = Date.now() - catalogCache.fetchedAt;
  if (catalogCache.data && age <= CATALOG_FRESH_MS) return catalogCache.data;
  if (catalogCache.data && age <= CATALOG_STALE_MS) {
    refreshCatalog().catch(() => {});
    return catalogCache.data;
  }
  return refreshCatalog();
}

const invalidateCatalog = () => {
  catalogCache.fetchedAt = 0;
};
export const publicAdView = (ad = {}) => {
  const { url, web_url, telegram_url, boost_url, code, inside_ads_scope, inside_ads_preset, submitted_by, ...safe } = ad;
  return { ...safe, has_boost: Boolean(boost_url), click_url: `/house-ads/${encodeURIComponent(String(ad.id || ''))}/click` };
};

// Calienta el catálogo sin retrasar el arranque de la API.
setTimeout(() => refreshCatalog().catch(() => {}), 0).unref?.();

router.get('/', async (req, res) => {
  const placement = String(req.query.placement || '');
  const site = siteFromRequest(req, placement);
  const chatId = String(req.query.chat_id || '').trim();
  const chatType = ['channel', 'group'].includes(String(req.query.chat_type)) ? String(req.query.chat_type) : '';
  const botId = /^\d{5,24}$/.test(String(req.query.bot_id || '')) ? String(req.query.bot_id) : '';
  const contentCategory = String(req.query.content_category || '').trim().slice(0, 48);
  const contentText = String(req.query.content_text || '').trim().slice(0, 2000);
  const channelOnly = req.query.channel_only === '1';
  const country = requestCountry(req);
  const language = requestLanguage(req);
  const viewer = requestViewer(req, res, chatId);
  const ownerEligible = await ownerDeliveryEligible(req, placement);
  const viewerAuth = req.headers.authorization ? await authorizeAuthenticatedUser(req) : { error: 'anonymous' };
  const canInspectDestinations = validInternalRequest(req) || (!viewerAuth.error && ['creator', 'admin'].includes(viewerAuth.user?.role));
  const fallbackAds = () => rotatedOfficialAdsFor(placement).filter((ad) => !channelOnly || isTelegramChannelAd(ad)).slice(0, 1);
  try {
    const data = await cachedCatalog();
    let ads = (data.ads || []).filter((ad) => ad.enabled !== false && ad.approval_status === 'approved'
      && (ad.audience !== 'channel_owner' || ownerEligible) && isScheduledNow(ad)
      && houseAdMatches(ad, { placement, site, chatId, chatType, country, language, contentCategory, contentText }) && belowFrequencyCap(ad, viewer));
    if (channelOnly) ads = ads.filter(isTelegramChannelAd);
    if (!ads.length) ads = officialAdsFor(placement).filter((ad) => !channelOnly || isTelegramChannelAd(ad));
    if (placement && ads.length) {
      const highestPriority = Math.max(...ads.map((ad) => Number(ad.priority || 0)));
      const candidates = ads.filter((ad) => Number(ad.priority || 0) === highestPriority)
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
      const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
      ads = [candidates[(Math.floor(Date.now() / ROTATION_MS) + offset) % candidates.length]];
      recordFrequency(ads[0], viewer);
      if (placement !== 'telegram_channel') {
        moon({ method: 'POST', body: JSON.stringify({ action: 'impression', id: ads[0].id, placement, site, country, chat_id: chatId, bot_id: botId }) }).catch(() => {});
        recordContentEvent({ kind: 'community_ad', targetId: ads[0].id, eventType: 'impression', country, placement });
      }
    }
    const fingerprint = adRequestFingerprint(req, ads[0]?.id || 'catalog');
    return res.json({ ok: true, ads: ads.map((ad) => { const selected = selectAdVariant(ad, fingerprint); const delivered = { ...selected, disclosure: disclosureFor(selected) }; return canInspectDestinations ? delivered : publicAdView(delivered); }), delivery: { placement, site, chat_id: chatId, chat_type: chatType, bot_id: botId, country, language, content_category: contentCategory } });
  } catch {
    const ads = fallbackAds();
    return res.json({ ok: true, ads, fallback: true });
  }
});

router.get('/inside-ads-presets', async (req, res) => {
  const internal = validInternalRequest(req);
  const auth = req.headers.authorization ? await authorizeAuthenticatedUser(req) : { error: 'anonymous' };
  const authenticated = !auth.error;
  if (!mayReadInsideAdsPresets({ internal, role: authenticated ? auth.user?.role : '' })) return res.status(403).json({ ok: false, error: 'Solo el creator puede consultar referidos Inside Ads' });
  const ownerEligible = internal || await ownerReferralEligible(auth.user);
  return res.json({ ok: true, authenticated, owner_eligible: ownerEligible, presets: insideAdsPresetsFor({ ownerEligible }) });
});

router.post('/destinations/check', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const ids = [...new Set([
    ...normalizeTelegramTargetIds(req.body?.channel_ids, 100),
    ...normalizeTelegramTargetIds(req.body?.group_ids, 100),
  ])].slice(0, 100);
  const results = await Promise.all(ids.map(async (id) => {
    try {
      const response = await moonEndpoint(`/api/internal/groups/${encodeURIComponent(id)}`, { timeoutMs: 3000 });
      const body = await response.json().catch(() => ({}));
      return { id, reachable: response.ok, bot_present: response.ok && body.bot_present !== false, name: String(body.name || body.title || '').slice(0, 120), reason: response.ok ? '' : `HTTP ${response.status}` };
    } catch { return { id, reachable: false, bot_present: false, name: '', reason: 'Moonbot no disponible' }; }
  }));
  return res.json({ ok: true, results, checked_at: new Date().toISOString() });
});

router.post('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const payload = { ...(req.body || {}) };
  const action = String(payload.action || 'upsert');
  const candidateId = String(payload.ad?.id || payload.id || '').trim();
  let existingAd = null;
  if (candidateId) {
    try {
      const current = await moon({ timeoutMs: 3000 });
      const currentData = JSON.parse(await current.text());
      existingAd = (currentData.ads || []).find((item) => String(item.id) === candidateId) || null;
    } catch {
      // Mutaciones por ID fallan cerradas si no puede comprobarse el registro existente.
      return res.status(502).json({ ok: false, error: 'No se pudo verificar la campaña antes de modificarla' });
    }
  }
  if (!mayManageInsideAdsCampaign({ role: auth.user.role, submitted: payload.ad, existing: existingAd })) {
    return res.status(403).json({ ok: false, error: 'Solo el creator puede gestionar campañas Inside Ads' });
  }
  if (['approve', 'reject', 'verify_telegram'].includes(payload.action) && auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creador puede revisar o verificar campañas' });
  if (action === 'upsert' && payload.ad) {
    const submitted = auth.user.role === 'creator' ? payload.ad : { ...payload.ad, relationship_type: 'affiliate', telegram_verified: false, community_verified: false };
    const destination = normalizeHouseAdDestination(submitted.url);
    if (!destination) return res.status(400).json({ ok: false, error: 'El destino debe ser un enlace HTTPS válido; se admiten Telegram, Inside Ads y otros proveedores HTTPS' });
    const insideAdsPreset = insideAdsPresetByUrl(String(submitted.url || submitted.web_url || submitted.telegram_url || '').trim());
    if ((submitted.audience === 'channel_owner' || insideAdsPreset?.audience === 'channel_owner') && !await ownerReferralEligible(auth.user)) {
      return res.status(403).json({ ok: false, error: 'El referido de propietario requiere identidad Telegram verificada y al menos un canal administrado confirmado por Moonbot' });
    }
    if (String(submitted.boost_url || '').trim() && !normalizeTelegramBoostUrl(submitted.boost_url)) return res.status(400).json({ ok: false, error: 'El enlace boost debe ser oficial de Telegram: https://t.me/boost/usuario o https://t.me/boost?c=ID' });
    if ((submitted.community_items || []).some((item) => String(item?.boost_url || '').trim() && !normalizeTelegramBoostUrl(item.boost_url))) return res.status(400).json({ ok: false, error: 'Uno de los chats contiene un enlace boost de Telegram no válido' });
    const preset = insideAdsPreset;
    payload.ad = { ...normalizeHouseAd({ ...submitted, url: destination,
      audience: preset?.audience || submitted.audience,
      web_url: preset?.web_url || submitted.web_url,
      telegram_url: preset?.telegram_url || submitted.telegram_url,
    }), inside_ads_scope: preset?.audience || '', inside_ads_preset: preset?.id || '', approval_status: 'pending', submitted_by: auth.user.id };
  }
  try {
    const response = await moon({ method: 'POST', body: JSON.stringify(payload) });
    const rawBody = await response.text();
    try {
      const data = JSON.parse(rawBody);
      if (response.ok) {
        invalidateCatalog();
        const updated = (data.ads || []).find((item) => String(item.id) === String(candidateId || payload.ad?.id || '')) || payload.ad || null;
        appendHouseAdsAudit({ action, actor: auth.user, adId: candidateId || updated?.id, before: existingAd, after: updated }).catch(() => {});
        if (candidateId && ['approve', 'reject'].includes(action)) {
          pocketbaseClient.collection('nw3_affiliate_applications').getFirstListItem(`campaign_id="${candidateId.replaceAll('"', '')}"`)
            .then((application) => pocketbaseClient.collection('nw3_affiliate_applications').update(application.id, { status: action === 'approve' ? 'approved' : 'rejected' }))
            .catch(() => {});
        }
      }
      return res.status(response.status).json(data);
    }
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

router.get('/audit', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creator puede consultar la auditoría publicitaria' });
  return res.json({ ok: true, events: await readHouseAdsAudit(req.query.limit) });
});

router.get('/governance', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const state = await readCampaignGovernance();
  return res.json({ ok: true, state, summary: governanceSummary(state), permissions: { manage: auth.user.role === 'creator', collaborate: true } });
});

router.post('/governance', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const creatorActions = new Set(['saved_view', 'snapshot', 'note_remove', 'checklist_remove']);
  if (creatorActions.has(String(req.body?.action)) && auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Esta operación requiere el rol creator' });
  try {
    const state = applyGovernanceAction(await readCampaignGovernance(), req.body, auth.user);
    await writeCampaignGovernance(state);
    return res.json({ ok: true, state, summary: governanceSummary(state) });
  } catch (error) { return res.status(400).json({ ok: false, error: error.message }); }
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

router.get('/:id/boost', async (req, res) => {
  const placement = String(req.query.placement || 'unknown').slice(0, 20);
  const site = siteFromRequest(req, placement);
  const country = requestCountry(req);
  const officialAd = OFFICIAL_ADS.find((item) => item.id === String(req.params.id));
  try {
    let ad = officialAd;
    if (!ad) {
      const current = await moon();
      const data = JSON.parse(await current.text());
      ad = (data.ads || []).find((item) => String(item.id) === String(req.params.id));
    }
    if (!ad || !ad.enabled || ad.approval_status !== 'approved' || !isScheduledNow(ad)) return res.redirect(302, 'https://t.me/');
    const requestedItem = String(req.query.chat || '').slice(0, 64);
    const communityItem = Array.isArray(ad.community_items)
      ? ad.community_items.find((item) => String(item.id) === requestedItem)
      : null;
    const destination = normalizeTelegramBoostUrl(communityItem?.boost_url || ad.boost_url);
    if (!destination) return res.redirect(302, safeAdDestination(communityItem?.url || ad.url));
    const metricPlacement = `boost_${placement}`.slice(0, 32);
    moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: ad.id, placement: metricPlacement, site, country, item_id: communityItem?.id || '' }) }).catch(() => {});
    recordContentEvent({ kind: 'community_ad', targetId: ad.id, eventType: 'click', country, placement: metricPlacement });
    return res.redirect(302, destination);
  } catch {
    return res.redirect(302, 'https://t.me/');
  }
});

router.get('/:id/click', async (req, res) => {
  const officialAd = OFFICIAL_ADS.find((item) => item.id === String(req.params.id));
  const placement = String(req.query.placement || 'unknown').slice(0, 20);
  const site = siteFromRequest(req, placement);
  const country = requestCountry(req);
  const chatId = /^-?\d{5,24}$/.test(String(req.query.chat_id || '')) ? String(req.query.chat_id) : '';
  const botId = /^\d{5,24}$/.test(String(req.query.bot_id || '')) ? String(req.query.bot_id) : '';
  const fraud = acceptAdClick(adRequestFingerprint(req, req.params.id));
  if (!fraud.accepted) {
    res.set('Retry-After', String(fraud.retry_after_seconds));
    return res.redirect(302, 'https://todosobreall.tech');
  }
  if (officialAd) {
    const requestedItem = String(req.query.chat || '').slice(0, 64);
    const communityItem = Array.isArray(officialAd.community_items)
      ? officialAd.community_items.find((item) => String(item.id) === requestedItem)
      : null;
    moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: officialAd.id, placement, site, country, item_id: communityItem?.id || '' }) }).catch(() => {});
    recordContentEvent({ kind: 'community_ad', targetId: officialAd.id, eventType: 'click', country, placement });
    return res.redirect(302, safeAdDestination(communityItem?.url || officialAd.url));
  }
  try {
    const current = await moon();
    const rawBody = await current.text();
    let data;
    try { data = JSON.parse(rawBody); } catch { return res.redirect(302, 'https://todosobreall.tech'); }
    const ad = (data.ads || []).find((item) => String(item.id) === String(req.params.id));
    if (!ad || !ad.enabled || ad.approval_status !== 'approved' || !isScheduledNow(ad)) return res.redirect(302, 'https://todosobreall.tech');
    if (ad.audience === 'channel_owner' && !await ownerDeliveryEligible(req, placement)) return res.redirect(302, 'https://todosobreall.tech');
    const requestedItem = String(req.query.chat || '').slice(0, 64);
    const communityItem = Array.isArray(ad.community_items)
      ? ad.community_items.find((item) => String(item.id) === requestedItem)
      : null;
    const destination = String(communityItem?.url || insideAdsDestinationFor(ad, { placement, site }) || ad.url || 'https://todosobreall.tech');
    await moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: ad.id, placement, site, country, item_id: communityItem?.id || '', chat_id: chatId, bot_id: botId }) });
    recordContentEvent({ kind: 'community_ad', targetId: ad.id, eventType: 'click', country, placement });
    return res.redirect(302, safeAdDestination(destination));
  } catch { return res.redirect(302, 'https://todosobreall.tech'); }
});

export default router;
