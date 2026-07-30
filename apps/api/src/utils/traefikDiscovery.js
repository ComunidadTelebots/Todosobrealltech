const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function extractHostDomains(rule = '') {
  const domains = [];
  const hostCalls = String(rule).matchAll(/Host\s*\(([^)]*)\)/gi);
  for (const call of hostCalls) {
    for (const token of call[1].matchAll(/[`'"]([^`'"]+)[`'"]/g)) {
      const domain = token[1].trim().toLowerCase().replace(/\.$/, '');
      if (DOMAIN_RE.test(domain)) domains.push(domain);
    }
  }
  return [...new Set(domains)];
}

export function summarizeTraefikDomains(routers = []) {
  const byDomain = new Map();
  for (const router of Array.isArray(routers) ? routers : []) {
    for (const domain of extractHostDomains(router?.rule)) {
      const current = byDomain.get(domain) || {
        domain,
        routers: [],
        services: [],
        entryPoints: [],
        tls: false,
        active: false,
      };
      if (router.name && !current.routers.includes(router.name)) current.routers.push(router.name);
      if (router.service && !current.services.includes(router.service)) current.services.push(router.service);
      for (const entry of router.entryPoints || []) {
        if (!current.entryPoints.includes(entry)) current.entryPoints.push(entry);
      }
      current.tls ||= Boolean(router.tls);
      current.active ||= String(router.status || '').toLowerCase() === 'enabled';
      byDomain.set(domain, current);
    }
  }
  return [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain));
}
