const ALLOWED_ROLES = Object.freeze(['user', 'moderator', 'admin', 'creator']);
const ALLOWED_CHANGES = new Set(['role', 'is_frozen', 'proxy']);

const clone = (value) => {
  try {
    return structuredClone(value);
  } catch {
    throw new Error('La cuenta debe ser una copia serializable');
  }
};

const validateAccount = (account) => {
  if (!account || typeof account !== 'object' || Array.isArray(account)) {
    throw new Error('Cuenta de sandbox no válida');
  }
  if (typeof account.id !== 'string' || !account.id.trim()) throw new Error('La cuenta requiere un id');
  if (!ALLOWED_ROLES.includes(account.role)) throw new Error('Rol actual no válido');
};

const validateProxy = (proxy) => {
  if (proxy === null) return;
  if (!proxy || typeof proxy !== 'object' || Array.isArray(proxy)) throw new Error('Proxy no válido');
  const keys = Object.keys(proxy);
  if (keys.some((key) => !['id', 'enabled', 'region'].includes(key))) throw new Error('Proxy no válido');
  if (typeof proxy.id !== 'string' || !proxy.id.trim()) throw new Error('Proxy no válido');
  if (typeof proxy.enabled !== 'boolean') throw new Error('Proxy no válido');
  if (proxy.region !== undefined && (typeof proxy.region !== 'string' || !proxy.region.trim())) {
    throw new Error('Proxy no válido');
  }
};

const riskFor = (field, before, after) => {
  if (field === 'role') {
    if (after === 'creator') return { level: 'critical', code: 'creator_escalation' };
    if (after === 'admin' && before !== 'admin') return { level: 'high', code: 'privilege_escalation' };
    return { level: 'medium', code: 'role_change' };
  }
  if (field === 'is_frozen') {
    return after
      ? { level: 'high', code: 'account_access_blocked' }
      : { level: 'medium', code: 'account_access_restored' };
  }
  return after?.enabled
    ? { level: 'high', code: 'traffic_rerouted' }
    : { level: 'medium', code: 'proxy_changed' };
};

const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const simulateAccountChanges = (account, requestedChanges) => {
  validateAccount(account);
  if (!requestedChanges || typeof requestedChanges !== 'object' || Array.isArray(requestedChanges)) {
    throw new Error('Cambios de sandbox no válidos');
  }
  const fields = Object.keys(requestedChanges);
  if (!fields.length || fields.some((field) => !ALLOWED_CHANGES.has(field))) {
    throw new Error('El sandbox solo admite rol, congelación y proxy');
  }

  const before = clone(account);
  const after = clone(account);
  if (Object.hasOwn(requestedChanges, 'role')) {
    if (!ALLOWED_ROLES.includes(requestedChanges.role)) throw new Error('Rol de destino no válido');
    after.role = requestedChanges.role;
  }
  if (Object.hasOwn(requestedChanges, 'is_frozen')) {
    if (typeof requestedChanges.is_frozen !== 'boolean') throw new Error('Estado de congelación no válido');
    after.is_frozen = requestedChanges.is_frozen;
  }
  if (Object.hasOwn(requestedChanges, 'proxy')) {
    validateProxy(requestedChanges.proxy);
    after.proxy = clone(requestedChanges.proxy);
  }

  const diff = fields.filter((field) => !equal(before[field], after[field])).map((field) => ({
    field,
    before: clone(before[field]),
    after: clone(after[field]),
  }));
  const risks = diff.map(({ field, before: oldValue, after: newValue }) => ({
    field,
    ...riskFor(field, oldValue, newValue),
  }));

  return {
    mode: 'sandbox',
    account_id: account.id,
    before,
    after,
    diff,
    risks,
    effects: Object.freeze([]),
    applied: false,
  };
};

export const simulateAccountBatch = (accounts, requestedChanges) => {
  if (!Array.isArray(accounts) || !accounts.length) throw new Error('Selecciona cuentas para el sandbox');
  const ids = accounts.map((account) => account?.id);
  if (new Set(ids).size !== ids.length) throw new Error('Las cuentas del sandbox deben ser únicas');
  const simulations = accounts.map((account) => simulateAccountChanges(account, requestedChanges));
  return {
    mode: 'sandbox',
    applied: false,
    effects: Object.freeze([]),
    affected_accounts: simulations.filter(({ diff }) => diff.length).length,
    total_risks: simulations.reduce((total, { risks }) => total + risks.length, 0),
    simulations,
  };
};
