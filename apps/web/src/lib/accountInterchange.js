export const ACCOUNT_PACKAGE_FORMAT = 'todosobrealltech.accounts';
export const ACCOUNT_PACKAGE_VERSION = 1;

export const ACCOUNT_COMPATIBLE_FIELDS = Object.freeze([
  'externalId',
  'name',
  'email',
  'role',
  'status',
  'language',
]);

const FIELD_ALIASES = Object.freeze({
  id: 'externalId',
  userId: 'externalId',
  username: 'name',
  displayName: 'name',
  mail: 'email',
  accessRole: 'role',
  locale: 'language',
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export const mapCompatibleAccountFields = (source) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { account: {}, mappedFields: [], ignoredFields: [] };
  }

  const account = {};
  const mappedFields = [];
  const ignoredFields = [];

  Object.entries(source).forEach(([sourceField, value]) => {
    let targetField = FIELD_ALIASES[sourceField] || sourceField;
    let targetValue = value;
    if (sourceField === 'active') {
      targetField = 'status';
      targetValue = value === true ? 'active' : value === false ? 'inactive' : value;
    }

    if (!ACCOUNT_COMPATIBLE_FIELDS.includes(targetField)) {
      ignoredFields.push(sourceField);
      return;
    }
    if (!hasOwn(account, targetField)) {
      account[targetField] = targetValue;
      mappedFields.push({ source: sourceField, target: targetField });
    }
  });

  return { account, mappedFields, ignoredFields };
};

export const createAccountInterchangePackage = (accounts, options = {}) => ({
  format: ACCOUNT_PACKAGE_FORMAT,
  version: ACCOUNT_PACKAGE_VERSION,
  exportedAt: options.exportedAt || new Date().toISOString(),
  source: options.source || 'TodoSobreAllTech Web',
  accounts: (Array.isArray(accounts) ? accounts : []).map((account) => (
    mapCompatibleAccountFields(account).account
  )),
});

export const serializeAccountInterchangePackage = (accounts, options) => (
  JSON.stringify(createAccountInterchangePackage(accounts, options), null, 2)
);

export const previewAccountInterchangePackage = (input) => {
  const errors = [];
  const warnings = [];
  let parsed;

  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return { valid: false, errors: ['El contenido no es JSON válido.'], warnings, accounts: [] };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errors: ['El paquete debe ser un objeto JSON.'], warnings, accounts: [] };
  }
  if (parsed.format !== ACCOUNT_PACKAGE_FORMAT) errors.push(`Formato incompatible: se esperaba "${ACCOUNT_PACKAGE_FORMAT}".`);
  if (parsed.version !== ACCOUNT_PACKAGE_VERSION) errors.push(`Versión no compatible: se esperaba ${ACCOUNT_PACKAGE_VERSION}.`);
  if (!Array.isArray(parsed.accounts)) errors.push('El campo "accounts" debe ser una lista.');
  if (errors.length) return { valid: false, errors, warnings, accounts: [] };

  const accounts = parsed.accounts.map((source, index) => {
    const mapped = mapCompatibleAccountFields(source);
    if (!Object.keys(mapped.account).length) errors.push(`La cuenta ${index + 1} no contiene campos compatibles.`);
    if (mapped.ignoredFields.length) warnings.push(`Cuenta ${index + 1}: se ignorarán ${mapped.ignoredFields.join(', ')}.`);
    return { index, ...mapped };
  });

  if (!accounts.length) warnings.push('El paquete no contiene cuentas.');
  return { valid: errors.length === 0, errors, warnings, accounts, metadata: {
    format: parsed.format,
    version: parsed.version,
    exportedAt: parsed.exportedAt || null,
    source: parsed.source || null,
  } };
};
