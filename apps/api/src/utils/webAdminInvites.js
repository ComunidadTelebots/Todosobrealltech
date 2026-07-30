import crypto from 'node:crypto';

export const WEB_ADMIN_ROLES = Object.freeze(['admin']);
export const WEB_ADMIN_PROFILES = Object.freeze({
  support: Object.freeze({ label: 'Soporte', description: 'Cuentas, incidencias y atención a usuarios', capabilities: ['accounts.read', 'accounts.support', 'tickets.manage'] }),
  content: Object.freeze({ label: 'Contenido', description: 'Noticias, campañas y contenidos publicados', capabilities: ['content.manage', 'news.manage', 'ads.manage'] }),
  security: Object.freeze({ label: 'Seguridad', description: 'Moderación, baneos, alertas y auditoría', capabilities: ['security.manage', 'bans.manage', 'audit.read'] }),
  analytics: Object.freeze({ label: 'Analítica', description: 'Estadísticas e informes en modo lectura', capabilities: ['analytics.read', 'reports.read'] }),
  operations: Object.freeze({ label: 'Operaciones', description: 'Bots, proxies, trabajos y estado del servicio', capabilities: ['bots.manage', 'proxies.manage', 'jobs.manage', 'system.read'] }),
  full: Object.freeze({ label: 'Administrador completo', description: 'Control de todas las áreas administrativas', capabilities: ['*'] }),
});
export const DEFAULT_WEB_ADMIN_PROFILE = 'support';
const ROLE_LEVEL = Object.freeze({ user: 0, moderator: 1, admin: 2, creator: 3 });

export const hashAdminInviteToken = (token) => crypto.createHash('sha256')
  .update(String(token || ''), 'utf8').digest('hex');

export const normalizeTelegramClaim = (value) => {
  const claim = String(value || '').trim().replace(/^@/, '');
  if (/^[1-9]\d{4,19}$/.test(claim)) return { type: 'id', value: claim };
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(claim)) return { type: 'username', value: claim.toLowerCase() };
  throw new Error('Indica un ID de Telegram o un usuario válido');
};

export const normalizeWebAdminProfile = (profile) => {
  const normalized = String(profile || DEFAULT_WEB_ADMIN_PROFILE).trim().toLowerCase();
  if (!Object.hasOwn(WEB_ADMIN_PROFILES, normalized)) throw new Error('Perfil administrativo no válido');
  return normalized;
};
export const normalizeGroupDelegation = (scope, groupIds = []) => {
  const normalizedScope = ['none', 'selected', 'all'].includes(String(scope)) ? String(scope) : 'none';
  const ids = normalizedScope === 'selected' ? [...new Set((Array.isArray(groupIds) ? groupIds : [])
    .map((value) => String(value).trim()).filter((value) => /^-?\d{5,20}$/.test(value)))].slice(0, 500) : [];
  if (normalizedScope === 'selected' && !ids.length) throw new Error('Selecciona al menos un grupo');
  return { scope: normalizedScope, group_ids: ids };
};

export const createTelegramVerification = ({ accountId, role, profile, claim, invitationId, now = new Date() }) => {
  const normalized = normalizeTelegramClaim(claim);
  if (!/^[a-z0-9]+$/i.test(String(accountId || '')) || !WEB_ADMIN_ROLES.includes(role)) throw new Error('Verificación no válida');
  const code = `WEB-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;
  return { code, record: { id: crypto.randomUUID(), account_id: String(accountId), role,
    profile: normalizeWebAdminProfile(profile),
    telegram_claim_type: normalized.type, telegram_claim: normalized.value,
    code_hash: hashAdminInviteToken(code), invitation_id: String(invitationId), status: 'pending',
    created_at: now.toISOString(), expires_at: new Date(now.getTime() + 15 * 60_000).toISOString() } };
};

export const createAdminInvite = ({ role, profile, expiresHours, maxUses, creatorId, now = new Date() }) => {
  if (!WEB_ADMIN_ROLES.includes(role)) throw new Error('Rol administrativo no válido');
  const hours = Number(expiresHours);
  const uses = Number(maxUses);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new Error('La caducidad debe estar entre 1 y 168 horas');
  if (!Number.isInteger(uses) || uses < 1 || uses > 25) throw new Error('Los usos deben estar entre 1 y 25');
  if (!String(creatorId || '').match(/^[a-z0-9]+$/i)) throw new Error('Master no válido');
  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = now.toISOString();
  return {
    token,
    record: {
      id: crypto.randomUUID(), token_hash: hashAdminInviteToken(token), role,
      profile: normalizeWebAdminProfile(profile), max_uses: uses, uses: 0,
      enabled: true, created_by: String(creatorId), created_at: createdAt,
      expires_at: new Date(now.getTime() + hours * 3600_000).toISOString(), used_by: [],
    },
  };
};

export const publicAdminInvite = (record, now = new Date()) => ({
  id: record.id,
  role: record.role,
  profile: normalizeWebAdminProfile(record.profile),
  group_scope: normalizeGroupDelegation(record.group_scope, record.group_ids).scope,
  enabled: Boolean(record.enabled),
  uses: Number(record.uses || 0),
  max_uses: Number(record.max_uses || 1),
  expires_at: record.expires_at,
  valid: Boolean(record.enabled) && new Date(record.expires_at).getTime() > now.getTime()
    && Number(record.uses || 0) < Number(record.max_uses || 1),
});

export const canElevateWebRole = (currentRole, targetRole) => WEB_ADMIN_ROLES.includes(targetRole)
  && (ROLE_LEVEL[currentRole] ?? 0) < ROLE_LEVEL[targetRole];
