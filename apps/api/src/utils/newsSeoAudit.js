const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const plainText = (value) => compact(String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' '));

const normalized = (value) => compact(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const isHttpUrl = (value) => {
  if (!value) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
};
const issue = (article, code, severity, message) => ({
  article_id: String(article.id || ''),
  title: compact(article.titulo) || 'Sin titulo',
  slug: compact(article.slug),
  code,
  severity,
  message,
});

export const buildNewsSeoAudit = (articles = []) => {
  const rows = Array.isArray(articles) ? articles : [];
  const issues = [];
  const titleGroups = new Map();
  const slugGroups = new Map();

  for (const article of rows) {
    const title = compact(article.titulo);
    const slug = compact(article.slug);
    const content = plainText(article.contenido);
    const normalizedTitle = normalized(title);
    const normalizedSlug = normalized(slug);
    if (normalizedTitle) titleGroups.set(normalizedTitle, [...(titleGroups.get(normalizedTitle) || []), article]);
    if (normalizedSlug) slugGroups.set(normalizedSlug, [...(slugGroups.get(normalizedSlug) || []), article]);

    if (title.length < 30) issues.push(issue(article, 'title_short', 'warning', 'El titulo tiene menos de 30 caracteres.'));
    if (title.length > 90) issues.push(issue(article, 'title_long', 'warning', 'El titulo supera los 90 caracteres.'));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) issues.push(issue(article, 'slug_invalid', 'error', 'El slug debe usar minusculas, numeros y guiones.'));
    if (content.length < 300) issues.push(issue(article, 'content_short', 'warning', 'El contenido tiene menos de 300 caracteres utiles.'));
    if (!compact(article.categoria)) issues.push(issue(article, 'category_missing', 'warning', 'Falta la categoria.'));
    if (!isHttpUrl(article.fuente_url)) issues.push(issue(article, 'source_missing', 'warning', 'Falta una URL de fuente HTTP(S) valida.'));
    if (article.imagen && !isHttpUrl(article.imagen)) issues.push(issue(article, 'image_invalid', 'warning', 'La imagen no usa una URL HTTP(S) valida.'));
  }

  const appendDuplicates = (groups, code, label) => {
    for (const duplicates of groups.values()) {
      if (duplicates.length < 2) continue;
      for (const article of duplicates) issues.push(issue(article, code, 'error', `${label} duplicado en ${duplicates.length} publicaciones.`));
    }
  };
  appendDuplicates(titleGroups, 'duplicate_title', 'Titulo');
  appendDuplicates(slugGroups, 'duplicate_slug', 'Slug');

  const affected = new Set(issues.map((item) => item.article_id).filter(Boolean)).size;
  const errors = issues.filter((item) => item.severity === 'error').length;
  const warnings = issues.length - errors;
  const healthy = Math.max(0, rows.length - affected);
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total: rows.length,
      healthy,
      affected,
      errors,
      warnings,
      quality_percent: rows.length ? Math.round((healthy / rows.length) * 100) : 100,
    },
    issues: issues.sort((a, b) => (a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === 'error' ? -1 : 1)),
  };
};
