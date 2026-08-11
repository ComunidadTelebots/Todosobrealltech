export const COMMUNICATION_CHANNELS = Object.freeze(['email', 'push', 'telegram']);
export const COMMUNICATION_TOPICS = Object.freeze(['security', 'news', 'community', 'system']);
export const COMMUNICATION_DIGESTS = Object.freeze(['realtime', 'daily', 'weekly', 'never']);

export const defaultCommunicationPreferences = () => ({
  channels: { email: true, push: false, telegram: true },
  topics: { security: true, news: true, community: true, system: true },
  digest: 'daily',
  quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'Europe/Madrid' },
  updated_at: null,
});

const time = (value, fallback) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? String(value) : fallback;

export const sanitizeCommunicationPreferences = (input = {}, previous = defaultCommunicationPreferences()) => {
  const channels = Object.fromEntries(COMMUNICATION_CHANNELS.map((key) => [key, Boolean(input.channels?.[key] ?? previous.channels?.[key])]));
  const topics = Object.fromEntries(COMMUNICATION_TOPICS.map((key) => [key, Boolean(input.topics?.[key] ?? previous.topics?.[key])]));
  const digest = COMMUNICATION_DIGESTS.includes(input.digest) ? input.digest : previous.digest;
  const timezone = String(input.quiet_hours?.timezone || previous.quiet_hours?.timezone || 'Europe/Madrid').trim();
  if (!/^[A-Za-z_]+\/[A-Za-z_+-]+$/.test(timezone) || timezone.length > 64) throw new Error('La zona horaria no es válida');
  return {
    channels,
    topics,
    digest,
    quiet_hours: {
      enabled: Boolean(input.quiet_hours?.enabled ?? previous.quiet_hours?.enabled),
      start: time(input.quiet_hours?.start, previous.quiet_hours?.start || '22:00'),
      end: time(input.quiet_hours?.end, previous.quiet_hours?.end || '08:00'),
      timezone,
    },
    updated_at: new Date().toISOString(),
  };
};
