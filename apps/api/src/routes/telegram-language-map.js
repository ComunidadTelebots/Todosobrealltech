import express from 'express';
import { MOONBOT_INTERNAL_URL, MOONBOT_PUBLIC_URL, requestMoonbot } from '../utils/moonbotConnection.js';
import logger from '../utils/logger.js';

const router = express.Router();
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export async function requestLanguageMap(fetchImpl, origin = '') {
  if (origin && !['private', 'group', 'channel'].includes(origin)) throw new Error('Origen no válido');
  const endpoint = '/api/public/stats/language-map' + (origin ? `?origin=${origin}` : '');
  const bases = [...new Set([MOONBOT_INTERNAL_URL, MOONBOT_PUBLIC_URL].filter(Boolean))];
  let lastError = new Error('Moonbot no configurado');
  for (const base of bases) {
    try {
      const response = base === MOONBOT_INTERNAL_URL
        ? await requestMoonbot(endpoint, {
          fetchImpl, timeoutMs: 6000, headers: { Accept: 'application/json' },
        })
        : await (fetchImpl || fetch)(`${base}${endpoint}`, {
          signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' },
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

router.get('/', async (req, res) => {
  const origin = String(req.query.origin || '');
  if (origin && !['private', 'group', 'channel'].includes(origin)) return res.status(400).json({ ok: false, error: 'Origen no válido' });
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return res.json(cached.payload);
  try {
    const payload = await requestLanguageMap(undefined, origin);
    if (origin && payload.metric !== 'message_observations') throw new Error('Actualiza Moonbot para consultar el origen');
    cache.set(origin, { payload, at: Date.now() });
    return res.json(payload);
  } catch (error) {
    logger.warn(`[telegram-language-map] ${error.message}`);
    return res.status(502).json({ ok: false, total_users: 0, languages: 0, points: [],
      error: 'No se pudo consultar la distribución lingüística de Moonbot' });
  }
});

export default router;
