import express from 'express';
import { MOONBOT_INTERNAL_URL, MOONBOT_PUBLIC_URL } from '../utils/moonbotConnection.js';
import logger from '../utils/logger.js';

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
let cacheAt = 0;

export async function requestLanguageMap(fetchImpl = fetch) {
  const bases = [...new Set([MOONBOT_INTERNAL_URL, MOONBOT_PUBLIC_URL].filter(Boolean))];
  let lastError = new Error('Moonbot no configurado');
  for (const base of bases) {
    try {
      const response = await fetchImpl(`${base}/api/public/stats/language-map`, {
        signal: AbortSignal.timeout(base === MOONBOT_INTERNAL_URL ? 6000 : 12000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Moonbot HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || payload.ok !== true || !Array.isArray(payload.points)) {
        throw new Error('Respuesta lingüística inválida');
      }
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

router.get('/', async (_req, res) => {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return res.json(cache);
  try {
    const payload = await requestLanguageMap();
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
