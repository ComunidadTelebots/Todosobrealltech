import express from 'express';
import { authorizeAuthenticatedUser } from './stats.js';
import { requestMoonbot } from '../utils/moonbotConnection.js';

export function createRssRouter({ authorize = authorizeAuthenticatedUser, upstream = requestMoonbot } = {}) {
  const router = express.Router();
  router.use(async (req, res, next) => {
    const auth = await authorize(req);
    if (!auth.user) return res.status(auth.status || 401).json({ ok: false, error: auth.error });
    req.rssUser = auth.user;
    res.set('Cache-Control', 'no-store');
    next();
  });
  async function proxy(req, res, path, options = {}) {
    try {
      const response = await upstream(path, { attempts: 1, timeoutMs: 10000, ...options });
      return res.status(response.status).json(await response.json());
    } catch {
      return res.status(503).json({ ok: false, error: 'RSS de Moonbot temporalmente no disponible' });
    }
  }
  router.post('/reader', (req, res) => {
    const uid = String(req.rssUser.telegram_id || '0');
    if (!/^\d{1,20}$/.test(uid)) return res.status(400).json({ ok: false });
    const raw = req.body || {};
    if (!['read', 'share'].includes(raw.action || 'read')) return res.status(400).json({ ok: false });
    if (raw.action === 'share' && uid === '0') return res.status(409).json({ ok: false, error: 'Vincula tu Telegram para publicar en canales.' });
    const body = Object.fromEntries(['action', 'source_id', 'entry_id', 'channel_id'].filter((key) => Object.hasOwn(raw, key)).map((key) => [key, raw[key]]));
    if (Object.values(body).some((value) => typeof value !== 'string' || value.length > 160)) return res.status(400).json({ ok: false });
    return proxy(req, res, `/api/internal/rss/reader/${uid}`, { method: 'POST', body: JSON.stringify(body), timeoutMs: 20000 });
  });
  router.get('/catalog', (req, res) => proxy(req, res, '/api/internal/rss/catalog'));
  router.get('/activity', (req, res) => {
    if (req.rssUser.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo master' });
    return proxy(req, res, '/api/internal/rss/activity');
  });
  router.get('/channels', (req, res) => {
    const uid = String(req.rssUser.telegram_id || '');
    if (!/^[1-9]\d{0,19}$/.test(uid)) return res.status(409).json({ ok: false, error: 'Vincula tu Telegram para gestionar canales.' });
    return proxy(req, res, `/api/internal/rss/channels/${uid}`);
  });
  router.all('/channels/:cid', (req, res) => {
    const uid = String(req.rssUser.telegram_id || '');
    const cid = String(req.params.cid);
    if (!/^[1-9]\d{0,19}$/.test(uid) || !/^-\d{1,20}$/.test(cid)) return res.status(400).json({ ok: false, error: 'Destino no válido' });
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false });
    const raw = req.body || {};
    if (!['list', 'add', 'toggle', 'delete'].includes(raw.action || 'list')) return res.status(400).json({ ok: false });
    const body = Object.fromEntries(['action', 'url', 'title', 'feed_id', 'enabled'].filter((key) => Object.hasOwn(raw, key)).map((key) => [key, raw[key]]));
    return proxy(req, res, `/api/internal/rss/channels/${uid}/${cid}`, { method: req.method, body: req.method === 'POST' ? JSON.stringify(body) : undefined });
  });
  router.all('/me', (req, res) => {
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false });
    const uid = String(req.rssUser.telegram_id || '');
    if (!/^[1-9]\d{0,19}$/.test(uid)) return res.status(409).json({ ok: false, error: 'Vincula primero tu cuenta de Telegram a tu cuenta web.' });
    const raw = req.body || {};
    const action = raw.action || 'list';
    if (!['list', 'add', 'toggle', 'delete', 'verify_membership'].includes(action)) return res.status(400).json({ ok: false, error: 'Acción no permitida' });
    const body = Object.fromEntries(['action', 'url', 'title', 'feed_id', 'enabled'].filter((key) => Object.hasOwn(raw, key)).map((key) => [key, raw[key]]));
    return proxy(req, res, `/api/internal/rss/users/${uid}`, { method: req.method,
      body: req.method === 'POST' ? JSON.stringify(body) : undefined });
  });
  return router;
}
export default createRssRouter();
