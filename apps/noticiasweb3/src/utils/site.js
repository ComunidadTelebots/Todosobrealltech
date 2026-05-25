// Resolves per-subdomain branding and canonical origin. The same hostname map
// is mirrored inline in index.html so the base canonical/OG tags are correct
// even before React (or the react-snap pre-render) takes over.
const SITES = {
  'noticiasweb3.todosobreall.tech': { name: 'NW3 - Noticiasweb3' },
  'resistenciaalacensura.todosobreall.tech': { name: 'Resistencia a la Censura' },
  'gamergitbug.todosobreall.tech': { name: 'GamerGitBug' },
  'todosobregameplays.todosobreall.tech': { name: 'Todo Sobre Gameplays' },
  'comunidadtelebots.todosobreall.tech': { name: 'Comunidad TeleBots' },
};

const DEFAULT_SITE = { name: 'NW3 - Noticiasweb3' };

export function getSiteInfo(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const host = (hostname || '').toLowerCase();
  const site = SITES[host] || DEFAULT_SITE;
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${host}`;
  return { name: site.name, origin };
}

export function canonicalUrl(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const { origin } = getSiteInfo();
  return origin + pathname;
}
