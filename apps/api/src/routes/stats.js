import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import http from 'node:http';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { summarizeOnionMetrics } from '../utils/dashboardStats.js';

const router = express.Router();

const POCKETBASE_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const ALLOWED_ROLES = ['admin', 'creator'];

// Caché de la agregación (basta con timestamp; no requiere Redis).
let cache = null;
let cacheAt = 0;

// Caché de validación de tokens: sha256(token) -> { user, role, expiresAt }.
// Evita machacar auth-refresh de PocketBase desde la IP del contenedor: una
// validación vale 60s. Sin ella, un pico de peticiones abre una conexión nueva
// por request y expone timeouts de conexión intermitentes.
const TOKEN_CACHE_TTL_MS = 60 * 1000;
const AUTH_MAX_ATTEMPTS = 2; // reintento de respaldo ante fallo de transporte
const AUTH_ATTEMPT_TIMEOUT_MS = 12000; // tolera conexiones internas lentas
const tokenCache = new Map();
const tokenValidationInFlight = new Map();

// authRefresh con timeout propio por intento: una conexión fría a PocketBase puede
// tardar el connectTimeout de undici (~10s). Cortamos antes y reintentamos con
// conexión nueva, que suele calentar y responder en ms.
async function authRefreshWithTimeout(token, timeoutMs) {
  const target = new URL('/api/collections/users/auth-refresh', POCKETBASE_HOST);
  return new Promise((resolve, reject) => {
    const request = http.request(target, {
      method: 'POST',
      agent: false,
      headers: { Authorization: token, Connection: 'close', 'Content-Length': '0' },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        let data = {};
        try { data = body ? JSON.parse(body) : {}; } catch { data = {}; }
        if ((response.statusCode || 500) >= 400) {
          reject({ status: response.statusCode, response: data });
        } else {
          resolve(data);
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('auth-refresh timeout')));
    request.on('error', (error) => reject({ status: 0, originalError: error, message: error.message }));
    request.end();
  });
}

function pruneTokenCache(now) {
  for (const [k, v] of tokenCache) {
    if (v.expiresAt <= now) tokenCache.delete(k);
  }
}

/**
 * Valida el token contra PocketBase con reintentos SOLO ante fallo de transporte
 * (err.status === 0: connect timeout / socket, no es culpa del token). Devuelve:
 *   { record }      → token válido
 *   { invalid:true }→ PocketBase respondió 401/403/400 (token realmente inválido)
 *   { transient:true} → fallo de transporte persistente tras los reintentos
 */
async function validateToken(token) {
  for (let attempt = 1; attempt <= AUTH_MAX_ATTEMPTS; attempt++) {
    try {
      const authData = await authRefreshWithTimeout(token, AUTH_ATTEMPT_TIMEOUT_MS);
      return { record: authData?.record || null };
    } catch (err) {
      if (err?.status === 0) {
        // Transporte: reintenta con una conexión nueva.
        if (attempt < AUTH_MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        logger.error(`[stats] auth-refresh transporte KO tras ${AUTH_MAX_ATTEMPTS} intentos: ${err?.originalError?.cause?.code || err?.message}`);
        return { transient: true };
      }
      // PocketBase respondió con un error real de auth → token inválido.
      return { invalid: true };
    }
  }
  return { transient: true };
}

/**
 * Valida el Bearer token del usuario y exige rol admin/creator.
 * Usa un cliente PocketBase AISLADO (no el cliente superuser compartido) para
 * no pisar su authStore. Devuelve el record del usuario, o null si no autorizado
 * (el caller ya habrá respondido con el status adecuado).
 *
 * Retorna { user } en éxito, o { status, error } en fallo.
 */
function decideByRole(user) {
  if (!ALLOWED_ROLES.includes(user.role)) {
    return { status: 403, error: 'Only admin/creator can access these stats' };
  }
  return { user };
}

async function authorizeUser(req, adminOnly) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { status: 401, error: 'Authorization header is required' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { status: 401, error: 'Bearer token is required' };
  }

  const now = Date.now();
  const key = crypto.createHash('sha256').update(token).digest('hex');

  // Caché válida → no se llama a authRefresh.
  const hit = tokenCache.get(key);
  if (hit && hit.expiresAt > now) {
    return adminOnly ? decideByRole(hit.user) : { user: hit.user };
  }

  // El panel carga muchos widgets a la vez. Una sola renovación compartida
  // evita una avalancha de auth-refresh para el mismo token.
  let validation = tokenValidationInFlight.get(key);
  if (!validation) {
    validation = validateToken(token).finally(() => tokenValidationInFlight.delete(key));
    tokenValidationInFlight.set(key, validation);
  }
  const result = await validation;

  // Fallo de transporte hacia PocketBase: NO es un token inválido. 503 + Retry-After
  // para no forzar un logout falso en el frontend.
  if (result.transient) {
    return { status: 503, error: 'Auth backend temporarily unavailable', retryAfter: 2 };
  }
  // PocketBase rechazó el token (401/403/400) o no devolvió record.
  if (result.invalid || !result.record) {
    return { status: 401, error: 'Invalid or expired authentication token' };
  }

  const record = result.record;
  const user = { id: record.id, role: record.role, username: record.username };
  pruneTokenCache(now);
  tokenCache.set(key, { user, expiresAt: now + TOKEN_CACHE_TTL_MS });

  return adminOnly ? decideByRole(user) : { user };
}

export const authorizeAuthenticatedUser = (req) => authorizeUser(req, false);
export const authorizeAdminOrCreator = (req) => authorizeUser(req, true);

/**
 * Agrega todas las métricas del dashboard usando el cliente superuser.
 * NUNCA expone campos crudos de tg_channels (contiene bot_token): solo agregados.
 */
async function buildStats() {
  // Inicio del día actual en UTC, formato de la columna autodate `created`.
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString().replace('T', ' ');

  const thirtyDaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ');

  const [users, botsList, newsList, newsTodayList, channelsList, snapshots, proxies, onionWebs, onionAccesses] = await Promise.all([
    pb.collection('users').getFullList({ fields: 'id,role,verified,is_frozen,created' }),
    pb.collection('bots').getList(1, 1),
    pb.collection('nw3_noticias').getList(1, 1),
    // `fecha` es texto en español no filtrable; se usa `created` (autodate).
    pb.collection('nw3_noticias').getList(1, 1, { filter: `created >= "${todayStart}"` }),
    pb.collection('tg_channels').getList(1, 1),
    // Último snapshot de cada canal: dedup por chat_id sobre orden -day.
    pb.collection('tg_channel_snapshots').getFullList({ sort: '-day' }),
    pb.collection('user_proxies').getFullList({ sort: '-updated', fields: 'id,user_id,status,last_tested,updated' }),
    pb.collection('onion_webs').getFullList({ fields: 'id,enabled,created_at,updated' }),
    pb.collection('onion_access_logs').getList(1, 1, { filter: `access_timestamp >= "${thirtyDaysStart}"` }),
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
    users: users.length,
    userStats: {
      total: users.length,
      verified: users.filter((user) => user.verified).length,
      frozen: users.filter((user) => user.is_frozen).length,
      creators: users.filter((user) => user.role === 'creator').length,
      admins: users.filter((user) => user.role === 'admin').length,
      regular: users.filter((user) => !['admin', 'creator'].includes(user.role)).length,
    },
    bots: botsList.totalItems,
    onions: summarizeOnionMetrics(onionWebs, onionAccesses.totalItems),
    news: { total: newsList.totalItems, today: newsTodayList.totalItems },
    channels: { total: channelsList.totalItems, subscribers },
    proxies: {
      total: proxies.length,
      active: proxies.filter((proxy) => proxy.status === 'active' || proxy.status === true).length,
      owners: new Set(proxies.map((proxy) => proxy.user_id).filter(Boolean)).size,
      lastUpdated: proxies[0]?.last_tested || proxies[0]?.updated || null,
    },
    services: null, // placeholder fase 3
    github: null,    // placeholder fase 3
    cachedAt: new Date().toISOString(),
  };
}

// GET /stats — métricas agregadas del dashboard (admin/creator).
router.get('/', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) {
    if (auth.retryAfter) {
      res.set('Retry-After', String(auth.retryAfter));
    }
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
