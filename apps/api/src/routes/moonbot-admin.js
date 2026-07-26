import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator } from './stats.js';

const router = express.Router();
const MOONBOT_INTERNAL_URL = (process.env.MOONBOT_INTERNAL_URL || process.env.MOONBOT_PUBLIC_URL || 'https://cintiabot.todosobreall.tech').replace(/\/$/, '');
const CACHE_TTL_MS = 15 * 1000;
let cache = null;
let cacheAt = 0;

router.post('/account-tools/sign', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const key = (process.env.MOON_ADMIN_API_KEY || '').trim();
  if (!key) return res.status(503).json({ ok: false, error: 'Firma administrativa no configurada' });
  const payload = req.body?.payload;
  if (!payload || JSON.stringify(payload).length > 500000) return res.status(400).json({ ok: false, error: 'Paquete no válido' });
  const serialized = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', key).update(serialized).digest('hex');
  return res.json({ ok: true, bundle: { payload, algorithm: 'HMAC-SHA256', signature } });
});

async function requireAdmin(req, res) {
  const auth = await authorizeAdminOrCreator(req);
  if (!auth.error) return true;
  if (auth.retryAfter) res.set('Retry-After', String(auth.retryAfter));
  res.status(auth.status).json({ ok: false, error: auth.error });
  return false;
}

function serviceConfig(res) {
  const key = (process.env.MOON_ADMIN_API_KEY || '').trim();
  if (!key) res.status(503).json({ ok: false, error: 'La integraciÃ³n segura con Moonbot no estÃ¡ configurada' });
  return key;
}

async function moonRequest(path, options = {}) {
  const serviceKey = (process.env.MOON_ADMIN_API_KEY || '').trim();
  return fetch(`${MOONBOT_INTERNAL_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(6000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Moon-Admin-Key': serviceKey, ...(options.headers || {}) },
  });
}

router.get('/dashboard', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return res.json(cache);

  try {
    const response = await moonRequest('/api/internal/admin-overview');
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

router.all('/groups/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const cid = String(req.params.id || '');
  if (!/^-\d+$/.test(cid)) return res.status(400).json({ ok: false, error: 'ID de grupo no vÃ¡lido' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  try {
    const response = await moonRequest(`/api/internal/groups/${encodeURIComponent(cid)}`, {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch (error) {
    logger.warn(`[moonbot-groups] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el grupo' });
  }
});

router.get('/users', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const query = String(req.query.q || '').slice(0, 100);
  try {
    const response = await moonRequest(`/api/internal/users?q=${encodeURIComponent(query)}`);
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-users] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron consultar los usuarios' });
  }
});

router.all('/users/:id', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const uid = String(req.params.id || '');
  if (!/^\d+$/.test(uid)) return res.status(400).json({ ok: false, error: 'ID de usuario no vÃ¡lido' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  try {
    const response = await moonRequest(`/api/internal/users/${uid}`, {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-user] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo completar la acciÃ³n de usuario' });
  }
});

router.all('/security', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  try {
    const response = await moonRequest('/api/internal/security', {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-security] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro de seguridad' });
  }
});

router.get('/security/evidence', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  try {
    const response = await moonRequest('/api/internal/security/evidence');
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-evidence] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo generar el paquete de evidencias' });
  }
});

router.all('/editorial', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  try {
    const response = await moonRequest('/api/internal/editorial', {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-editorial] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro editorial' });
  }
});

router.all('/ai-center', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  try {
    const response = await moonRequest('/api/internal/ai-center', { method: req.method, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-ai] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro de IA' });
  }
});

router.all('/automations', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest('/api/internal/automations', {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-automations] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro de automatizaciones' });
  }
});

router.all('/integrations', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest('/api/internal/integrations', { method: req.method, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-integrations] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro de integraciones' });
  }
});

router.all('/operations', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest('/api/internal/operations', { method: req.method, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-operations] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el centro de operaciones' });
  }
});

router.all('/experience', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest('/api/internal/experience', { method: req.method, body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-experience] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron sincronizar las preferencias' });
  }
});

export default router;
