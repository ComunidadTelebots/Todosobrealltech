export const CONTACT_BOT = 'CintiaBot';
export const TELEGRAM_CONTACT_URL = `https://t.me/${CONTACT_BOT}?start=gamergitbug_contact`;

export function findContactBot(bots) {
  return bots.find(bot => String(bot.username).replace(/^@/, '').toLowerCase() === CONTACT_BOT.toLowerCase());
}

export async function contactRequest(path, { token, signal, body } = {}) {
  const response = await fetch(`/contact-api/${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store', credentials: 'omit',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(35000)]) : AbortSignal.timeout(35000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('El servicio de contacto no está disponible.'); }
  if (!response.ok || data.ok === false) {
    const error = new Error(response.status === 401 ? 'Sesión no válida. Vuelve a iniciar sesión.'
      : response.status === 403 ? 'Esta bandeja está reservada al master.'
      : response.status === 429 ? 'Demasiados intentos. Espera un momento antes de continuar.'
      : data.error || 'No se ha podido completar la operación.');
    error.status = response.status;
    throw error;
  }
  return data;
}
