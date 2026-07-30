const ALLOWED_FIELDS = new Set([
  'role', 'verified', 'is_frozen', 'language', 'timezone', 'proxy_id', 'notifications', 'preferences',
]);
const ROLES = new Set(['user', 'moderator', 'admin', 'creator']);
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const cloneJson = (value) => {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !BLOCKED_KEYS.has(key))
    .map(([key, item]) => [key, cloneJson(item)]));
};

const validDate = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha de plantilla no válida');
  return date.toISOString();
};

const normalizedId = (value) => {
  const id = String(value ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(id)) throw new Error('ID de plantilla no válido');
  return id;
};

export const validateAccountTemplateConfig = (config) => {
  const errors = [];
  if (!isPlainObject(config)) return { valid: false, errors: ['La configuración debe ser un objeto.'] };
  const entries = Object.entries(config);
  if (!entries.length) errors.push('La configuración debe incluir al menos un campo.');
  for (const [field, value] of entries) {
    if (BLOCKED_KEYS.has(field) || !ALLOWED_FIELDS.has(field)) {
      errors.push(`El campo ${field} no está permitido.`);
      continue;
    }
    if (field === 'role' && !ROLES.has(value)) errors.push('El rol debe ser user, moderator, admin o creator.');
    if (['verified', 'is_frozen'].includes(field) && typeof value !== 'boolean') {
      errors.push(`El campo ${field} debe ser booleano.`);
    }
    if (['language', 'timezone', 'proxy_id'].includes(field) && value !== null && typeof value !== 'string') {
      errors.push(`El campo ${field} debe ser texto o null.`);
    }
    if (['notifications', 'preferences'].includes(field) && !isPlainObject(value)) {
      errors.push(`El campo ${field} debe ser un objeto.`);
    }
  }
  return { valid: errors.length === 0, errors };
};

const checkedConfig = (config) => {
  const validation = validateAccountTemplateConfig(config);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return cloneJson(config);
};

export const createAccountConfigTemplate = ({ id, name, description = '', config, createdBy, now = new Date() }) => {
  const cleanName = String(name ?? '').trim();
  const author = String(createdBy ?? '').trim();
  if (!cleanName || cleanName.length > 100) throw new Error('Nombre de plantilla no válido');
  if (!author) throw new Error('Autor de plantilla requerido');
  return {
    id: normalizedId(id),
    name: cleanName,
    description: String(description ?? '').trim(),
    current_version: 1,
    versions: [{ version: 1, config: checkedConfig(config), created_by: author, created_at: validDate(now) }],
  };
};

export const addAccountConfigTemplateVersion = (template, { config, createdBy, now = new Date() }) => {
  if (!isPlainObject(template) || !Array.isArray(template.versions) || !template.versions.length) {
    throw new Error('Plantilla versionada no válida');
  }
  const author = String(createdBy ?? '').trim();
  if (!author) throw new Error('Autor de plantilla requerido');
  const versions = template.versions.map(cloneJson);
  const nextVersion = Math.max(...versions.map((item) => Number(item.version) || 0)) + 1;
  versions.push({ version: nextVersion, config: checkedConfig(config), created_by: author, created_at: validDate(now) });
  return { ...cloneJson(template), current_version: nextVersion, versions };
};

export const previewAccountConfigTemplate = (template, account, version = template?.current_version) => {
  if (!isPlainObject(account)) throw new Error('Cuenta no válida');
  const selected = Array.isArray(template?.versions)
    ? template.versions.find((item) => item.version === Number(version))
    : null;
  if (!selected) throw new Error('Versión de plantilla no encontrada');
  const config = checkedConfig(selected.config);
  const before = cloneJson(account);
  const after = { ...before, ...config };
  const changes = Object.keys(config)
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, before: cloneJson(before[field]), after: cloneJson(after[field]) }));
  return {
    template_id: String(template.id ?? ''),
    version: selected.version,
    mode: 'preview',
    executable: false,
    account_id: String(account.id ?? ''),
    before,
    after,
    changes,
  };
};
