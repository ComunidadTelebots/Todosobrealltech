import 'dotenv/config';
import express from 'express';
import PocketBase from 'pocketbase';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

const POCKETBASE_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const ALLOWED_ROLES = ['admin', 'creator'];

// Caché en memoria a nivel de módulo (basta con timestamp; no requiere Redis).
let cache = null;
let cacheAt = 0;

/**
 * Valida el Bearer token del usuario y exige rol admin/creator.
 * Usa un cliente PocketBase AISLADO (no el cliente superuser compartido) para
 * no pisar su authStore. Devuelve el record del usuario, o null si no autorizado
 * (el caller ya habrá respondido con el status adecuado).
 *
 * Retorna { user } en éxito, o { status, error } en fallo.
 */
async function authorize(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { status: 401, error: 'Authorization header is required' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { status: 401, error: 'Bearer token is required' };
  }

  const userClient = new PocketBase(POCKETBASE_HOST);
  userClient.autoCancellation(false);
  userClient.authStore.save(token, null);

  let record;
  try {
    const authData = await userClient.collection('users').authRefresh();
    record = authData?.record;
  } catch {
    return { status: 401, error: 'Invalid or expired authentication token' };
  }

  if (!record) {
    return { status: 401, error: 'Invalid or expired authentication token' };
  }

  if (!ALLOWED_ROLES.includes(record.role)) {
    return { status: 403, error: 'Only admin/creator can access these stats' };
  }

  return { user: record };
}

/**
 * Agrega todas las métricas del dashboard usando el cliente superuser.
 * NUNCA expone campos crudos de tg_channels (contiene bot_token): solo agregados.
 */
async function buildStats() {
  // Inicio del día actual en UTC, formato de la columna autodate `created`.
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString().replace('T', ' ');

  const [usersList, botsList, newsList, newsTodayList, channelsList, snapshots, proxiesList] = await Promise.all([
    pb.collection('users').getList(1, 1),
    pb.collection('bots').getList(1, 1),
    pb.collection('nw3_noticias').getList(1, 1),
    // `fecha` es texto en español no filtrable; se usa `created` (autodate).
    pb.collection('nw3_noticias').getList(1, 1, { filter: `created >= "${todayStart}"` }),
    pb.collection('tg_channels').getList(1, 1),
    // Último snapshot de cada canal: dedup por chat_id sobre orden -day.
    pb.collection('tg_channel_snapshots').getFullList({ sort: '-day' }),
    pb.collection('proxies').getList(1, 1, { sort: '-last_updated' }),
  ]);

  const seenChannels = new Set();
  let subscribers = 0;
  for (const snap of snapshots) {
    if (!seenChannels.has(snap.chat_id)) {
      seenChannels.add(snap.chat_id);
      subscribers += snap.member_count || 0;
    }
  }

  return {
    users: usersList.totalItems,
    bots: botsList.totalItems,
    news: { total: newsList.totalItems, today: newsTodayList.totalItems },
    channels: { total: channelsList.totalItems, subscribers },
    proxies: {
      total: proxiesList.totalItems,
      lastUpdated: proxiesList.items[0]?.last_updated || null,
    },
    services: null, // placeholder fase 3
    github: null,    // placeholder fase 3
    cachedAt: new Date().toISOString(),
  };
}

// GET /stats — métricas agregadas del dashboard (admin/creator).
router.get('/', async (req, res) => {
  const auth = await authorize(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // Servir de caché si sigue fresca.
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return res.json(cache);
  }

  try {
    const stats = await buildStats();
    cache = stats;
    cacheAt = Date.now();
    return res.json(stats);
  } catch (error) {
    logger.error(`Failed to build dashboard stats: ${error.message}`);
    // No cacheamos fallos. Si hay caché previa, la servimos como degradación.
    if (cache) {
      return res.json(cache);
    }
    return res.status(502).json({ error: 'Failed to aggregate stats' });
  }
});

export default router;
