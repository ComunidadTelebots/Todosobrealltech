import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator } from './stats.js';

const router = express.Router();
const MOONBOT_INTERNAL_URL = (process.env.MOONBOT_INTERNAL_URL || process.env.MOONBOT_PUBLIC_URL || 'https://cintiabot.todosobreall.tech').replace(/\/$/, '');
const CACHE_TTL_MS = 15 * 1000;
let cache = null;
let cacheAt = 0;

router.get('/dashboard', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) {
    if (auth.retryAfter) res.set('Retry-After', String(auth.retryAfter));
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const serviceKey = (process.env.MOON_ADMIN_API_KEY || '').trim();
  if (!serviceKey) {
    return res.status(503).json({ ok: false, error: 'La integraciÃ³n segura con Moonbot no estÃ¡ configurada' });
  }
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return res.json(cache);

  try {
    const response = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/admin-overview`, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json', 'X-Moon-Admin-Key': serviceKey },
    });
    if (!response.ok) throw new Error(`Moonbot HTTP ${response.status}`);
    cache = await response.json();
    cacheAt = Date.now();
    return res.json(cache);
  } catch (error) {
    logger.warn(`[moonbot-admin] ${error.message}`);
    if (cache) return res.json({ ...cache, stale: true });
    return res.status(502).json({ ok: false, error: 'Moonbot no responde en este momento' });
  }
});

export default router;
