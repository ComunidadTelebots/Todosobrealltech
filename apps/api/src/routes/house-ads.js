import { Router } from 'express';
import { authorizeAdminOrCreator } from './stats.js';

const router = Router();
const MOON_URLS = [...new Set([
  process.env.MOONBOT_INTERNAL_URL,
  'http://moonbot:5000',
].filter(Boolean).map((value) => value.replace(/\/$/, '')))];
const headers = () => ({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-Moon-Admin-Key': String(process.env.MOON_ADMIN_API_KEY || '').trim() });
const isScheduledNow = (ad, now = Date.now()) => (!ad.starts_at || Date.parse(ad.starts_at) <= now) && (!ad.ends_at || Date.parse(ad.ends_at) >= now);

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
  try {
    const response = await moon(); const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const placement = String(req.query.placement || '');
    let ads = (data.ads || []).filter((ad) => ad.enabled !== false && !['pending', 'rejected'].includes(ad.approval_status) && isScheduledNow(ad) && (!placement || ['all', placement].includes(ad.placement || 'all')));
    if (placement && ads.length) {
      const highestPriority = Math.max(...ads.map((ad) => Number(ad.priority || 0)));
      const candidates = ads.filter((ad) => Number(ad.priority || 0) === highestPriority)
        .sort((left, right) => Number(left.impressions_by_placement?.[placement] || 0) - Number(right.impressions_by_placement?.[placement] || 0));
      ads = candidates.slice(0, 1);
      moon({ method: 'POST', body: JSON.stringify({ action: 'impression', id: ads[0].id, placement }) }).catch(() => {});
    }
    return res.json({ ok: true, ads });
  } catch { return res.status(502).json({ ok: false, error: 'Catálogo propio no disponible' }); }
});

router.post('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const payload = { ...(req.body || {}) };
  if (['approve', 'reject'].includes(payload.action) && auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creador puede revisar campañas' });
  if ((!payload.action || payload.action === 'upsert') && payload.ad) payload.ad = { ...payload.ad, approval_status: auth.user.role === 'creator' ? 'approved' : 'pending', submitted_by: auth.user.id };
  try { const response = await moon({ method: 'POST', body: JSON.stringify(payload) }); return res.status(response.status).json(await response.json()); }
  catch { return res.status(502).json({ ok: false, error: 'Moonbot no responde' }); }
});

router.get('/:id/click', async (req, res) => {
  try {
    const current = await moon(); const data = await current.json();
    const ad = (data.ads || []).find((item) => String(item.id) === String(req.params.id));
    if (!ad || !ad.enabled || ['pending', 'rejected'].includes(ad.approval_status) || !isScheduledNow(ad)) return res.redirect(302, 'https://todosobreall.tech');
    const placement = String(req.query.placement || 'unknown').slice(0, 20);
    await moon({ method: 'POST', body: JSON.stringify({ action: 'click', id: ad.id, placement }) });
    return res.redirect(302, ad.url.startsWith('tg://') ? ad.url.replace('tg://', 'https://t.me/') : ad.url);
  } catch { return res.redirect(302, 'https://todosobreall.tech'); }
});

export default router;
