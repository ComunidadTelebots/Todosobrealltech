export const COOKIE_CONSENT_KEY = 'nw3_cookie_consent';

const CONSENT_REQUIRED_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

export function requiresCookieConsent() {
  if (typeof window === 'undefined') return true;
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase() || '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  return CONSENT_REQUIRED_REGIONS.has(region) || timeZone.startsWith('Europe/') ||
    ['Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores'].includes(timeZone) || (!timeZone && !region);
}

export function readCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return { essential: true, analytics: Boolean(value.analytics), ads: Boolean(value.ads), updatedAt: value.updatedAt };
  } catch { return null; }
}

export function effectiveCookieConsent() {
  return readCookieConsent() || (requiresCookieConsent()
    ? { essential: true, analytics: false, ads: false }
    : { essential: true, analytics: true, ads: true });
}

export function saveCookieConsent(preferences) {
  const value = { essential: true, analytics: Boolean(preferences.analytics), ads: Boolean(preferences.ads), updatedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  window.gtag?.('consent', 'update', {
    analytics_storage: value.analytics ? 'granted' : 'denied',
    ad_storage: value.ads ? 'granted' : 'denied',
    ad_user_data: value.ads ? 'granted' : 'denied',
    ad_personalization: value.ads ? 'granted' : 'denied',
  });
  window.dispatchEvent(new CustomEvent('nw3CookieConsentChanged', { detail: value }));
  return value;
}
