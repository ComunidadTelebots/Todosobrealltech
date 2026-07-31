const trimUrl = (value = '') => String(value).trim().replace(/\/+$/, '');

// La API y Moonbot comparten la red externa de Traefik. Mantener aquí el
// destino interno evita que una variable omitida haga caer silenciosamente las
// consultas administrativas a la URL pública o a una cadena vacía.
export const MOONBOT_INTERNAL_URL = trimUrl(
  process.env.MOONBOT_INTERNAL_URL || 'http://moonbot:5000',
);

export const MOONBOT_PUBLIC_URL = trimUrl(
  process.env.MOONBOT_PUBLIC_URL || 'https://cintiabot.todosobreall.tech',
);

export const moonbotAdminHeaders = () => ({
  Accept: 'application/json',
  'X-Moon-Admin-Key': String(process.env.MOON_ADMIN_API_KEY || '').trim(),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Las reconstrucciones de Moonbot y de la API no terminan exactamente a la vez.
// Las lecturas pueden reintentarse con seguridad durante esa ventana; las
// escrituras se ejecutan una sola vez para no duplicar acciones administrativas.
export async function requestMoonbot(path, {
  fetchImpl = fetch,
  timeoutMs = 6000,
  attempts,
  retryDelayMs = 750,
  headers = {},
  ...options
} = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const maxAttempts = Math.max(1, Number(attempts || (method === 'GET' ? 4 : 1)));
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchImpl(`${MOONBOT_INTERNAL_URL}${path}`, {
        ...options,
        method,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ...moonbotAdminHeaders(), 'Content-Type': 'application/json', ...headers },
      });
      if (![502, 503, 504].includes(response.status) || attempt === maxAttempts) return response;
      lastError = new Error(`Moonbot HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }
    await sleep(Math.min(3000, retryDelayMs * attempt));
  }
  throw lastError || new Error('Moonbot no disponible');
}
