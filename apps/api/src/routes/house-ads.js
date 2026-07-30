import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import geoip from 'geoip-lite';
import { authorizeAdminOrCreator } from './stats.js';

const router = Router();
const MOON_URLS = [...new Set([
  process.env.MOONBOT_INTERNAL_URL,
  'http://moonbot:5000',
].filter(Boolean).map((value) => value.replace(/\/$/, '')))];
const headers = () => ({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-Moon-Admin-Key': String(process.env.MOON_ADMIN_API_KEY || '').trim() });
const isScheduledNow = (ad, now = Date.now()) => (!ad.starts_at || Date.parse(ad.starts_at) <= now) && (!ad.ends_at || Date.parse(ad.ends_at) >= now);
const mediaDir = '/data/house-ad-media';
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
const OFFICIAL_ADS = [
  { id: 'official-todosobrealltech', title: 'TodoSobreAllTech en Telegram', description: 'Noticias de tecnología, IA, Web3 y seguridad en nuestro canal oficial.', cta: 'Unirme al canal', url: 'https://t.me/TodoSobreAllTech', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#e9f8ff,#d8f0ff)', foreground: '#12324a', accent: '#168acd', builtin: true },
  { id: 'official-comunidadtelebots', title: 'Comunidad TeleBots', description: 'Canales, grupos, bots y proyectos abiertos de nuestra comunidad Telegram.', cta: 'Abrir comunidad', url: 'https://t.me/comunidadtelebots', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#f4ecff,#e7ddff)', foreground: '#2f2350', accent: '#7157c8', builtin: true },
  { id: 'official-resistencia-censura', title: 'Resistencia a la Censura', description: 'Privacidad, acceso libre a la información y resistencia digital.', cta: 'Ver canal', url: 'https://t.me/resistencia_censura', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', foreground: '#7c2d12', accent: '#ea580c', builtin: true },
  { id: 'official-todosobregameplays', title: 'Todo Sobre Gameplays', description: 'Vídeos, directos y novedades para la comunidad gaming.', cta: 'Ver gameplays', url: 'https://t.me/TodoSobreGameplaysCanal', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', foreground: '#4c1d95', accent: '#7c3aed', builtin: true },
  { id: 'official-instagram', title: 'TodoSobreAllTech en Instagram', description: 'Noticias, tecnología e inteligencia artificial en formato visual.', cta: 'Seguir en Instagram', url: 'https://www.instagram.com/todosobrealltech/', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#fff1f2,#fae8ff)', foreground: '#831843', accent: '#db2777', builtin: true },
];
const officialAdsFor = (placement = '') => OFFICIAL_ADS.filter((ad) => !placement || ['all', placement].includes(ad.placement));
const ROTATION_MS = 10 * 60 * 1000;
const rotatedOfficialAdsFor = (placement = '', now = Date.now()) => {
  const ads = officialAdsFor(placement);
  if (ads.length < 2) return ads;
  const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const index = (Math.floor(now / ROTATION_MS) + offset) % ads.length;
  return [...ads.slice(index), ...ads.slice(0, index)];
};
const requestCountry = (req) => {
  const headerCountry = ['cf-ipcountry', 'x-country-code', 'x-vercel-ip-country', 'x-geo-country']
    .map((name) => String(req.headers[name] || '').trim().toUpperCase())
    .find((value) => /^[A-Z]{2}$/.test(value) && value !== 'XX');
  if (headerCountry) return headerCountry;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map((value) => value.trim());
  const address = forwarded.find(Boolean) || String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
  return String(geoip.lookup(address)?.country || 'UNK').toUpperCase();
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
  const country = requestCountry(req);
  try {
    const response = await moon();
    const rawBody = await response.text();
    let data;
    try { data = JSON.parse(rawBody); }
    catch { return res.json({ ok: true, ads: rotatedOfficialAdsFor(placement).slice(0, 1), fallback: true, upstream_status: response.status }); }
    if (!response.ok) return res.json({ ok: true, ads: rotatedOfficialAdsFor(placement).slice(0, 1), fallback: true, upstream_status: response.status });
    let ads = (data.ads || []).filter((ad) => ad.enabled !== false && !['pending', 'rejected'].includes(ad.approval_status) && isScheduledNow(ad) && (!placement || ['all', placement].includes(ad.placement || 'all')));
    if (!ads.length) ads = officialAdsFor(placement);
    if (placement && ads.length) {
      const highestPriority = Math.max(...ads.map((ad) => Number(ad.priority || 0)));
      const candidates = ads.filter((ad) => Number(ad.priority || 0) === highestPriority)
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
      const offset = [...placement].reduce((sum, character) => sum + character.charCodeAt(0), 0);
      ads = [candidates[(Math.floor(Date.now() / ROTATION_MS) + offset) % candidates.length]];
      moon({ method: 'POST', body: JSON.stringify({ action: 'impression', id: ads[0].id, placement, country }) }).catch(() => {});
    }
    return res.json({ ok: true, ads });
  } catch {
    const ads = rotatedOfficialAdsFor(placement).slice(0, 1);
    return res.json({ ok: true, ads, fallback: true });
  }
});

router.post('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const payload = { ...(req.body || {}) };
  if (['approve', 'reject'].includes(payload.action) && auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creador puede revisar campañas' });
  if ((!payload.action || payload.action === 'upsert') && payload.ad) payload.ad = { ...payload.ad, approval_status: auth.user.role === 'creator' ? 'approved' : 'pending', submitted_by: auth.user.id };
  try {
    const response = await moon({ method: 'POST', body: JSON.stringify(payload) });
    const rawBody = await response.text();
    try { return res.status(response.status).json(JSON.parse(rawBody)); }
    catch { return res.status(502).json({ ok: false, error: 'Moonbot devolvió una respuesta no válida', upstream_status: response.status }); }
  }
  catch { return res.status(502).json({ ok: false, error: 'Moonbot no responde' }); }
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
  const country = requestCountry(req);
  if (officialAd) {
    moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: officialAd.id, placement, country }) }).catch(() => {});
    return res.redirect(302, officialAd.url);
  }
  try {
    const current = await moon();
    const rawBody = await current.text();
    let data;
    try { data = JSON.parse(rawBody); } catch { return res.redirect(302, 'https://todosobreall.tech'); }
    const ad = (data.ads || []).find((item) => String(item.id) === String(req.params.id));
    if (!ad || !ad.enabled || ['pending', 'rejected'].includes(ad.approval_status) || !isScheduledNow(ad)) return res.redirect(302, 'https://todosobreall.tech');
    const requestedItem = String(req.query.chat || '').slice(0, 64);
    const communityItem = Array.isArray(ad.community_items)
      ? ad.community_items.find((item) => String(item.id) === requestedItem)
      : null;
    const destination = String(communityItem?.url || ad.url || 'https://todosobreall.tech');
    await moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: ad.id, placement, country, item_id: communityItem?.id || '' }) });
    return res.redirect(302, safeAdDestination(destination));
  } catch { return res.redirect(302, 'https://todosobreall.tech'); }
});

export default router;
