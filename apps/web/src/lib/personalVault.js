const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 250000;

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const storageKey = (userId) => `personal-vault:${userId}`;

const deriveKey = async (passphrase, salt) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const hasPersonalVault = (userId) => Boolean(localStorage.getItem(storageKey(userId)));

export const savePersonalVault = async (userId, passphrase, text) => {
  if (passphrase.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  localStorage.setItem(storageKey(userId), JSON.stringify({ version: 1, algorithm: 'AES-GCM', iterations: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(encrypted), consented_at: new Date().toISOString() }));
};

export const openPersonalVault = async (userId, passphrase) => {
  const payload = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null');
  if (!payload?.data || payload.version !== 1) throw new Error('No existe una bóveda compatible');
  const key = await deriveKey(passphrase, fromBase64(payload.salt));
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Contraseña incorrecta o bóveda dañada');
  }
};

export const removePersonalVault = (userId) => localStorage.removeItem(storageKey(userId));
