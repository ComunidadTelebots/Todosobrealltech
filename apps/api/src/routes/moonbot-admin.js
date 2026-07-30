import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator } from './stats.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import { createAccountRecoveryPlan } from '../utils/accountRecovery.js';
import { detectAccountAnomalies } from '../utils/accountAnomalies.js';
import { createRoleApproval, decideRoleApproval } from '../utils/accountApprovals.js';

const router = express.Router();
const MOONBOT_INTERNAL_URL = (process.env.MOONBOT_INTERNAL_URL || process.env.MOONBOT_PUBLIC_URL || 'https://cintiabot.todosobreall.tech').replace(/\/$/, '');
const SECURITY_IMAGE_CATEGORIES = [
  'terrorism',
  'childSexual',
  'violence',
  'weapons',
  'selfHarm',
  'drugs',
  'hateSpeech',
  'sexualContent',
  'nudity',
  'malware',
  'fraud',
  'spam',
  'illicitContent',
  'copyright',
  'deepfake',
];
const SECURITY_ACTIONS = ['ban', 'mute', 'review', 'warn'];
const SECURITY_PROVIDERS = ['vt', 'safe_search', 'local', 'ensemble'];
const CACHE_TTL_MS = 15 * 1000;
let cache = null;
let cacheAt = 0;
const roadmapCache = new Map();
const QUICK_ACTIONS_FILE = '/data/quick-actions-log.json';
const QUICK_ACTIONS_MAX = 40;
const QUICK_ACTIONS_ALLOWED = new Set([
  'refresh_dashboard',
  'open_roadmap',
  'export_pending',
  'create_campaign',
  'open_groups_overview',
  'open_webapp_admin',
]);

const getRoadmapCatalog = async () => {
  const cacheKey = 'roadmap-v1';
  const cached = roadmapCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;

  const filePath = path.resolve(process.cwd(), 'data/future-features-1000.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const catalog = JSON.parse(raw);
  const summary = {
    total: catalog.total || catalog.items?.length || 0,
    implemented: catalog.implemented || 0,
    scaffolded: catalog.scaffolded || 0,
    specified: catalog.specified || 0,
    proposed: catalog.proposed || 0,
    remaining_real: catalog.remaining_real || 0,
    verified_percent: catalog.verified_percent || 0,
  };
  const byProduct = {};
  for (const item of catalog.items || []) {
    byProduct[item.product] ||= { total: 0, implemented: 0, proposed: 0, scaffolded: 0, specified: 0 };
    byProduct[item.product].total += 1;
    if (item.status in byProduct[item.product]) byProduct[item.product][item.status] += 1;
  }
  const completed = (catalog.items || []).filter((item) => item.status === 'implemented');
  const preview = completed
    .sort((a, b) => Number(String(b.id).replace('future-', '')) - Number(String(a.id).replace('future-', '')))
    .slice(0, 12);

  const next = (catalog.items || []).filter((item) => item.status === 'proposed').slice(0, 12);
  const payload = {
    summary,
    byProduct,
    implementedPreview: preview,
    proposedPreview: next,
    generated_at: catalog.generated_at || null,
    version: catalog.version || 'roadmap',
  };
  roadmapCache.set(cacheKey, { at: Date.now(), value: payload });
  return payload;
};

const readQuickActions = async () => {
  try {
    const raw = await fs.readFile(QUICK_ACTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const appendQuickAction = async (entry) => {
  const existing = await readQuickActions();
  const next = [entry, ...existing].slice(0, QUICK_ACTIONS_MAX);
  await fs.writeFile(QUICK_ACTIONS_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
};

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const sanitizeImagePolicy = (raw = {}) => {
  const source = raw.image_policy || {};
  const videoSource = raw.video_policy || raw.media_policy || {};
  const categories = source.categories || {};
  const sanitizedCategories = SECURITY_IMAGE_CATEGORIES.reduce((acc, key) => {
    acc[key] = Boolean(categories[key]);
    return acc;
  }, {});
  const mediaKinds = Array.isArray(videoSource.media_kinds) ? videoSource.media_kinds : [];
  const includeVideos = Boolean(videoSource.scan_videos || mediaKinds.includes('video'));

  return {
    ...raw,
    image_policy: {
      ...source,
      enabled: Boolean(source.enabled),
      action: SECURITY_ACTIONS.includes(source.action) ? source.action : 'review',
      provider: SECURITY_PROVIDERS.includes(source.provider) ? source.provider : 'ensemble',
      min_confidence: clampNumber(source.min_confidence ?? source.minConfidence, 0, 100, 75),
      auto_delete: Boolean(source.auto_delete || source.autoDelete),
      categories: sanitizedCategories,
      scan_videos: Boolean(source.scan_videos || includeVideos),
    },
    video_policy: {
      enabled: Boolean(source.enabled),
      scan_videos: Boolean(source.scan_videos || includeVideos),
      action: SECURITY_ACTIONS.includes(source.action) ? source.action : 'review',
      provider: SECURITY_PROVIDERS.includes(source.provider) ? source.provider : 'ensemble',
      min_confidence: clampNumber(source.min_confidence ?? source.minConfidence, 0, 100, 75),
      auto_delete: Boolean(source.auto_delete || source.autoDelete),
      categories: sanitizedCategories,
      media_kinds: ['image', 'photo', ...(source.scan_videos || includeVideos ? ['video'] : [])],
    },
    media_policy: {
      enabled: Boolean(source.enabled),
      scan_videos: Boolean(source.scan_videos || includeVideos),
      action: SECURITY_ACTIONS.includes(source.action) ? source.action : 'review',
      provider: SECURITY_PROVIDERS.includes(source.provider) ? source.provider : 'ensemble',
      min_confidence: clampNumber(source.min_confidence ?? source.minConfidence, 0, 100, 75),
      auto_delete: Boolean(source.auto_delete || source.autoDelete),
      categories: sanitizedCategories,
      media_kinds: ['image', 'photo', ...(source.scan_videos || includeVideos ? ['video'] : [])],
    },
  };
};

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
const accountApprovalsFile = '/data/account-role-approvals.json';
router.all('/account-tools/approvals', async (req, res) => {
  const auth = await authorizeAdminOrCreator(req);
  if (auth.error) {
    if (auth.retryAfter) res.set('Retry-After', String(auth.retryAfter));
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }
  let approvals = [];
  try { approvals = JSON.parse(await fs.readFile(accountApprovalsFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') return res.status(500).json({ ok: false, error: 'No se pudo leer aprobaciones' }); }
  if (req.method === 'GET') return res.json({ ok: true, approvals: approvals.slice(-200).reverse() });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    if (req.body?.action === 'request') {
      const account = await pocketbaseClient.collection('users').getOne(String(req.body?.account_id || ''));
      if (approvals.some((item) => item.status === 'pending' && item.account_id === account.id)) {
        return res.status(409).json({ ok: false, error: 'La cuenta ya tiene una solicitud pendiente' });
      }
      const approval = createRoleApproval({ accountId: account.id, currentRole: account.role,
        requestedRole: req.body?.role, requester: auth.user });
      approvals.push(approval);
      await fs.writeFile(accountApprovalsFile, JSON.stringify(approvals.slice(-1000)), { mode: 0o600 });
      return res.status(201).json({ ok: true, approval });
    }
    if (req.body?.action === 'decide') {
      const index = approvals.findIndex((item) => item.id === req.body?.approval_id);
      const decided = decideRoleApproval(approvals[index], auth.user, req.body?.decision);
      if (decided.status === 'approved') {
        const account = await pocketbaseClient.collection('users').getOne(decided.account_id);
        if (account.role === 'creator') return res.status(409).json({ ok: false, error: 'La cuenta creator está protegida' });
        await pocketbaseClient.collection('users').update(decided.account_id, { role: decided.change.after });
      }
      approvals[index] = decided;
      await fs.writeFile(accountApprovalsFile, JSON.stringify(approvals.slice(-1000)), { mode: 0o600 });
      return res.json({ ok: true, approval: decided });
    }
    return res.status(400).json({ ok: false, error: 'Acción no válida' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});
router.get('/account-tools/anomalies', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const [users, proxies] = await Promise.all([
      pocketbaseClient.collection('users').getFullList({ sort: '-created' }),
      pocketbaseClient.collection('user_proxies').getFullList({ sort: '-updated' }),
    ]);
    const anomalies = detectAccountAnomalies(users, proxies);
    return res.json({ ok: true, anomalies, checked_at: new Date().toISOString(),
      summary: { total: anomalies.length, critical: anomalies.filter((item) => item.severity === 'critical').length } });
  } catch (error) {
    logger.error(`[moonbot-admin] Detección de anomalías falló: ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron analizar las cuentas' });
  }
});
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

router.post('/account-tools/recover', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  let rows = [];
  try {
    rows = JSON.parse(await fs.readFile(accountHistoryFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') return res.status(500).json({ ok: false, error: 'No se pudo leer el historial' });
  }
  const event = rows.find((item) => item.id === req.body?.event_id);
  if (!event || !event.before || event.action === 'delete') {
    return res.status(404).json({ ok: false, error: 'Evento recuperable no encontrado' });
  }
  const record = await pocketbaseClient.collection('users').getOne(event.account_id);
  let preview;
  try {
    preview = createAccountRecoveryPlan(record, event, req.body?.fields);
  } catch (error) {
    return res.status(error.message.includes('protegida') ? 409 : 400).json({ ok: false, error: error.message });
  }
  if (req.body?.preview !== false) return res.json({ ok: true, preview });
  const updated = await pocketbaseClient.collection('users').update(event.account_id, preview.restore);
  rows.push({
    id: crypto.randomUUID(), account_id: event.account_id, action: 'recovery',
    before: preview.current, after: preview.restore, actor_id: String(req.body?.actor_id || ''),
    source_event_id: event.id, created_at: new Date().toISOString(),
  });
  await fs.writeFile(accountHistoryFile, JSON.stringify(rows.slice(-2000)), { mode: 0o600 });
  return res.json({ ok: true, preview, account: updated });
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
    for (const item of items) {
      try {
        await pocketbaseClient.collection('users').update(item.id, item.before);
      } catch (rollbackError) {
        logger.error(`[moonbot-admin] No se pudo revertir el rol de ${item.id}: ${rollbackError.message}`);
      }
    }
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

async function moonRequest(path, { timeoutMs = 6000, ...options } = {}) {
  const serviceKey = (process.env.MOON_ADMIN_API_KEY || '').trim();
  return fetch(`${MOONBOT_INTERNAL_URL}${path}`, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
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

router.get('/roadmap-summary', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const product = String(req.query.product || 'all');
  try {
    const payload = await getRoadmapCatalog();
    const byProduct = product === 'all' ? payload.byProduct : { [product]: payload.byProduct[product] || { total: 0, implemented: 0, proposed: 0, scaffolded: 0, specified: 0 } };
    return res.json({
      ok: true,
      product,
      generated_at: payload.generated_at,
      summary: payload.summary,
      byProduct,
      implementedPreview: payload.implementedPreview,
      proposedPreview: payload.proposedPreview,
      version: payload.version,
    });
  } catch (error) {
    logger.warn(`[moonbot-admin roadmap-summary] ${error.message}`);
    return res.status(500).json({ ok: false, error: 'No se pudo leer el catálogo de roadmap' });
  }
});

router.get('/quick-actions', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const entries = await readQuickActions();
    return res.json({ ok: true, actions: entries });
  } catch (error) {
    logger.warn(`[moonbot-admin quick-actions] ${error.message}`);
    return res.status(500).json({ ok: false, error: 'No se pudieron leer las acciones rápidas' });
  }
});

router.post('/quick-actions', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const action = String(req.body?.action || '').trim();
  const details = String(req.body?.details || '');
  if (!QUICK_ACTIONS_ALLOWED.has(action)) return res.status(400).json({ ok: false, error: 'Acción rápida no permitida' });
  if (details.length > 500) return res.status(400).json({ ok: false, error: 'Detalles demasiado largos' });
  try {
    const entry = {
      id: crypto.randomUUID(),
      action,
      details: details || null,
      actor_id: String(req.user?.id || req.user?.sub || 'system'),
      created_at: new Date().toISOString(),
      status: 'registered',
    };
    const entries = await appendQuickAction(entry);
    return res.json({ ok: true, action: entry, actions: entries.slice(0, 10) });
  } catch (error) {
    logger.warn(`[moonbot-admin quick-actions create] ${error.message}`);
    return res.status(500).json({ ok: false, error: 'No se pudo registrar la acción rápida' });
  }
});

router.get('/groups', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const query = String(req.query.q || '').slice(0, 100);
  const botId = String(req.query.bot_id || '').slice(0, 100);
  const type = ['group', 'channel'].includes(req.query.type) ? req.query.type : 'all';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.max(10, Math.min(100, Number.parseInt(req.query.per_page, 10) || 40));
  try {
    const response = await moonRequest(`/api/internal/groups?q=${encodeURIComponent(query)}&bot_id=${encodeURIComponent(botId)}&type=${type}&page=${page}&per_page=${perPage}`);
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

router.get('/groups/:id/media/:fileId', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const cid = String(req.params.id || '');
  const fileId = String(req.params.fileId || '');
  if (!/^-\d+$/.test(cid) || !fileId || fileId.length > 300 || fileId.includes('/')) {
    return res.status(400).json({ ok: false, error: 'Archivo no válido' });
  }
  try {
    const response = await moonRequest(`/api/internal/groups/${encodeURIComponent(cid)}/media/${encodeURIComponent(fileId)}`, {
      timeoutMs: 15000,
      headers: { Accept: '*/*' },
    });
    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'Archivo no disponible' });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Archivo demasiado grande' });
    res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.set('Cache-Control', 'private, max-age=1800');
    const disposition = response.headers.get('content-disposition');
    if (disposition) res.set('Content-Disposition', disposition);
    return res.send(bytes);
  } catch (error) {
    logger.warn(`[moonbot-group-media] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo cargar el archivo de Telegram' });
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

router.all('/groups/:id/rss', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const cid = String(req.params.id || '');
  if (!/^-\d+$/.test(cid)) return res.status(400).json({ ok: false, error: 'ID de grupo no válido' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest(`/api/internal/groups/${encodeURIComponent(cid)}/rss`, {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      timeoutMs: req.body?.action === 'test' ? 15000 : 6000,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-group-rss] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron consultar las fuentes RSS' });
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
      body: req.method === 'POST'
        ? JSON.stringify(
          req.body?.action === 'set_image_policy' ? sanitizeImagePolicy(req.body || {}) : (req.body || {}),
        )
        : undefined,
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

router.all('/horizon', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest('/api/internal/horizon', {
      method: req.method,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      timeoutMs: 15000,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-horizon] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el Horizonte unificado' });
  }
});

router.all('/horizon/:slug', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  try {
    const response = await moonRequest(`/api/internal/horizon/features/${encodeURIComponent(req.params.slug)}`, {
      method: req.method,
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}),
      timeoutMs: 15000,
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    logger.warn(`[moonbot-horizon-feature] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo ejecutar la función del Horizonte' });
  }
});

router.post('/roadmap/action', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  if (!serviceConfig(res)) return;
  const allowed = new Set(['rule_impact', 'library', 'report_schedule', 'translation', 'public_announcement', 'incident_correlation']);
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
