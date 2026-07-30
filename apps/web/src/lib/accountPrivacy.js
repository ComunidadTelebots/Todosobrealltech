const preferenceKey = (userId) => `account-privacy:${userId}`;

export const getAccountPrivacyMode = (userId) => {
  if (!userId) return true;
  return localStorage.getItem(preferenceKey(userId)) !== 'off';
};

export const setAccountPrivacyMode = (userId, enabled) => {
  localStorage.setItem(preferenceKey(userId), enabled ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent('accountPrivacyUpdate', { detail: { userId, enabled } }));
};

export const maskEmail = (value) => {
  const [local = '', domain = ''] = String(value || '').split('@');
  if (!domain) return '••••••';
  return `${local.slice(0, 2) || '•'}•••@${domain}`;
};

export const maskName = (value) => {
  const text = String(value || 'Sin nombre');
  return `${text.slice(0, 1)}${'•'.repeat(Math.max(3, Math.min(text.length - 1, 10)))}`;
};

export const maskProxyUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return `${url.protocol}//••••@${url.hostname}:••••`;
  } catch {
    return 'proxy://••••••';
  }
};
