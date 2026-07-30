export const ACCOUNT_LANGUAGES = Object.freeze([
  { code: 'es', label: 'Español', direction: 'ltr' },
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'fr', label: 'Français', direction: 'ltr' },
  { code: 'de', label: 'Deutsch', direction: 'ltr' },
  { code: 'it', label: 'Italiano', direction: 'ltr' },
  { code: 'pt', label: 'Português', direction: 'ltr' },
  { code: 'ar', label: 'العربية', direction: 'rtl' },
  { code: 'tr', label: 'Türkçe', direction: 'ltr' },
]);

export const DEFAULT_ACCOUNT_LANGUAGE = 'es';

const supportedCodes = new Set(ACCOUNT_LANGUAGES.map(({ code }) => code));
const storageKey = (userId) => `account-language:${encodeURIComponent(String(userId || 'guest'))}`;

export const normalizeAccountLanguage = (language) => {
  const code = String(language || '').trim().toLowerCase().split('-')[0];
  return supportedCodes.has(code) ? code : DEFAULT_ACCOUNT_LANGUAGE;
};

export const getAccountLanguageDirection = (language) => (
  normalizeAccountLanguage(language) === 'ar' ? 'rtl' : 'ltr'
);

export const readAccountLanguage = (userId) => {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_LANGUAGE;

  try {
    return normalizeAccountLanguage(window.localStorage.getItem(storageKey(userId)));
  } catch {
    return DEFAULT_ACCOUNT_LANGUAGE;
  }
};

export const saveAccountLanguage = (userId, language) => {
  const normalized = normalizeAccountLanguage(language);
  if (typeof window === 'undefined') return normalized;

  try {
    window.localStorage.setItem(storageKey(userId), normalized);
  } catch {
    // The selection still applies for the current session when storage is disabled.
  }

  window.dispatchEvent(new CustomEvent('accountLanguageUpdate', {
    detail: { userId: String(userId || 'guest'), language: normalized },
  }));
  return normalized;
};
