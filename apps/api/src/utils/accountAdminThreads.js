const REVIEWER_ROLES = new Set(['admin', 'creator']);
const BODY_LIMIT = 4000;

const cleanId = (value, label) => {
  const id = String(value ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,79}$/i.test(id)) throw new Error(`${label} no válido`);
  return id;
};

const cleanBody = (value) => {
  const body = String(value ?? '').trim();
  const hasUnsafeControl = [...body].some((character) => {
    const code = character.codePointAt(0);
    return code < 32 && ![9, 10, 13].includes(code);
  });
  if (!body || body.length > BODY_LIMIT || hasUnsafeControl) {
    throw new Error('Comentario no válido');
  }
  return body;
};

const timestamp = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha no válida');
  return date.toISOString();
};

const snapshot = (value) => structuredClone(value);

export const extractSafeMentions = (body, mentionableUsers = []) => {
  const allowed = new Map((Array.isArray(mentionableUsers) ? mentionableUsers : []).flatMap((user) => {
    const username = String(user?.username ?? '').trim().toLowerCase();
    const id = String(user?.id ?? '').trim();
    return /^[a-z0-9_]{2,32}$/i.test(username) && id ? [[username, id]] : [];
  }));
  const found = [...String(body ?? '').matchAll(/(^|[^\w@])@([a-z0-9_]{2,32})\b/gi)]
    .map((match) => allowed.get(match[2].toLowerCase())).filter(Boolean);
  return [...new Set(found)];
};

export const decideAccountThreadPermission = (thread, actor, action, comment = null) => {
  const actorId = String(actor?.id ?? '').trim();
  const role = String(actor?.role ?? '').toLowerCase();
  if (!actorId) return { allowed: false, reason: 'actor_required' };
  if (!['comment', 'resolve', 'reopen', 'edit_comment'].includes(action)) {
    return { allowed: false, reason: 'unknown_action' };
  }
  if (action === 'resolve' || action === 'reopen') {
    return REVIEWER_ROLES.has(role)
      ? { allowed: true, reason: 'reviewer_role' }
      : { allowed: false, reason: 'reviewer_role_required' };
  }
  if (action === 'edit_comment') {
    return String(comment?.author_id ?? '') === actorId
      ? { allowed: true, reason: 'comment_author' }
      : { allowed: false, reason: 'comment_author_required' };
  }
  if (thread?.status === 'resolved') return { allowed: false, reason: 'thread_resolved' };
  const participant = thread?.created_by === actorId
    || thread?.comments?.some((item) => item.author_id === actorId);
  return participant || REVIEWER_ROLES.has(role)
    ? { allowed: true, reason: participant ? 'thread_participant' : 'reviewer_role' }
    : { allowed: false, reason: 'participant_or_reviewer_required' };
};

export const createAccountAdminThread = ({ id, accountId, body, actor, mentionableUsers = [], now = new Date() }) => {
  const actorId = cleanId(actor?.id, 'Autor');
  if (!REVIEWER_ROLES.has(String(actor?.role ?? '').toLowerCase())) throw new Error('Rol administrativo requerido');
  const createdAt = timestamp(now);
  const firstComment = {
    id: `${cleanId(id, 'Hilo')}-comment-1`,
    author_id: actorId,
    body: cleanBody(body),
    mentions: extractSafeMentions(body, mentionableUsers),
    created_at: createdAt,
  };
  return {
    id: cleanId(id, 'Hilo'),
    account_id: cleanId(accountId, 'Cuenta'),
    status: 'open',
    created_by: actorId,
    created_at: createdAt,
    comments: [firstComment],
    history: [{ action: 'created', actor_id: actorId, at: createdAt }],
  };
};

export const addAccountAdminComment = (thread, { id, body, actor, mentionableUsers = [], now = new Date() }) => {
  const decision = decideAccountThreadPermission(thread, actor, 'comment');
  if (!decision.allowed) throw new Error(`Comentario no permitido: ${decision.reason}`);
  const at = timestamp(now);
  const comment = {
    id: cleanId(id, 'Comentario'),
    author_id: cleanId(actor.id, 'Autor'),
    body: cleanBody(body),
    mentions: extractSafeMentions(body, mentionableUsers),
    created_at: at,
  };
  return {
    ...snapshot(thread),
    comments: [...snapshot(thread.comments ?? []), comment],
    history: [...snapshot(thread.history ?? []), { action: 'commented', actor_id: comment.author_id, comment_id: comment.id, at }],
  };
};

export const transitionAccountAdminThread = (thread, { action, actor, now = new Date() }) => {
  if (!['resolve', 'reopen'].includes(action)) throw new Error('Transición no válida');
  const decision = decideAccountThreadPermission(thread, actor, action);
  if (!decision.allowed) throw new Error(`Transición no permitida: ${decision.reason}`);
  const expected = action === 'resolve' ? 'open' : 'resolved';
  if (thread?.status !== expected) throw new Error(`El hilo no está ${expected}`);
  const at = timestamp(now);
  return {
    ...snapshot(thread),
    status: action === 'resolve' ? 'resolved' : 'open',
    history: [...snapshot(thread.history ?? []), { action: action === 'resolve' ? 'resolved' : 'reopened', actor_id: cleanId(actor.id, 'Revisor'), at }],
  };
};
