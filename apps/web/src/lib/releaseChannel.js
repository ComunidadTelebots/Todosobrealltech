export const RELEASE_CHANNELS = Object.freeze(['stable', 'rc', 'beta', 'alpha']);

export const normalizeReleaseChannel = (value) => {
  const channel = String(value || '').trim().toLowerCase();
  return RELEASE_CHANNELS.includes(channel) ? channel : 'stable';
};

export const releaseChannel = normalizeReleaseChannel(import.meta.env.VITE_RELEASE_CHANNEL);
export const releaseVersion = String(import.meta.env.VITE_RELEASE_VERSION || 'local').trim().slice(0, 64) || 'local';

export const releaseLabel = `${releaseChannel.toUpperCase()} · ${releaseVersion}`;
