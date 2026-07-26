import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();
const MOONBOT_PUBLIC_URL = (process.env.MOONBOT_PUBLIC_URL || 'https://cintiabot.todosobreall.tech').replace(/\/$/, '');
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
let cacheAt = 0;

router.get('/', async (_req, res) => {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return res.json(cache);
  try {
    const response = await fetch(`${MOONBOT_PUBLIC_URL}/api/public/stats/language-map`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Moonbot HTTP ${response.status}`);
    const payload = await response.json();
    cache = payload;
    cacheAt = Date.now();
    return res.json(payload);
  } catch (error) {
    logger.warn(`[telegram-language-map] ${error.message}`);
    return res.status(502).json({ ok: false, total_users: 0, languages: 0, points: [],
      error: 'No se pudo consultar la distribución lingüística de Moonbot' });
  }
});

export default router;
