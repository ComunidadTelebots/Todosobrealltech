import crypto from 'node:crypto';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
export const ENV_CHANNELS = ['dev', 'alpha', 'beta', 'rc'];
const TTL = 600;

export function environmentConfig(raw = '[]', cookieDomain = '.todosobreall.tech') {
  const domain = cookieDomain.replace(/^\./, '').toLowerCase();
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) throw fail('Dominio de acceso inválido', 503);
  let rows;
  try { rows = JSON.parse(raw); } catch { throw fail('Catálogo de entornos inválido', 503); }
  if (!Array.isArray(rows) || rows.length > 24) throw fail('Máximo 24 entornos configurados', 503);
  const ids = new Set(); const hosts = new Set();
  const targets = rows.map((row) => {
    if (!row || typeof row.id !== 'string' || !ID.test(row.id) || ids.has(row.id) || !ENV_CHANNELS.includes(row.channel)) throw fail('Entorno inválido o duplicado', 503);
    let url;
    try { url = new URL(row.url); } catch { throw fail('URL de entorno inválida', 503); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash
      || !url.hostname.endsWith(`.${domain}`) || hosts.has(url.hostname)) throw fail('Cada entorno necesita un subdominio HTTPS propio del dominio de acceso', 503);
    ids.add(row.id); hosts.add(url.hostname);
    return { id: row.id, channel: row.channel, name: String(row.name || row.id).slice(0, 80),
      version: String(row.version || 'Sin indicar').slice(0, 80), url: url.origin, host: url.hostname };
  });
  return { targets, domain };
}

export function createEnvironmentService({ repository, targets, domain, secret, now = () => Date.now(), monitor = { record: async () => {}, snapshot: async () => ({ available: false, alerts: [], rules: [] }) } }) {
  const locks = new Set();
  const targetFor = (id) => {
    const target = targets.find((item) => item.id === id);
    if (!target) throw fail('Entorno no configurado', 404);
    return target;
  };
  const getUser = async (id) => {
    if (!ID.test(id || '')) throw fail('Cuenta inválida');
    const user = await repository.user(id);
    if (!user || user.is_frozen || !['admin', 'creator'].includes(user.role)) throw fail('Acceso reservado a administradores activos', 403);
    return user;
  };
  const effective = async (user) => {
    if (user.role === 'creator') return { source: 'creator', targets: targets.map((item) => item.id) };
    const personal = await repository.policy(user.id);
    const inherited = !personal || personal.mode === 'inherit';
    const policy = inherited ? await repository.policy('global') : personal;
    return { source: inherited ? 'global' : 'personal', targets: Array.isArray(policy?.targets) ? policy.targets.filter((id) => targets.some((item) => item.id === id)) : [] };
  };
  const allowed = async (user, id) => (await effective(user)).targets.includes(id);
  const policyView = (record, scope) => ({ scope, mode: record?.mode || (scope === 'global' ? 'custom' : 'inherit'),
    targets: Array.isArray(record?.targets) ? record.targets.filter((id) => targets.some((target) => target.id === id)) : [], revision: record?.revision || 0 });
  const cookieName = (id) => `__Secure-moon_env_${id}`;
  const cookie = (id, value, age = TTL) => `${cookieName(id)}=${value}; Domain=.${domain}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
  const key = () => {
    if (typeof secret !== 'string' || secret.length < 32) throw fail('Falta configurar la clave de acceso a los entornos', 503);
    return secret;
  };
  const fingerprint = (target) => crypto.createHash('sha256').update(`${target.id}:${target.channel}:${target.url}`).digest('hex');
  return {
    async view(actorId) {
      const user = await getUser(actorId); const access = await effective(user);
      const result = { ok: true, canManage: user.role === 'creator', source: access.source,
        configured: targets.length > 0, accessReady: typeof secret === 'string' && secret.length >= 32,
        targets: targets.filter((item) => access.targets.includes(item.id)) };
      if (user.role === 'creator') {
        result.security = await monitor.snapshot();
        result.global = policyView(await repository.policy('global'), 'global');
        result.accounts = await Promise.all((await repository.admins()).map(async (account) => ({
          id: account.id, name: account.name || account.username || account.id, frozen: !!account.is_frozen,
          policy: policyView(await repository.policy(account.id), account.id),
        })));
      }
      return result;
    },
    async assign(actorId, { scope, mode, targets: selected, revision }) {
      try {
        if ((await getUser(actorId)).role !== 'creator') throw fail('Solo el creador puede asignar accesos', 403);
      } catch (error) {
        if (error.status === 403) await monitor.record({ kind: 'denied_assign', actor: actorId });
        throw error;
      }
      if (!ID.test(scope || '') || !['custom', 'inherit'].includes(mode) || (scope === 'global' && mode !== 'custom')
        || !Number.isSafeInteger(revision) || revision < 0 || !Array.isArray(selected) || selected.length > 24
        || selected.some((id) => typeof id !== 'string') || new Set(selected).size !== selected.length) throw fail('Asignación inválida');
      selected.forEach(targetFor);
      if (mode === 'inherit' && selected.length) throw fail('La herencia no admite excepciones');
      if (scope !== 'global' && (await repository.user(scope)).role !== 'admin') throw fail('Selecciona un administrador', 400);
      if (locks.has(scope)) throw fail('Hay otra asignación en curso', 409);
      locks.add(scope);
      try {
        const previous = await repository.policy(scope);
        if ((previous?.revision || 0) !== revision) throw fail('Los permisos cambiaron; actualiza antes de guardar', 409);
        const general = scope === 'global' ? [] : (await repository.policy('global'))?.targets || [];
        const before = previous?.mode === 'custom' ? previous.targets || [] : general;
        const after = mode === 'custom' ? selected : general;
        const added = after.filter((id) => !before.includes(id));
        const next = { scope, mode, targets: selected, revision: revision + 1, assigned_by: actorId,
          history: [{ at: new Date(now()).toISOString(), actor: actorId, mode, targets: selected,
            previousMode: previous?.mode || 'inherit', previousTargets: previous?.targets || [] }, ...(previous?.history || [])].slice(0, 50) };
        await repository.save(previous, next);
        if (added.length && (scope === 'global' || added.length >= 3)) await monitor.record({ kind: 'broad_grant', actor: actorId, scope, added });
        return { ok: true, policy: policyView(next, scope) };
      } finally { locks.delete(scope); }
    },
    async open(actorId, id) {
      let target; let user;
      try {
        user = await getUser(actorId); target = targetFor(id);
        if (!await allowed(user, id)) throw fail('No tienes acceso a este entorno', 403);
      } catch (error) {
        if ([403, 404].includes(error.status)) await monitor.record({ kind: 'denied_open', actor: actorId, target: targets.some((item) => item.id === id) ? id : null });
        throw error;
      }
      const issued = Math.floor(now() / 1000);
      const body = Buffer.from(JSON.stringify({ sub: user.id, target: id, fingerprint: fingerprint(target), iat: issued, exp: issued + TTL })).toString('base64url');
      const signature = crypto.createHmac('sha256', key()).update(body).digest('base64url');
      await monitor.record({ kind: 'sessions', actor: actorId, target: id });
      return { url: target.url, cookie: cookie(id, `${body}.${signature}`), expiresIn: TTL };
    },
    async authorize(id, cookies, host, protocol) {
      const target = targetFor(id);
      if (host !== target.host || protocol !== 'https') throw fail('Destino no autorizado', 403);
      const token = String(cookies || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName(id)}=`))?.slice(cookieName(id).length + 1);
      if (!token) throw fail('Abre este entorno desde todosobreall.tech', 403);
      const invalid = async () => {
        await monitor.record({ kind: 'invalid_signature', target: id });
        return fail('Sesión inválida', 403);
      };
      if (token.length > 2048) throw await invalid();
      const [body, signature, extra] = token.split('.');
      if (!body || !signature || extra) throw await invalid();
      const expected = crypto.createHmac('sha256', key()).update(body).digest();
      const supplied = Buffer.from(signature, 'base64url');
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) throw await invalid();
      let session;
      try { session = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { throw fail('Sesión inválida', 403); }
      const current = Math.floor(now() / 1000);
      if (!session || session.target !== id || session.fingerprint !== fingerprint(target)
        || !Number.isInteger(session.iat) || !Number.isInteger(session.exp) || session.exp <= current
        || session.iat > current || session.exp - session.iat !== TTL) throw fail('Sesión caducada o inválida', 403);
      try {
        const user = await getUser(session.sub);
        if (!await allowed(user, id)) throw fail('Acceso revocado', 403);
      } catch (error) {
        if (error.status === 403) await monitor.record({ kind: 'denied_gate', actor: session.sub, target: id });
        throw error;
      }
      return true;
    },
    async reviewAlert(actorId, id, outcome) {
      if ((await getUser(actorId)).role !== 'creator') throw fail('Solo el creador puede revisar alertas', 403);
      return monitor.review(id, actorId, outcome);
    },
    clearCookies: () => targets.map((target) => cookie(target.id, '', 0)),
  };
}

export function environmentRepository(pb) {
  const policies = () => pb.collection('moonbot_environment_access');
  return {
    user: (id) => pb.collection('users').getOne(id, { requestKey: null }),
    admins: () => pb.collection('users').getFullList({ filter: 'role="admin"', fields: 'id,name,username,is_frozen', requestKey: null }),
    async policy(scope) {
      try { return await policies().getFirstListItem(`scope="${scope}"`, { requestKey: null }); }
      catch (error) { if (error.status === 404) return null; throw error; }
    },
    save: (previous, next) => previous ? policies().update(previous.id, next, { requestKey: null }) : policies().create(next, { requestKey: null }),
  };
}
