import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Isolate internal archive requests from long-lived global fetch connections.
export function archiveFetch(url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === 'https:' ? https : http).get(target, { agent: false, timeout: 15000 }, response => {
      let size = 0; const chunks = [];
      response.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) response.destroy(new Error('Archive response too large')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => resolve({ ok: response.statusCode === 200, status: response.statusCode, json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    request.on('timeout', () => request.destroy(new Error('Archive request timed out')));
    request.on('error', reject);
  });
}
export const instantNewsId = (url) => createHash('sha256').update(url).digest('hex').slice(0, 16);
export function createNewsResolver({ pbHost, siteUrl, staticArticles, fetchImpl = archiveFetch, cacheFile = null }) {
  let index = new Map(), updated = 0, pending, loaded = false;
  const refresh = async () => {
    const next = new Map();
    for (const article of staticArticles) {
      const url = `${siteUrl}/noticias/${article.slug}`;
      next.set(instantNewsId(url), { slug: article.slug, title: article.title, url });
    }
    for (let page = 1; ; page++) {
      if (page > 100) throw new Error('Archive too large');
      const params = new URLSearchParams({ page: String(page), perPage: '500', fields: 'id,slug,titulo', filter: 'oculto=false', sort: 'id' });
      const response = await fetchImpl(`${pbHost}/api/collections/nw3_noticias/records?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Archive unavailable: HTTP '+response.status+' page '+page);
      const data = await response.json();
      for (const record of data.items || []) {
        const url = `${siteUrl}/noticias/${record.slug}`;
        next.set(instantNewsId(url), { id: record.id, slug: record.slug, title: record.titulo, url });
      }
      if (page >= data.totalPages || !data.items?.length) break;
    }
    index = next; updated = Date.now();
    if(cacheFile) await fs.writeFile(cacheFile, JSON.stringify({updated,rows:[...index]})).catch(()=>{});
  };
  return async (id) => {
    if (!/^[a-f0-9]{16}$/.test(id)) return null;
    if(!loaded){loaded=true;if(cacheFile){try{const saved=JSON.parse(await fs.readFile(cacheFile,'utf8'));index=new Map(saved.rows);updated=Number(saved.updated)||0;}catch{}}}
    if (!updated || (!index.has(id) && Date.now()-updated>60000)) {
      if (!pending) pending = refresh().finally(() => { pending = null; });
      await pending;
    }
    const match = index.get(id);
    if (!match) return null;
    if (!match.id) return { ok: true, title: match.title, url: match.url, embedded: true };
    const params = new URLSearchParams({ filter: `id="${match.id}" && oculto=false`, fields: 'titulo,contenido,fecha,created,fuente_label,fuente_url,categoria,autor,editor', perPage: '1' });
    const response = await fetchImpl(`${pbHost}/api/collections/nw3_noticias/records?${params}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Article unavailable');
    const record = (await response.json()).items?.[0];
    if (!record) return null;
    return { ok: true, title: record.titulo, source: match.url, publisher: 'Noticiasweb3', publisher_name: record.fuente_label || 'Noticiasweb3',
      published_at: record.fecha || record.created, author: record.autor || '', editor: record.editor || '',
      blocks: String(record.contenido || '').split(/\n\s*\n/).filter(Boolean).map(text => ({ type: 'p', text })), url: match.url };
  };
}
