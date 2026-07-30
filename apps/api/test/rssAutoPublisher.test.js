import test from 'node:test';
import assert from 'node:assert/strict';

import {
  htmlToPlainText,
  isWorkerPublishedRecord,
  shouldDelayChannelEdit,
  sourceUrlFromTelegramPost,
  summarize,
} from '../src/utils/rssAutoPublisher.js';

test('detecta el enlace de IFTTT sin confundirlo con el post de Telegram', () => {
  const html = '<p>Titular breve</p><a href="https://ift.tt/abc123">Fuente</a>';
  assert.equal(
    sourceUrlFromTelegramPost(html, 'https://t.me/TodoSobreAllTech/123'),
    'https://ift.tt/abc123',
  );
});

test('prefiere una fuente externa y conserva Telegram solo como respaldo', () => {
  assert.equal(
    sourceUrlFromTelegramPost(
      '<a href="https://inside.ad/es">Publicidad</a><a href="https://example.org/noticia">Noticia</a>',
      'https://t.me/TodoSobreAllTech/124',
    ),
    'https://example.org/noticia',
  );
});

test('el resumen de Telegram contiene una sola frase breve', () => {
  const result = summarize('Primera frase informativa. Segunda frase que no debe publicarse.');
  assert.equal(result, 'Primera frase informativa.');
  assert.ok(result.length <= 180);
});

test('conserva el destino de los enlaces insertados por Inside Ads', () => {
  const text = htmlToPlainText('<p>Noticia</p><a href="https://t.me/anunciante">Publicidad</a>');
  assert.match(text, /Publicidad \(https:\/\/t\.me\/anunciante\)/);
});

test('el backfill reconoce posts propios y no los reescribe', () => {
  assert.equal(isWorkerPublishedRecord({
    telegram_url: 'https://t.me/TodoSobreAllTech/100',
    fuente_label: 'Hispasec',
  }), true);
  assert.equal(isWorkerPublishedRecord({
    telegram_url: 'https://t.me/TodoSobreAllTech/101',
    fuente_label: '@TodoSobreAllTech en Telegram',
  }), false);
});

test('aplaza cinco minutos la edición de posts recientes', () => {
  const now = Date.parse('2026-07-31T12:00:00Z');
  assert.equal(shouldDelayChannelEdit('2026-07-31T11:58:00Z', now), true);
  assert.equal(shouldDelayChannelEdit('2026-07-31T11:50:00Z', now), false);
});
