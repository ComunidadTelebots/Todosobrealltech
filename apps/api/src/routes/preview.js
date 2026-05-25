import { Router } from 'express';
import staticArticles from '../data/staticArticles.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://noticiasweb3.todosobreall.tech';
const SITE_NAME = process.env.SITE_NAME || 'NW3 - Noticiasweb3';
const PB_HOST = process.env.POCKETBASE_HOST || 'http://localhost:8090';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ISO 8601 for article:published_time, or null when the value is unparseable.
function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Human-readable Spanish date. Passes through values that are already prose
// (e.g. PocketBase's "25 de Mayo del 2026") rather than mangling them.
function displayDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} del ${d.getFullYear()}`;
}

function splitParagraphs(text = '') {
  return String(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Resolve a PocketBase image field to an absolute URL. File fields store only a
// filename, so build the /api/files URL; values that are already absolute pass
// through unchanged. Returns null when there is no image (caller falls back to
// og-default.png).
function resolveImageUrl(raw, record) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${PB_HOST}/api/files/${record.collectionId}/${record.id}/${encodeURIComponent(raw)}`;
}

async function findArticle(slug) {
  // 1. PocketBase (dynamic articles). Read is public, same as the RSS/view routes.
  try {
    const url = `${PB_HOST}/api/collections/nw3_noticias/records`
      + `?filter=${encodeURIComponent(`slug="${slug}"`)}&perPage=1`;
    const pbRes = await fetch(url);
    if (pbRes.ok) {
      const data = await pbRes.json();
      const r = data.items?.[0];
      if (r) {
        return {
          slug: r.slug,
          title: r.titulo || '',
          category: r.categoria || '',
          displayDate: r.fecha || displayDate(r.created),
          publishedIso: toIso(r.created || r.fecha),
          bodyParas: splitParagraphs(r.contenido),
          description: (r.contenido || '').replace(/\s+/g, ' ').trim().slice(0, 200),
          image: resolveImageUrl(r.imagen || r.image || r.cover, r),
          source: r.fuente_url ? { url: r.fuente_url, label: r.fuente_label || r.fuente_url } : null,
        };
      }
    }
  } catch {
    // PocketBase unreachable — fall through to static articles.
  }

  // 2. Static articles (staticArticles.js mirror).
  const a = staticArticles.find((art) => art.slug === slug);
  if (a) {
    return {
      slug: a.slug,
      title: a.title || '',
      category: a.category || '',
      displayDate: displayDate(a.date),
      publishedIso: toIso(a.date),
      bodyParas: splitParagraphs(a.description),
      description: (a.description || '').slice(0, 200),
      image: null,
      source: null,
    };
  }

  return null;
}

// Up to `limit` other articles in the same category, for the related section.
// Tries PocketBase first (same source as findArticle), then falls back to the
// static mirror. Returns [{ slug, title }].
async function findRelated(category, excludeSlug, limit = 3) {
  if (!category) return [];

  // 1. PocketBase.
  try {
    const filter = `categoria="${category}" && slug!="${excludeSlug}"`;
    const url = `${PB_HOST}/api/collections/nw3_noticias/records`
      + `?filter=${encodeURIComponent(filter)}&perPage=${limit}&sort=-created&fields=slug,titulo`;
    const pbRes = await fetch(url);
    if (pbRes.ok) {
      const data = await pbRes.json();
      const items = (data.items || [])
        .map((r) => ({ slug: r.slug, title: r.titulo }))
        .filter((r) => r.slug);
      if (items.length) return items;
    }
  } catch {
    // PocketBase unreachable — fall through to static articles.
  }

  // 2. Static articles (staticArticles.js mirror).
  return staticArticles
    .filter((a) => a.category === category && a.slug !== excludeSlug)
    .slice(0, limit)
    .map((a) => ({ slug: a.slug, title: a.title || '' }));
}

function renderArticleHtml(article, related = []) {
  const webUrl = `${SITE_URL}/noticias/${encodeURIComponent(article.slug)}`;
  const image = article.image || DEFAULT_OG_IMAGE;
  const title = escapeHtml(article.title);
  const description = escapeHtml(article.description || article.title);

  const metaCategory = article.category
    ? `<meta property="article:section" content="${escapeHtml(article.category)}" />`
    : '';
  const metaPublished = article.publishedIso
    ? `<meta property="article:published_time" content="${article.publishedIso}" />`
    : '';

  const figureHtml = article.image
    ? `\n      <figure>\n        <img src="${escapeHtml(article.image)}" alt="${title}" />\n      </figure>`
    : '';

  const bodyHtml = article.bodyParas.length
    ? article.bodyParas.map((p) => `      <p>${escapeHtml(p)}</p>`).join('\n')
    : `      <p>${description}</p>`;

  const sourceHtml = article.source
    ? `\n      <p class="source">Fuente: <a href="${escapeHtml(article.source.url)}" rel="noopener noreferrer">${escapeHtml(article.source.label)}</a></p>`
    : '';

  const relatedHtml = related.length
    ? `\n      <section class="related">\n        <h2>Artículos relacionados</h2>\n        <ul>\n`
      + related
        .map((r) => `          <li><a href="${escapeHtml(`${SITE_URL}/noticias/${encodeURIComponent(r.slug)}`)}">${escapeHtml(r.title)}</a></li>`)
        .join('\n')
      + `\n        </ul>\n      </section>`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — ${escapeHtml(SITE_NAME)}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="${escapeHtml(SITE_NAME)}" />
    <link rel="canonical" href="${escapeHtml(webUrl)}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(webUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:locale" content="es_ES" />
    ${metaPublished}
    ${metaCategory}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="telegram:channel" content="@TodoSobreAllTech" />

    <style>
      body { font-family: -apple-system, system-ui, "PT Sans", Arial, sans-serif; line-height: 1.6; color: #222; max-width: 720px; margin: 0 auto; padding: 24px 16px; }
      h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 8px; }
      figure { margin: 0 0 20px; }
      figure img { max-width: 100%; height: auto; display: block; }
      p { margin: 0 0 16px; }
      .source { color: #555; font-size: 0.9rem; }
      .related { margin-top: 28px; padding-top: 16px; border-top: 1px solid #ddd; }
      .related h2 { font-size: 1.1rem; margin: 0 0 12px; }
      .related ul { margin: 0; padding-left: 20px; }
      .related li { margin: 0 0 6px; }
      .original { margin-top: 28px; padding-top: 16px; border-top: 1px solid #ddd; }
      a { color: #1982d1; }
    </style>
  </head>
  <body>
    <article>
      <h1>${title}</h1>${figureHtml}
${bodyHtml}${sourceHtml}
      <p class="original"><a href="${escapeHtml(webUrl)}">Leer en ${escapeHtml(SITE_NAME)} →</a></p>${relatedHtml}
    </article>
  </body>
</html>`;
}

function renderNotFoundHtml(slug) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Noticia no encontrada — ${escapeHtml(SITE_NAME)}</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <article>
      <h1>Noticia no encontrada</h1>
      <p>No existe ninguna noticia con el identificador <code>${escapeHtml(slug)}</code>.</p>
      <p><a href="${escapeHtml(`${SITE_URL}/noticias`)}">Volver a noticias →</a></p>
    </article>
  </body>
</html>`;
}

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const article = await findArticle(slug);
    res.set('Content-Type', 'text/html; charset=utf-8');

    if (!article) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.status(404).send(renderNotFoundHtml(slug));
    }

    const related = await findRelated(article.category, article.slug);
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(renderArticleHtml(article, related));
  } catch {
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(renderNotFoundHtml(slug));
  }
});

export default router;
