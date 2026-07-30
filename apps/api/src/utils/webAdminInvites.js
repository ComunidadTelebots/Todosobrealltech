import crypto from 'node:crypto';

export const WEB_ADMIN_ROLES = Object.freeze(['admin']);
const ROLE_LEVEL = Object.freeze({ user: 0, moderator: 1, admin: 2, creator: 3 });

export const hashAdminInviteToken = (token) => crypto.createHash('sha256')
  .update(String(token || ''), 'utf8').digest('hex');

export const normalizeTelegramClaim = (value) => {
  const claim = String(value || '').trim().replace(/^@/, '');
  if (/^[1-9]\d{4,19}$/.test(claim)) return { type: 'id', value: claim };
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(claim)) return { type: 'username', value: claim.toLowerCase() };
  throw new Error('Indica un ID de Telegram o un usuario válido');
};

export const createTelegramVerification = ({ accountId, role, claim, invitationId, now = new Date() }) => {
  const normalized = normalizeTelegramClaim(claim);
  if (!/^[a-z0-9]+$/i.test(String(accountId || '')) || !WEB_ADMIN_ROLES.includes(role)) throw new Error('Verificación no válida');
  const code = `WEB-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;
  return { code, record: { id: crypto.randomUUID(), account_id: String(accountId), role,
    telegram_claim_type: normalized.type, telegram_claim: normalized.value,
    code_hash: hashAdminInviteToken(code), invitation_id: String(invitationId), status: 'pending',
    created_at: now.toISOString(), expires_at: new Date(now.getTime() + 15 * 60_000).toISOString() } };
};

export const createAdminInvite = ({ role, expiresHours, maxUses, creatorId, now = new Date() }) => {
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
      id: crypto.randomUUID(), token_hash: hashAdminInviteToken(token), role, max_uses: uses, uses: 0,
      enabled: true, created_by: String(creatorId), created_at: createdAt,
      expires_at: new Date(now.getTime() + hours * 3600_000).toISOString(), used_by: [],
    },
  };
};

export const publicAdminInvite = (record, now = new Date()) => ({
  id: record.id,
  role: record.role,
  enabled: Boolean(record.enabled),
  uses: Number(record.uses || 0),
  max_uses: Number(record.max_uses || 1),
  expires_at: record.expires_at,
  valid: Boolean(record.enabled) && new Date(record.expires_at).getTime() > now.getTime()
    && Number(record.uses || 0) < Number(record.max_uses || 1),
});

export const canElevateWebRole = (currentRole, targetRole) => WEB_ADMIN_ROLES.includes(targetRole)
  && (ROLE_LEVEL[currentRole] ?? 0) < ROLE_LEVEL[targetRole];
