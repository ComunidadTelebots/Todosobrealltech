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
