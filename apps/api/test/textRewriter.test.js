import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteText } from '../src/utils/textRewriter.js';

test('rewriteText is deterministic and adds an editorial introduction', () => {
  const source = 'La plataforma publica una actualización importante. Además mejora la seguridad.';
  const first = rewriteText(source, 'Tecnología');
  assert.equal(first, rewriteText(source, 'Tecnología'));
  assert.match(first, /actualidad|innovación/i);
  assert.match(first, /también/i);
});

test('rewriteText removes external URLs and email addresses', () => {
  const result = rewriteText(
    'Consulta https://example.com/noticia para conocer los detalles. Escribe a test@example.com.',
    'Ciberseguridad',
  );
  assert.doesNotMatch(result, /https?:\/\//i);
  assert.doesNotMatch(result, /test@example\.com/i);
});

test('rewriteText handles empty input and removes duplicate fragments', () => {
  assert.equal(rewriteText('', 'Tecnología'), '');
  const result = rewriteText('El sistema funciona. El sistema funciona. La prueba ha terminado.', 'Tecnología');
  assert.equal((result.match(/El sistema funciona/gi) || []).length, 1);
});
