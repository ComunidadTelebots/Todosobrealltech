import { createHash } from 'node:crypto';

export const instantNewsId = (url) => createHash('sha256').update(url).digest('hex').slice(0, 16);
export function createNewsResolver({ pbHost, siteUrl, staticArticles, fetchImpl = fetch }) {
  let index = new Map(), updated = 0, pending;
  const refresh = async () => {
    const next = new Map();
    for (const article of staticArticles) {
      const url = `${siteUrl}/noticias/${article.slug}`;
      next.set(instantNewsId(url), { slug: article.slug, title: article.title, url });
    }
    for (let page = 1; ; page++) {
      if (page > 100) throw new Error('Archive too large');
      const params = new URLSearchParams({ page: String(page), perPage: '500', fields: 'id,slug,titulo', filter: 'oculto=false', sort: 'id' });
      const response = await fetchImpl(`${pbHost}/api/collections/nw3_noticias/records?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Archive unavailable');
      const data = await response.json();
      for (const record of data.items || []) {
        const url = `${siteUrl}/noticias/${record.slug}`;
        next.set(instantNewsId(url), { id: record.id, slug: record.slug, title: record.titulo, url });
      }
      if (page >= data.totalPages || !data.items?.length) break;
    }
    index = next; updated = Date.now();
  };
  return async (id) => {
    if (!/^[a-f0-9]{16}$/.test(id)) return null;
    if (!updated || Date.now() - updated > 300000) {
      if (!pending) pending = refresh().finally(() => { pending = null; });
      await pending;
    }
    const match = index.get(id);
    if (!match) return null;
    if (!match.id) return { ok: true, title: match.title, url: match.url, embedded: true };
    const params = new URLSearchParams({ filter: `id="${match.id}" && oculto=false`, fields: 'titulo,contenido,fecha,created,fuente_label,fuente_url,categoria,autor,editor', perPage: '1' });
    const response = await fetchImpl(`${pbHost}/api/collections/nw3_noticias/records?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Article unavailable');
    const record = (await response.json()).items?.[0];
    if (!record) return null;
    return { ok: true, title: record.titulo, source: match.url, publisher: 'Noticiasweb3', publisher_name: record.fuente_label || 'Noticiasweb3',
      published_at: record.fecha || record.created, author: record.autor || '', editor: record.editor || '',
      blocks: String(record.contenido || '').split(/\n\s*\n/).filter(Boolean).map(text => ({ type: 'p', text })), url: match.url };
  };
}
