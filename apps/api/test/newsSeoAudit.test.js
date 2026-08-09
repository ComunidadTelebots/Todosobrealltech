import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNewsSeoAudit } from '../src/utils/newsSeoAudit.js';

const valid = (id, overrides = {}) => ({
  id,
  titulo: `Una noticia tecnologica completa y descriptiva numero ${id}`,
  slug: `noticia-tecnologica-completa-${id}`,
  contenido: 'Contenido editorial propio y verificable. '.repeat(12),
  categoria: 'Tecnologia',
  fuente_url: 'https://example.com/fuente',
  imagen: 'https://example.com/imagen.jpg',
  ...overrides,
});

test('SEO audit reports a healthy valid article', () => {
  const result = buildNewsSeoAudit([valid('uno')]);
  assert.deepEqual(result.summary, { total: 1, healthy: 1, affected: 0, errors: 0, warnings: 0, quality_percent: 100 });
  assert.deepEqual(result.issues, []);
});

test('SEO audit detects duplicate titles and slugs', () => {
  const result = buildNewsSeoAudit([valid('uno'), valid('dos', {
    titulo: valid('uno').titulo.toUpperCase(),
    slug: valid('uno').slug,
  })]);
  assert.equal(result.issues.filter((item) => item.code === 'duplicate_title').length, 2);
  assert.equal(result.issues.filter((item) => item.code === 'duplicate_slug').length, 2);
  assert.equal(result.summary.errors, 4);
});

test('SEO audit reports missing metadata and unsafe URL schemes', () => {
  const result = buildNewsSeoAudit([valid('uno', {
    titulo: 'Breve', slug: 'Slug Incorrecto', contenido: 'Poco', categoria: '',
    fuente_url: 'javascript:alert(1)', imagen: 'file:///tmp/image.png',
  })]);
  const codes = new Set(result.issues.map((item) => item.code));
  for (const code of ['title_short', 'slug_invalid', 'content_short', 'category_missing', 'source_missing', 'image_invalid']) assert.ok(codes.has(code));
});
