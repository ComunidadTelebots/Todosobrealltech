import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator } from './stats.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';

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

const accountHistoryFile = '/data/account-change-history.json';
const accountBulkFile = '/data/account-bulk-transactions.json';
router.all('/account-tools/history', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  let rows = [];
  try { rows = JSON.parse(await fs.readFile(accountHistoryFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') return res.status(500).json({ ok: false, error: 'No se pudo leer el historial' }); }
  if (req.method === 'GET') return res.json({ ok: true, history: rows.slice(-200).reverse() });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
  const event = req.body || {};
  if (!['role', 'freeze', 'delete'].includes(event.action) || !String(event.account_id || '').match(/^[a-z0-9]+$/i)) return res.status(400).json({ ok: false, error: 'Evento no válido' });
  rows.push({ id: crypto.randomUUID(), account_id: String(event.account_id), action: event.action,
    before: event.before ?? null, after: event.after ?? null, actor_id: String(event.actor_id || ''), created_at: new Date().toISOString() });
  await fs.writeFile(accountHistoryFile, JSON.stringify(rows.slice(-2000)), { mode: 0o600 });
  return res.json({ ok: true });
});

router.post('/account-tools/bulk', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const operation = req.body?.operation;
  let transactions = [];
  try { transactions = JSON.parse(await fs.readFile(accountBulkFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') return res.status(500).json({ ok: false, error: 'No se pudo leer el registro transaccional' }); }
  if (operation === 'undo') {
    const transaction = transactions.find((item) => item.id === req.body?.transaction_id && item.status === 'applied');
    if (!transaction) return res.status(404).json({ ok: false, error: 'Transacción reversible no encontrada' });
    for (const item of transaction.items) await pocketbaseClient.collection('users').update(item.id, { role: item.before.role });
    transaction.status = 'undone'; transaction.undone_at = new Date().toISOString();
    await fs.writeFile(accountBulkFile, JSON.stringify(transactions.slice(-200)), { mode: 0o600 });
    return res.json({ ok: true, transaction });
  }
  const ids = [...new Set(req.body?.account_ids || [])].filter((id) => /^[a-z0-9]+$/i.test(id)).slice(0, 50);
  const role = String(req.body?.role || '');
  if (!ids.length || !['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ ok: false, error: 'Selección o rol no válidos' });
  const items = [];
  try {
    for (const id of ids) { const record = await pocketbaseClient.collection('users').getOne(id); if (record.role === 'creator') throw new Error('creator protegido'); items.push({ id, before: { role: record.role }, after: { role } }); }
    for (const item of items) await pocketbaseClient.collection('users').update(item.id, item.after);
  } catch (error) {
    for (const item of items) { try { await pocketbaseClient.collection('users').update(item.id, item.before); } catch {} }
    return res.status(500).json({ ok: false, error: 'La operación falló y se revirtió' });
  }
  const transaction = { id: crypto.randomUUID(), status: 'applied', items, created_at: new Date().toISOString() };
  transactions.push(transaction); await fs.writeFile(accountBulkFile, JSON.stringify(transactions.slice(-200)), { mode: 0o600 });
  return res.json({ ok: true, transaction });
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

router.get('/groups', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const query = String(req.query.q || '').slice(0, 100);
  const type = ['group', 'channel'].includes(req.query.type) ? req.query.type : 'all';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.max(10, Math.min(100, Number.parseInt(req.query.per_page, 10) || 40));
  try {
    const response = await moonRequest(`/api/internal/groups?q=${encodeURIComponent(query)}&type=${type}&page=${page}&per_page=${perPage}`);
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-groups-list] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron consultar los grupos y canales' });
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

router.get('/groups/:id/photo', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const cid = String(req.params.id || '');
  if (!/^-\d+$/.test(cid)) return res.status(400).json({ ok: false, error: 'ID de grupo no válido' });
  try {
    const response = await moonRequest(`/api/internal/groups/${encodeURIComponent(cid)}/photo`, {
      headers: { Accept: 'image/*' },
    });
    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'Foto no disponible' });
    const contentType = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!contentType.startsWith('image/') || bytes.length > 5 * 1024 * 1024) {
      return res.status(502).json({ ok: false, error: 'Imagen no válida' });
    }
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');
    return res.send(bytes);
  } catch (error) {
    logger.warn(`[moonbot-group-photo] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo cargar la foto del grupo' });
  }
});

router.all('/groups/:id/ads', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const cid = String(req.params.id || '');
  if (!/^-\d+$/.test(cid)) return res.status(400).json({ ok: false, error: 'ID de grupo no válido' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest(`/api/internal/groups/${encodeURIComponent(cid)}/ads`, {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-group-ads] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar las campañas' });
  }
});

router.get('/users', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const query = String(req.query.q || '').slice(0, 100);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.max(10, Math.min(100, Number.parseInt(req.query.per_page, 10) || 50));
  try {
    const response = await moonRequest(`/api/internal/users?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`);
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

router.post('/roadmap/action', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const allowed = new Set(['rule_impact', 'library', 'report_schedule', 'translation', 'public_announcement']);
  const action = String(req.body?.action || '');
  if (!allowed.has(action)) return res.status(400).json({ ok: false, error: 'Acción no permitida' });
  try {
    const response = await moonRequest('/api/internal/roadmap/action', {
      method: 'POST', body: JSON.stringify({ action, data: req.body?.data || {} }),
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-roadmap] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo completar la función avanzada' });
  }
});

export default router;
