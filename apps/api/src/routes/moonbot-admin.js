import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import logger from '../utils/logger.js';
import { authorizeAdminOrCreator, authorizeAuthenticatedUser } from './stats.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import { createAccountRecoveryPlan } from '../utils/accountRecovery.js';
import { detectAccountAnomalies } from '../utils/accountAnomalies.js';
import { decideRoleApproval } from '../utils/accountApprovals.js';
import { compareAccountPeriods, forecastAccounts } from '../utils/accountForecast.js';
import { recommendAccounts } from '../utils/accountRecommendations.js';
import { buildAccountReportSchedule, nextAccountReportRun } from '../utils/accountReportSchedule.js';
import { buildAccountGuidance } from '../utils/accountGuidance.js';
import { addAccountConfigTemplateVersion, createAccountConfigTemplate,
  previewAccountConfigTemplate } from '../utils/accountConfigTemplates.js';
import { simulateAccountBatch } from '../utils/accountSandbox.js';
import { searchAccountsSemantically } from '../utils/accountSemanticSearch.js';
import { createAccountReviewSchedule, nextAccountReviewRun } from '../utils/accountReviewCalendar.js';
import { addAccountAdminComment, createAccountAdminThread,
  transitionAccountAdminThread } from '../utils/accountAdminThreads.js';
import { createAccountMetricsSnapshot, createAccountMetricsState,
  ingestAccountMetricEvent } from '../utils/accountRealtimeMetrics.js';
import { ACCOUNT_WEBHOOK_EVENTS, createAccountWebhook, createAccountWebhookPayload,
  isPrivateAccountWebhookAddress, prepareAccountWebhookDelivery } from '../utils/accountWebhooks.js';
import { canUseFeatureInGroup, canUseMoonbotFeature, filterMoonbotFeatures,
  moonRoleFor, normalizeFeatureGroups, normalizeReleaseChannel } from '../utils/moonbotFeatureAccess.js';
import { canElevateWebRole, createAdminInvite, createTelegramVerification, hashAdminInviteToken,
  normalizeGroupDelegation, normalizeTelegramClaim, normalizeWebAdminProfile, publicAdminInvite, WEB_ADMIN_PROFILES, WEB_ADMIN_ROLES } from '../utils/webAdminInvites.js';

const router = express.Router();
const RELEASE_SESSION_COOKIE = 'moon_release_session';
const RELEASE_SESSION_TTL_SECONDS = 600;
const releaseLevel = Object.freeze({ stable: 0, rc: 1, beta: 2, alpha: 3 });
const RELEASE_CHANNELS = new Set(['stable', 'rc', 'beta', 'alpha']);
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
const webAdminInvitesFile = '/data/web-admin-invitations.json';
const webAdminVerificationsFile = '/data/web-admin-verifications.json';
const webAdminProfilesFile = '/data/web-admin-profiles.json';
const accountReportSchedulesFile = '/data/account-report-schedules.json';
const accountReportsDirectory = '/data/account-reports';
const accountWebhooksFile = '/data/account-webhooks.json';
const accountTemplatesFile = '/data/account-config-templates.json';
const accountReviewSchedulesFile = '/data/account-review-schedules.json';
const accountAdminThreadsFile = '/data/account-admin-threads.json';
let accountMetricsState = createAccountMetricsState();
let webAdminInviteMutation = Promise.resolve();

const readWebAdminInvites = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(webAdminInvitesFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};
const mutateWebAdminInvites = (operation) => {
  const pending = webAdminInviteMutation.then(async () => {
    const records = await readWebAdminInvites();
    const result = await operation(records);
    await fs.writeFile(webAdminInvitesFile, JSON.stringify(records.slice(-1000), null, 2), { mode: 0o600 });
    return result;
  });
  webAdminInviteMutation = pending.catch(() => {});
  return pending;
};
const readWebAdminVerifications = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(webAdminVerificationsFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};
const readWebAdminProfiles = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(webAdminProfilesFile, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
};
const assignWebAdminProfile = async (accountId, profile, actorId, groupScope = 'none', groupIds = []) => {
  const profiles = await readWebAdminProfiles();
  const key = String(accountId || '');
  const groupDelegation = normalizeGroupDelegation(groupScope, groupIds);
  profiles[key] = { account_id: key, profile: normalizeWebAdminProfile(profile), enabled: true,
    group_scope: groupDelegation.scope, group_ids: groupDelegation.group_ids,
    assigned_by: String(actorId || ''), updated_at: new Date().toISOString() };
  await fs.writeFile(webAdminProfilesFile, JSON.stringify(profiles, null, 2), { mode: 0o600 });
  return profiles[key];
};
const writeWebAdminVerifications = (records) => fs.writeFile(webAdminVerificationsFile,
  JSON.stringify(records.slice(-2000), null, 2), { mode: 0o600 });
const appendAccountHistory = async (entry) => {
  let rows = [];
  try { rows = JSON.parse(await fs.readFile(accountHistoryFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  rows.push({ id: crypto.randomUUID(), ...entry, created_at: new Date().toISOString() });
  await fs.writeFile(accountHistoryFile, JSON.stringify(rows.slice(-2000), null, 2), { mode: 0o600 });
};

const readAccountTemplates = async () => {
  try { return JSON.parse(await fs.readFile(accountTemplatesFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};

const readAccountReviewSchedules = async () => {
  try { return JSON.parse(await fs.readFile(accountReviewSchedulesFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};

const readAccountAdminThreads = async () => {
  try { return JSON.parse(await fs.readFile(accountAdminThreadsFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};

const recordAccountMetric = (type, dimensions = {}) => {
  try {
    accountMetricsState = ingestAccountMetricEvent(accountMetricsState, {
      id: crypto.randomUUID(), type, timestamp: new Date().toISOString(), ...dimensions,
    });
  } catch (error) { logger.warn(`[account-metrics] ${error.message}`); }
};

const readAccountWebhooks = async () => {
  try { return JSON.parse(await fs.readFile(accountWebhooksFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};

const publicAccountWebhook = ({ secret, ...webhook }) => ({ ...webhook, secret_configured: Boolean(secret) });

const dispatchAccountWebhookEvent = async (event, account, data = {}, onlyWebhookId = '') => {
  const webhooks = await readAccountWebhooks();
  let changed = false;
  for (const webhook of webhooks.filter((item) => onlyWebhookId ? item.id === onlyWebhookId : (item.active && item.events.includes(event)))) {
    try {
      const url = new URL(webhook.url);
      const addresses = await dns.lookup(url.hostname, { all: true });
      if (!addresses.length || addresses.some((item) => isPrivateAccountWebhookAddress(item.address))) {
        throw new Error('El DNS del webhook resolvió a una red privada');
      }
      const payload = createAccountWebhookPayload({ id: crypto.randomUUID(), event,
        timestamp: new Date().toISOString(), account: { id: account.id || account.account_id }, data });
      const delivery = prepareAccountWebhookDelivery({ url: webhook.url, secret: webhook.secret, payload });
      const response = await fetch(delivery.url, { method: delivery.method, headers: delivery.headers,
        body: delivery.body, signal: AbortSignal.timeout(5000), redirect: 'error' });
      webhook.last_delivery = { ok: response.ok, status: response.status, at: new Date().toISOString() };
    } catch (error) {
      webhook.last_delivery = { ok: false, error: String(error.message || error).slice(0, 200), at: new Date().toISOString() };
    }
    changed = true;
  }
  if (changed) await fs.writeFile(accountWebhooksFile, JSON.stringify(webhooks.slice(-100)), { mode: 0o600 });
};

router.get('/account-tools/guidance', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const [users, proxies, approvals] = await Promise.all([
      pocketbaseClient.collection('users').getFullList({ sort: '-created' }),
      pocketbaseClient.collection('user_proxies').getFullList({ sort: '-updated' }),
      fs.readFile(accountApprovalsFile, 'utf8').then(JSON.parse).catch((error) => error.code === 'ENOENT' ? [] : Promise.reject(error)),
    ]);
    const anomalies = detectAccountAnomalies(users, proxies);
    const recommendations = recommendAccounts(users, proxies);
    return res.json({ ok: true, steps: buildAccountGuidance({ anomalies, recommendations, approvals, proxies }) });
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'No se pudo construir el asistente guiado' });
  }
});

router.all('/account-tools/webhooks', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const webhooks = await readAccountWebhooks();
    if (req.method === 'GET') return res.json({ ok: true, events: ACCOUNT_WEBHOOK_EVENTS, webhooks: webhooks.map(publicAccountWebhook) });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    if (req.body?.action === 'create') {
      const draft = req.body.webhook || req.body;
      const id = crypto.randomUUID();
      const valid = createAccountWebhook({ id, url: draft.url, events: draft.events, secret: draft.secret });
      webhooks.push({ ...valid, secret: draft.secret, created_at: new Date().toISOString() });
    } else {
      const index = webhooks.findIndex((item) => item.id === req.body?.webhook_id);
      if (index < 0) return res.status(404).json({ ok: false, error: 'Webhook no encontrado' });
      if (req.body?.action === 'toggle') webhooks[index].active = Boolean(req.body.active ?? req.body.enabled);
      else if (req.body?.action === 'delete') webhooks.splice(index, 1);
      else if (req.body?.action === 'test') {
        await dispatchAccountWebhookEvent(webhooks[index].events[0], { id: 'webhook-test' }, { test: true }, webhooks[index].id);
        const refreshed = await readAccountWebhooks();
        return res.json({ ok: true, webhooks: refreshed.map(publicAccountWebhook) });
      }
      else return res.status(400).json({ ok: false, error: 'Acción no válida' });
    }
    await fs.writeFile(accountWebhooksFile, JSON.stringify(webhooks.slice(-100)), { mode: 0o600 });
    return res.json({ ok: true, webhooks: webhooks.map(publicAccountWebhook) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.all('/account-tools/templates', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const templates = await readAccountTemplates();
    if (req.method === 'GET') return res.json({ ok: true, templates });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    const actor = req.adminUser?.id || req.user?.id || 'admin';
    if (req.body?.action === 'create') {
      const template = createAccountConfigTemplate({ id: crypto.randomUUID(), name: req.body.name,
        description: req.body.description, config: req.body.config, createdBy: actor });
      templates.push(template);
      await fs.writeFile(accountTemplatesFile, JSON.stringify(templates.slice(-100), null, 2), { mode: 0o600 });
      return res.json({ ok: true, templates });
    }
    const index = templates.findIndex((item) => item.id === req.body?.template_id);
    if (index < 0) return res.status(404).json({ ok: false, error: 'Plantilla no encontrada' });
    if (req.body?.action === 'version') {
      templates[index] = addAccountConfigTemplateVersion(templates[index], { config: req.body.config, createdBy: actor });
      await fs.writeFile(accountTemplatesFile, JSON.stringify(templates.slice(-100), null, 2), { mode: 0o600 });
      return res.json({ ok: true, templates });
    }
    if (req.body?.action === 'preview') {
      const account = await pocketbaseClient.collection('users').getOne(String(req.body.account_id || ''));
      return res.json({ ok: true, preview: previewAccountConfigTemplate(templates[index], account, req.body.version) });
    }
    return res.status(400).json({ ok: false, error: 'Acción no válida' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/account-tools/sandbox', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const ids = [...new Set((Array.isArray(req.body?.account_ids) ? req.body.account_ids : []).map(String))].slice(0, 100);
    if (!ids.length) return res.status(400).json({ ok: false, error: 'Selecciona cuentas para el sandbox' });
    const accounts = await Promise.all(ids.map((id) => pocketbaseClient.collection('users').getOne(id)));
    const result = simulateAccountBatch(accounts, req.body.changes);
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/account-tools/semantic-search', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const query = String(req.query.q || '').trim().slice(0, 200);
    if (!query) return res.json({ ok: true, results: [] });
    const [users, proxies] = await Promise.all([
      pocketbaseClient.collection('users').getFullList({ fields: 'id,name,username,email,role,language,verified,is_frozen,status' }),
      pocketbaseClient.collection('user_proxies').getFullList({ fields: 'id,user_id,status' }),
    ]);
    return res.json({ ok: true, results: searchAccountsSemantically(users, query, { proxies, limit: 30 }) });
  } catch {
    return res.status(502).json({ ok: false, error: 'No se pudo realizar la búsqueda semántica' });
  }
});

router.all('/account-tools/reviews', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const schedules = await readAccountReviewSchedules();
    if (req.method === 'GET') return res.json({ ok: true, schedules });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    if (req.body?.action === 'create') {
      const schedule = createAccountReviewSchedule({ ...req.body.schedule, id: crypto.randomUUID() });
      schedules.push(schedule);
    } else {
      const index = schedules.findIndex((item) => item.id === req.body?.schedule_id);
      if (index < 0) return res.status(404).json({ ok: false, error: 'Revisión no encontrada' });
      if (req.body?.action === 'toggle') {
        schedules[index].enabled = Boolean(req.body.enabled);
        schedules[index].next_run = nextAccountReviewRun(schedules[index]);
      } else if (req.body?.action === 'delete') schedules.splice(index, 1);
      else return res.status(400).json({ ok: false, error: 'Acción no válida' });
    }
    await fs.writeFile(accountReviewSchedulesFile, JSON.stringify(schedules.slice(-200), null, 2), { mode: 0o600 });
    return res.json({ ok: true, schedules });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.all('/account-tools/threads', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const threads = await readAccountAdminThreads();
    if (req.method === 'GET') return res.json({ ok: true, threads });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    const users = await pocketbaseClient.collection('users').getFullList({ fields: 'id,username' });
    const actor = req.adminUser;
    if (req.body?.action === 'create') {
      threads.push(createAccountAdminThread({ id: crypto.randomUUID(), accountId: req.body.account_id,
        body: req.body.body, actor, mentionableUsers: users }));
    } else {
      const index = threads.findIndex((item) => item.id === req.body?.thread_id);
      if (index < 0) return res.status(404).json({ ok: false, error: 'Hilo no encontrado' });
      if (req.body?.action === 'comment') {
        threads[index] = addAccountAdminComment(threads[index], { id: crypto.randomUUID(), body: req.body.body,
          actor, mentionableUsers: users });
      } else if (['resolve', 'reopen'].includes(req.body?.action)) {
        threads[index] = transitionAccountAdminThread(threads[index], { action: req.body.action, actor });
      } else return res.status(400).json({ ok: false, error: 'Acción no válida' });
    }
    await fs.writeFile(accountAdminThreadsFile, JSON.stringify(threads.slice(-500), null, 2), { mode: 0o600 });
    return res.json({ ok: true, threads });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/account-tools/realtime-metrics', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const windowMs = Math.max(60_000, Math.min(31 * 86400000, Number(req.query.window_ms) || 3600000));
    return res.json({ ok: true, snapshot: createAccountMetricsSnapshot(accountMetricsState, { window_ms: windowMs }) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

const readAccountReportSchedules = async () => {
  try { return JSON.parse(await fs.readFile(accountReportSchedulesFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
};

const generateAccountReport = async (schedule) => {
  const [users, proxies] = await Promise.all([
    pocketbaseClient.collection('users').getFullList({ fields: 'id,role,verified,is_frozen,created' }),
    pocketbaseClient.collection('user_proxies').getFullList({ fields: 'id,user_id,status,created' }),
  ]);
  const generatedAt = new Date().toISOString();
  const summary = { users: users.length, verified: users.filter((item) => item.verified).length,
    frozen: users.filter((item) => item.is_frozen).length, admins: users.filter((item) => item.role === 'admin').length,
    proxies: proxies.length, inactive_proxies: proxies.filter((item) => item.status !== 'active').length };
  const stamp = generatedAt.replaceAll(/[:.]/g, '-');
  const filename = `${schedule.id}-${stamp}.${schedule.format}`;
  await fs.mkdir(accountReportsDirectory, { recursive: true, mode: 0o700 });
  const content = schedule.format === 'csv'
    ? `metric,value\n${Object.entries(summary).map(([key, value]) => `${key},${value}`).join('\n')}\n`
    : JSON.stringify({ generated_at: generatedAt, summary }, null, 2);
  await fs.writeFile(path.join(accountReportsDirectory, filename), content, { mode: 0o600 });
  return { filename, generated_at: generatedAt, summary };
};

const processDueAccountReports = async () => {
  const schedules = await readAccountReportSchedules();
  let changed = false;
  for (const schedule of schedules) {
    if (!schedule.enabled || new Date(schedule.next_run) > new Date()) continue;
    const report = await generateAccountReport(schedule);
    schedule.last_report = report;
    schedule.last_run = report.generated_at;
    schedule.next_run = nextAccountReportRun(schedule, new Date(Date.now() + 60000));
    changed = true;
  }
  if (changed) await fs.writeFile(accountReportSchedulesFile, JSON.stringify(schedules.slice(-100)), { mode: 0o600 });
};

const accountReportTimer = setInterval(() => processDueAccountReports().catch((error) => {
  logger.error(`[moonbot-admin] Informes programados fallaron: ${error.message}`);
}), 60000);
accountReportTimer.unref?.();

router.get('/account-tools/recommendations', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const [users, proxies] = await Promise.all([
      pocketbaseClient.collection('users').getFullList({ sort: '-created' }),
      pocketbaseClient.collection('user_proxies').getFullList({ sort: '-updated' }),
    ]);
    return res.json({ ok: true, recommendations: recommendAccounts(users, proxies).slice(0, 100), checked_at: new Date().toISOString() });
  } catch (error) {
    logger.error(`[moonbot-admin] Recomendaciones de cuentas fallaron: ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron calcular recomendaciones' });
  }
});

router.get('/account-tools/reports/:filename', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const schedules = await readAccountReportSchedules();
  const filename = String(req.params.filename || '');
  if (!schedules.some((item) => item.last_report?.filename === filename) || path.basename(filename) !== filename) {
    return res.status(404).json({ ok: false, error: 'Informe no encontrado' });
  }
  return res.download(path.join(accountReportsDirectory, filename));
});

router.all('/account-tools/reports', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const schedules = await readAccountReportSchedules();
    if (req.method === 'GET') return res.json({ ok: true, schedules: schedules.slice().reverse() });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    if (req.body?.action === 'save') {
      const built = buildAccountReportSchedule(req.body.schedule);
      const schedule = { id: crypto.randomUUID(), ...built, enabled: true, created_at: new Date().toISOString() };
      schedules.push(schedule);
      await fs.writeFile(accountReportSchedulesFile, JSON.stringify(schedules.slice(-100)), { mode: 0o600 });
      return res.status(201).json({ ok: true, schedule });
    }
    const schedule = schedules.find((item) => item.id === req.body?.schedule_id);
    if (!schedule) return res.status(404).json({ ok: false, error: 'Programación no encontrada' });
    if (req.body?.action === 'toggle') schedule.enabled = Boolean(req.body.enabled);
    else if (req.body?.action === 'run_now') { schedule.last_report = await generateAccountReport(schedule); schedule.last_run = schedule.last_report.generated_at; }
    else return res.status(400).json({ ok: false, error: 'Acción no válida' });
    await fs.writeFile(accountReportSchedulesFile, JSON.stringify(schedules.slice(-100)), { mode: 0o600 });
    return res.json({ ok: true, schedule });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});
router.get('/account-tools/forecast', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const users = await pocketbaseClient.collection('users').getFullList({ sort: '-created', fields: 'id,created' });
    return res.json({ ok: true, forecast: forecastAccounts(users), checked_at: new Date().toISOString() });
  } catch (error) {
    logger.error(`[moonbot-admin] Previsión de cuentas falló: ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo calcular la previsión' });
  }
});
router.get('/account-tools/compare', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const users = await pocketbaseClient.collection('users').getFullList({ sort: '-created', fields: 'id,created' });
    return res.json({ ok: true, comparison: compareAccountPeriods(users, req.query.days), checked_at: new Date().toISOString() });
  } catch (error) {
    logger.error(`[moonbot-admin] Comparación de cuentas falló: ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo comparar el periodo' });
  }
});

router.get('/web-admin-invitations/inspect', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' });
  const token = String(req.query.token || '');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return res.status(404).json({ ok: false, error: 'Invitación no válida' });
  try {
    const record = (await readWebAdminInvites()).find((item) => item.token_hash === hashAdminInviteToken(token));
    const invitation = record ? publicAdminInvite(record) : null;
    if (!invitation?.valid) return res.status(410).json({ ok: false, error: 'La invitación ha caducado, fue revocada o agotó sus usos' });
    return res.json({ ok: true, invitation });
  } catch (error) {
    logger.error(`[web-admin-invitations] inspección falló: ${error.message}`);
    return res.status(503).json({ ok: false, error: 'Servicio de invitaciones no disponible' });
  }
});

router.post('/web-admin-invitations/redeem', express.json({ limit: '8kb' }), async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const token = String(req.body?.token || '');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return res.status(400).json({ ok: false, error: 'Invitación no válida' });
  try {
    normalizeTelegramClaim(req.body?.telegram);
    const result = await mutateWebAdminInvites((records) => {
      const record = records.find((item) => item.token_hash === hashAdminInviteToken(token));
      const invitation = record ? publicAdminInvite(record) : null;
      if (!invitation?.valid) throw new Error('La invitación ha caducado, fue revocada o agotó sus usos');
      if (auth.user.role === 'creator') throw new Error('La cuenta master ya tiene el nivel máximo');
      if (!canElevateWebRole(auth.user.role, record.role)) throw new Error('La cuenta ya tiene este nivel administrativo o uno superior');
      record.uses = Number(record.uses || 0) + 1;
      record.used_by = [...new Set([...(record.used_by || []), auth.user.id])].slice(-25);
      record.last_used_at = new Date().toISOString();
      if (record.uses >= Number(record.max_uses || 1)) record.enabled = false;
      return { role: record.role, profile: normalizeWebAdminProfile(record.profile),
        group_scope: record.group_scope || 'none', group_ids: record.group_ids || [], invitation_id: record.id };
    });
    const verification = createTelegramVerification({ accountId: auth.user.id, role: result.role, profile: result.profile,
      claim: req.body?.telegram, invitationId: result.invitation_id });
    verification.record.group_scope = result.group_scope; verification.record.group_ids = result.group_ids;
    const verifications = await readWebAdminVerifications();
    for (const item of verifications) {
      if (item.account_id === auth.user.id && item.status === 'pending') item.status = 'superseded';
    }
    verifications.push(verification.record);
    await writeWebAdminVerifications(verifications);
    const bot = String(process.env.WEB_ADMIN_VERIFY_BOT_USERNAME || 'CintiaBot').replace(/^@/, '');
    return res.json({ ok: true, pending_verification: true, role: result.role, profile: result.profile,
      verification_id: verification.record.id, verification_code: verification.code,
      bot_username: bot, expires_at: verification.record.expires_at,
      message: 'Envía el código al bot desde la cuenta de Telegram indicada para activar la administración web' });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/web-admin-verifications/me', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  try {
    const record = (await readWebAdminVerifications()).filter((item) => item.account_id === auth.user.id).at(-1);
    return res.json({ ok: true, verification: record ? { id: record.id, status: record.status,
      role: record.role, profile: normalizeWebAdminProfile(record.profile), expires_at: record.expires_at, verified_at: record.verified_at || null,
      telegram_id: record.telegram_id || null } : null });
  } catch (error) {
    return res.status(503).json({ ok: false, error: 'No se pudo consultar la verificación' });
  }
});

router.post('/web-admin-verifications/confirm', express.json({ limit: '8kb' }), async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' });
  const expected = String(process.env.MOON_ADMIN_API_KEY || '');
  const supplied = String(req.get('X-Moon-Admin-Key') || '');
  if (!expected || !supplied || expected.length < 32 || supplied.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const code = String(req.body?.code || '').trim().toUpperCase();
  const senderId = String(req.body?.telegram_id || '').trim();
  const username = String(req.body?.telegram_username || '').trim().replace(/^@/, '').toLowerCase();
  if (!/^WEB-[A-Z0-9_-]{12}$/.test(code) || !/^[1-9]\d{4,19}$/.test(senderId)) {
    return res.status(400).json({ ok: false, error: 'Datos de verificación no válidos' });
  }
  try {
    const verifications = await readWebAdminVerifications();
    const record = verifications.find((item) => item.status === 'pending' && item.code_hash === hashAdminInviteToken(code));
    if (!record || new Date(record.expires_at).getTime() <= Date.now()) return res.status(410).json({ ok: false, error: 'Código caducado o ya utilizado' });
    const identityMatches = record.telegram_claim_type === 'id' ? record.telegram_claim === senderId : record.telegram_claim === username;
    if (!identityMatches) return res.status(403).json({ ok: false, error: 'El mensaje no procede de la cuenta de Telegram indicada' });
    const account = await pocketbaseClient.collection('users').getOne(record.account_id);
    if (account.telegram_id && String(account.telegram_id) !== senderId) return res.status(409).json({ ok: false, error: 'La cuenta web está vinculada a otro Telegram' });
    if (!canElevateWebRole(account.role, record.role)) return res.status(409).json({ ok: false, error: 'La cuenta ya tiene este nivel o uno superior' });
    const updated = await pocketbaseClient.collection('users').update(record.account_id, {
      role: record.role, telegram_id: senderId, ...(username ? { telegram_username: username } : {}),
    });
    await assignWebAdminProfile(record.account_id, record.profile, `telegram:${senderId}`,
      record.group_scope, record.group_ids);
    record.status = 'verified'; record.verified_at = new Date().toISOString();
    record.telegram_id = senderId; record.telegram_username = username;
    await writeWebAdminVerifications(verifications);
    await appendAccountHistory({ account_id: account.id, action: 'role', actor_id: `telegram:${senderId}`,
      before: { role: account.role }, after: { role: record.role }, invitation_id: record.invitation_id,
      verification_id: record.id, source: 'telegram_verified_invitation' });
    recordAccountMetric('account.role_changed', { role: record.role, source: 'telegram_verified_invitation' });
    return res.json({ ok: true, role: record.role, profile: normalizeWebAdminProfile(record.profile), account_id: updated.id });
  } catch (error) {
    logger.warn(`[web-admin-verifications] ${error.message}`);
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.all('/web-admin-invitations', express.json({ limit: '16kb' }), async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el master puede gestionar accesos web' });
  try {
    if (req.method === 'GET') {
      const invitations = (await readWebAdminInvites()).slice(-200).reverse().map((item) => ({
        ...publicAdminInvite(item), created_at: item.created_at, created_by: item.created_by,
      }));
      const assignments = Object.values(await readWebAdminProfiles());
      return res.json({ ok: true, invitations, roles: WEB_ADMIN_ROLES, profiles: WEB_ADMIN_PROFILES, assignments });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    if (req.body?.action === 'create') {
      const created = createAdminInvite({ role: req.body.role, profile: req.body.profile, expiresHours: Number(req.body.expires_hours || 24),
        maxUses: Number(req.body.max_uses || 1), creatorId: auth.user.id });
      const delegation = normalizeGroupDelegation(req.body.group_scope, req.body.group_ids);
      created.record.group_scope = delegation.scope; created.record.group_ids = delegation.group_ids;
      await mutateWebAdminInvites((records) => { records.push(created.record); return created.record; });
      const base = String(process.env.PUBLIC_WEB_URL || 'https://todosobreall.tech').replace(/\/$/, '');
      return res.status(201).json({ ok: true, invitation: publicAdminInvite(created.record),
        url: `${base}/admin/invite/${created.token}` });
    }
    if (req.body?.action === 'revoke') {
      const invitation = await mutateWebAdminInvites((records) => {
        const record = records.find((item) => item.id === String(req.body.invitation_id || ''));
        if (!record) throw new Error('Invitación no encontrada');
        record.enabled = false;
        record.revoked_at = new Date().toISOString();
        record.revoked_by = auth.user.id;
        return publicAdminInvite(record);
      });
      return res.json({ ok: true, invitation });
    }
    if (req.body?.action === 'elevate') {
      const accountId = String(req.body.account_id || '');
      const role = String(req.body.role || '');
      const reason = String(req.body.reason || '').trim().slice(0, 300);
      if (!reason) return res.status(400).json({ ok: false, error: 'Indica el motivo de la elevación' });
      if (accountId === auth.user.id) return res.status(400).json({ ok: false, error: 'No puedes modificar tu propia cuenta' });
      const account = await pocketbaseClient.collection('users').getOne(accountId);
      if (!canElevateWebRole(account.role, role)) return res.status(400).json({ ok: false, error: 'La elevación solicitada no aumenta el nivel actual' });
      const claim = req.body.telegram || account.telegram_id || account.telegram_username;
      const verification = createTelegramVerification({ accountId, role, profile: req.body.profile, claim, invitationId: `master:${auth.user.id}` });
      const delegation = normalizeGroupDelegation(req.body.group_scope, req.body.group_ids);
      verification.record.group_scope = delegation.scope; verification.record.group_ids = delegation.group_ids;
      verification.record.requested_by = auth.user.id; verification.record.reason = reason;
      const verifications = await readWebAdminVerifications();
      for (const item of verifications) {
        if (item.account_id === accountId && item.status === 'pending') item.status = 'superseded';
      }
      verifications.push(verification.record);
      await writeWebAdminVerifications(verifications);
      const bot = String(process.env.WEB_ADMIN_VERIFY_BOT_USERNAME || 'CintiaBot').replace(/^@/, '');
      return res.json({ ok: true, pending_verification: true, verification_code: verification.code,
        profile: verification.record.profile, bot_username: bot, expires_at: verification.record.expires_at,
        message: 'Elevación pendiente: el usuario debe verificar su Telegram con el bot' });
    }
    if (req.body?.action === 'set_profile') {
      const accountId = String(req.body.account_id || '');
      if (!accountId || accountId === auth.user.id) return res.status(400).json({ ok: false, error: 'Cuenta no válida' });
      const account = await pocketbaseClient.collection('users').getOne(accountId);
      if (account.role !== 'admin') return res.status(400).json({ ok: false, error: 'La cuenta todavía no es administradora web' });
      if (!account.telegram_id) return res.status(400).json({ ok: false, error: 'La cuenta debe verificar primero su Telegram' });
      const assignment = await assignWebAdminProfile(accountId, req.body.profile, auth.user.id,
        req.body.group_scope, req.body.group_ids);
      await appendAccountHistory({ account_id: accountId, action: 'web_admin_profile', actor_id: auth.user.id,
        after: { profile: assignment.profile }, source: 'master_profile_assignment' });
      return res.json({ ok: true, assignment });
    }
    return res.status(400).json({ ok: false, error: 'Acción no válida' });
  } catch (error) {
    logger.warn(`[web-admin-invitations] ${error.message}`);
    return res.status(400).json({ ok: false, error: error.message });
  }
});

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
      return res.status(410).json({ ok: false, error: 'Las nuevas elevaciones requieren invitación y verificación por Telegram' });
    }
    if (req.body?.action === 'decide') {
      if (req.body?.decision === 'approved') return res.status(410).json({ ok: false,
        error: 'La aprobación antigua no verifica Telegram; crea una invitación administrativa nueva' });
      const index = approvals.findIndex((item) => item.id === req.body?.approval_id);
      const decided = decideRoleApproval(approvals[index], auth.user, req.body?.decision);
      if (decided.status === 'approved') {
        const account = await pocketbaseClient.collection('users').getOne(decided.account_id);
        if (account.role === 'creator') return res.status(409).json({ ok: false, error: 'La cuenta creator está protegida' });
        await pocketbaseClient.collection('users').update(decided.account_id, { role: decided.change.after });
        dispatchAccountWebhookEvent('account.role_changed', { id: decided.account_id }, {
          before: decided.change.before, after: decided.change.after, approval_id: decided.id,
        }).catch((error) => logger.warn(`[moonbot-admin] Webhook de rol falló: ${error.message}`));
        recordAccountMetric('account.role_changed', { role: decided.change.after });
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
  const webhookEvent = event.action === 'role' ? 'account.role_changed' : event.action === 'freeze' ? 'account.frozen' : null;
  if (webhookEvent) dispatchAccountWebhookEvent(webhookEvent, { id: event.account_id }, {
    before: event.before, after: event.after,
  }).catch((error) => logger.warn(`[moonbot-admin] Webhook de cuenta falló: ${error.message}`));
  if (webhookEvent) recordAccountMetric(webhookEvent, webhookEvent === 'account.role_changed' ? { role: event.after?.role } : {});
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
  dispatchAccountWebhookEvent('account.recovered', { id: event.account_id }, {
    before: preview.current, after: preview.restore, source_event_id: event.id,
  }).catch((error) => logger.warn(`[moonbot-admin] Webhook de recuperación falló: ${error.message}`));
  recordAccountMetric('account.recovered');
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
  if (!auth.error) { req.adminUser = auth.user; return true; }
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

const releaseChannelForUser = async (user, actorRole) => {
  if (actorRole === 'master') return 'alpha';
  const accountId = String(user?.id || '');
  const telegramId = String(user?.telegram_id || '');
  if (!/^[a-z0-9]+$/i.test(accountId) || !/^\d+$/.test(telegramId)) return 'stable';
  try {
    const record = await pocketbaseClient.collection('feature_release_access').getFirstListItem(
      `account_id="${accountId}" && telegram_id="${telegramId}" && enabled=true`,
    );
    return normalizeReleaseChannel(record.release_channel);
  } catch {
    return 'stable';
  }
};

const releaseCookieHeader = (value, maxAge = RELEASE_SESSION_TTL_SECONDS) => {
  const domain = String(process.env.RELEASE_COOKIE_DOMAIN || '.todosobreall.tech').trim();
  if (!/^\.?[a-z0-9.-]+$/i.test(domain)) throw new Error('Dominio de cookie de releases no válido');
  return `${RELEASE_SESSION_COOKIE}=${value}; Domain=${domain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
};
const releaseSessionSecret = () => String(process.env.RELEASE_FORWARD_AUTH_SECRET || '').trim();
const signReleaseSession = (payload) => {
  const secret = releaseSessionSecret();
  if (secret.length < 32) throw new Error('Release ForwardAuth no configurado');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
};
const verifyReleaseSession = (token) => {
  const secret = releaseSessionSecret();
  if (secret.length < 32 || typeof token !== 'string') return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!RELEASE_CHANNELS.has(String(payload.channel || '')) || !Number.isInteger(payload.iat)
      || !Number.isInteger(payload.exp) || payload.iat > now + 30 || payload.exp <= now
      || payload.exp - payload.iat > RELEASE_SESSION_TTL_SECONDS) return null;
    return payload;
  } catch { return null; }
};
const cookieValue = (req, name) => String(req.headers.cookie || '').split(';').map((part) => part.trim())
  .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';

router.all('/release-session', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization, Cookie' });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', releaseCookieHeader('', 0));
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const actorRole = moonRoleFor(auth.user.role);
  const channel = await releaseChannelForUser(auth.user, actorRole);
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = signReleaseSession({ sub: String(auth.user.id), telegram_id: String(auth.user.telegram_id || ''),
    channel, iat: issuedAt, exp: issuedAt + RELEASE_SESSION_TTL_SECONDS });
  res.setHeader('Set-Cookie', releaseCookieHeader(token));
  return res.json({ ok: true, release_channel: channel, expires_in: RELEASE_SESSION_TTL_SECONDS });
});

router.get('/release-forward-auth/:channel', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Cookie' });
  const required = String(req.params.channel || '').toLowerCase();
  if (!['rc', 'beta', 'alpha'].includes(required)) return res.status(404).end();
  const session = verifyReleaseSession(cookieValue(req, RELEASE_SESSION_COOKIE));
  if (!session || releaseLevel[session.channel] === undefined || releaseLevel[session.channel] < releaseLevel[required]) {
    return res.status(403).json({ ok: false, error: 'Release channel access denied' });
  }
  try {
    const user = await pocketbaseClient.collection('users').getOne(String(session.sub));
    if (user.is_frozen || String(user.telegram_id || '') !== String(session.telegram_id || '')) return res.status(403).end();
    const actorRole = moonRoleFor(user.role);
    const currentChannel = await releaseChannelForUser(user, actorRole);
    if (releaseLevel[currentChannel] < releaseLevel[required]) return res.status(403).end();
    return res.status(204).end();
  } catch (error) {
    logger.warn(`[release-forward-auth] fail closed: ${error.message}`);
    return res.status(503).json({ ok: false, error: 'Authorization backend unavailable' });
  }
});

router.get('/feature-release-access/me', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  const actorRole = moonRoleFor(auth.user.role);
  const releaseChannel = await releaseChannelForUser(auth.user, actorRole);
  return res.json({ ok: true, release_channel: releaseChannel });
});

router.all('/feature-release-access', express.json({ limit: '32kb' }), async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (auth.user.role !== 'creator') return res.status(403).json({ ok: false, error: 'Solo el creador puede asignar canales' });
  if (req.method === 'GET') {
    const records = await pocketbaseClient.collection('feature_release_access').getFullList({ sort: '-updated' });
    return res.json({ ok: true, records });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'MÃ©todo no permitido' });
  const accountId = String(req.body?.account_id || '');
  const channel = String(req.body?.release_channel || '').toLowerCase();
  if (!/^[a-z0-9]+$/i.test(accountId) || !RELEASE_CHANNELS.has(channel)) {
    return res.status(400).json({ ok: false, error: 'Cuenta o canal no vÃ¡lido' });
  }
  const account = await pocketbaseClient.collection('users').getOne(accountId);
  const telegramId = String(account.telegram_id || '');
  if (!/^\d+$/.test(telegramId)) return res.status(409).json({ ok: false, error: 'La cuenta debe vincular primero Telegram' });
  let existing = null;
  try { existing = await pocketbaseClient.collection('feature_release_access').getFirstListItem(`account_id="${accountId}"`); } catch {
    // No previous assignment is the normal path when a release channel is granted for the first time.
  }
  const data = { account_id: accountId, telegram_id: telegramId, release_channel: channel,
    enabled: req.body?.enabled !== false, assigned_by: auth.user.id };
  const record = existing
    ? await pocketbaseClient.collection('feature_release_access').update(existing.id, data)
    : await pocketbaseClient.collection('feature_release_access').create(data);
  return res.json({ ok: true, record });
});

router.get('/features', async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (!serviceConfig(res)) return;
  try {
    const actorRole = moonRoleFor(auth.user.role);
    const actorId = String(auth.user.telegram_id || '');
    const releaseChannel = await releaseChannelForUser(auth.user, actorRole);
    const response = await moonRequest('/api/internal/features', { timeoutMs: 10_000, headers: {
      'X-Moon-Actor-Role': actorRole, 'X-Moon-Actor-Id': actorId, 'X-Moon-Release-Channel': releaseChannel,
    } });
    const payload = await response.json();
    const features = filterMoonbotFeatures(payload.features, actorRole, releaseChannel);
    const groups = normalizeFeatureGroups(payload.groups || payload.allowed_groups);
    return res.status(response.status).json({ ...payload, features, groups, count: features.length,
      actor_role: actorRole, release_channel: releaseChannel });
  } catch (error) {
    logger.warn(`[moonbot-admin features] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudo consultar el registro de funciones de Moonbot' });
  }
});

router.post('/features', express.json({ limit: '128kb' }), async (req, res) => {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' });
  const auth = await authorizeAuthenticatedUser(req);
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
  if (!serviceConfig(res)) return;
  try {
    const actorRole = moonRoleFor(auth.user.role);
    const actorId = String(auth.user.telegram_id || '');
    const releaseChannel = await releaseChannelForUser(auth.user, actorRole);
    const featureId = String(req.body?.feature_id || '').trim();
    if (!featureId) return res.status(400).json({ ok: false, error: 'feature_id es obligatorio' });
    const actorHeaders = { 'X-Moon-Actor-Role': actorRole, 'X-Moon-Actor-Id': actorId,
      'X-Moon-Release-Channel': releaseChannel };
    const catalogResponse = await moonRequest('/api/internal/features', { timeoutMs: 10_000, headers: actorHeaders });
    const catalog = await catalogResponse.json();
    if (!catalogResponse.ok) return res.status(catalogResponse.status).json(catalog);
    const feature = (catalog.features || []).find((item) => item.id === featureId);
    if (!feature || !canUseMoonbotFeature(actorRole, feature)) {
      return res.status(403).json({ ok: false, error: 'La función no está permitida para este rol' });
    }
    const groups = normalizeFeatureGroups(catalog.groups || catalog.allowed_groups);
    if (!canUseFeatureInGroup(feature, req.body?.payload, groups, actorRole)) {
      return res.status(403).json({ ok: false, error: 'No puedes ejecutar esta función en el grupo solicitado' });
    }
    const response = await moonRequest('/api/internal/features', {
      method: 'POST', timeoutMs: 15_000, headers: actorHeaders, body: JSON.stringify(req.body || {}),
    });
    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch (error) {
    logger.warn(`[moonbot-admin feature execute] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'Moonbot no pudo ejecutar la función' });
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
