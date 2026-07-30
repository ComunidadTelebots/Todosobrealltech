export const ACCOUNT_DENSITY_MODES = Object.freeze([
  {
    value: 'comfortable',
    label: 'Cómoda',
    description: 'Más espacio entre elementos para facilitar la lectura.',
  },
  {
    value: 'compact',
    label: 'Compacta',
    description: 'Muestra más información usando menos espacio.',
  },
]);

export const DEFAULT_ACCOUNT_DENSITY = 'comfortable';

const supportedModes = new Set(ACCOUNT_DENSITY_MODES.map(({ value }) => value));

export const normalizeAccountDensity = (value) => (
  supportedModes.has(value) ? value : DEFAULT_ACCOUNT_DENSITY
);

export const getAccountDensityStorageKey = (userId) => (
  `account-density:${encodeURIComponent(String(userId || 'guest'))}`
);

export const readAccountDensity = (userId, storage) => {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!targetStorage) return DEFAULT_ACCOUNT_DENSITY;

  try {
    return normalizeAccountDensity(targetStorage.getItem(getAccountDensityStorageKey(userId)));
  } catch {
    return DEFAULT_ACCOUNT_DENSITY;
  }
};

export const saveAccountDensity = (userId, value, storage) => {
  const normalized = normalizeAccountDensity(value);
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);

  try {
    targetStorage?.setItem(getAccountDensityStorageKey(userId), normalized);
  } catch {
    // The mode remains usable for this session if persistent storage is unavailable.
  }

  return normalized;
};
