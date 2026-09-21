import crypto from 'node:crypto';

export const ACCOUNT_DELEGATION_PERMISSIONS = Object.freeze([
  'view_account_summary',
]);

const asIso = (value, label) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} no es una fecha válida`);
  return parsed.toISOString();
};

export const createAccountDelegation = (input, actorId, now = new Date()) => {
  const delegateId = String(input?.delegate_id || '').trim();
  if (!delegateId || delegateId.length > 64) throw new Error('La cuenta delegada no es válida');
  if (delegateId === String(actorId)) throw new Error('No puedes delegarte permisos a ti mismo');

  const startsAt = asIso(input?.starts_at || now, 'starts_at');
  const expiresAt = asIso(input?.expires_at, 'expires_at');
  const startMs = Date.parse(startsAt);
  const expiresMs = Date.parse(expiresAt);
  if (expiresMs <= startMs) throw new Error('La caducidad debe ser posterior al inicio');
  if (expiresMs - startMs > 30 * 24 * 60 * 60 * 1000) throw new Error('La delegación no puede superar 30 días');

  const requested = Array.isArray(input?.permissions) ? input.permissions : [];
  const permissions = [...new Set(requested.map(String))]
    .filter((permission) => ACCOUNT_DELEGATION_PERMISSIONS.includes(permission));
  if (!permissions.length) throw new Error('Selecciona al menos un permiso permitido');

  return {
    id: crypto.randomUUID(),
    actor_id: String(actorId),
    delegate_id: delegateId,
    permissions,
    starts_at: startsAt,
    expires_at: expiresAt,
    created_at: now.toISOString(),
    revoked_at: null,
  };
};

export const isAccountDelegationActive = (delegation, delegateId, permission, now = new Date()) => Boolean(
  delegation
  && !delegation.revoked_at
  && String(delegation.delegate_id) === String(delegateId)
  && Array.isArray(delegation.permissions)
  && delegation.permissions.includes(permission)
  && Date.parse(delegation.starts_at) <= now.getTime()
  && Date.parse(delegation.expires_at) > now.getTime()
);

export const publicAccountDelegation = (delegation) => ({
  id: delegation.id,
  delegate_id: delegation.delegate_id,
  permissions: delegation.permissions,
  starts_at: delegation.starts_at,
  expires_at: delegation.expires_at,
  created_at: delegation.created_at,
  revoked_at: delegation.revoked_at || null,
});
