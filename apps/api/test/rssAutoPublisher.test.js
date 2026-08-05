import test from 'node:test';
import assert from 'node:assert/strict';

import {
  htmlToPlainText,
  hasInsideAdsPromotion,
  extractInsideAdsPromotion,
  extractInsideAdsButton,
  buildTelegramPostKeyboard,
  formatTelegramHouseAd,
  formatTelegramHouseAdMarkdown,
  formatTelegramNewsRichMarkdown,
  formatTelegramBackfillRichMarkdown,
  telegramHouseAdTrackingUrl,
  parseTelegramViewCount,
  cleanTelegramSummaryText,
  cleanTelegramEditedBase,
  isWorkerPublishedRecord,
  shouldDelayChannelEdit,
  sourceUrlFromTelegramPost,
  summarize,
  telegramPendingFilter,
  telegramPublishFailureStatus,
} from '../src/utils/rssAutoPublisher.js';

test('detecta el enlace de IFTTT sin confundirlo con el post de Telegram', () => {
  const html = '<p>Titular breve</p><a href="https://ift.tt/abc123">Fuente</a>';
  assert.equal(
    sourceUrlFromTelegramPost(html, 'https://t.me/TodoSobreAllTech/123'),
    'https://ift.tt/abc123',
  );
});

test('mantiene una salida fallida en cola hasta agotar los reintentos', () => {
  assert.equal(telegramPublishFailureStatus(1), 'pending');
  assert.equal(telegramPublishFailureStatus(9), 'pending');
  assert.equal(telegramPublishFailureStatus(10), 'failed');
});

test('recupera pendientes y noticias recientes de feeds publicables', () => {
  const filter = telegramPendingFilter(Date.parse('2026-07-31T12:00:00Z'));
  assert.match(filter, /telegram_publish_status="pending"/);
  assert.match(filter, /created>="2026-07-29T12:00:00\.000Z"/);
  assert.match(filter, /fuente_label="RSS Telegram Alltech"/);
  assert.doesNotMatch(filter, /fuente_label="@TodoSobreAllTech"/);
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

test('protege el texto y el botón cuando Inside Ads ya procesó el post', () => {
  assert.equal(hasInsideAdsPromotion('Publicidad: oferta\nhttps://inside.ad/es'), true);
  assert.equal(hasInsideAdsPromotion('Anuncio - canal recomendado'), true);
  assert.equal(hasInsideAdsPromotion('Titular normal sin campaña'), false);
});

test('separa Inside Ads para conservarlo tras NoticiasWeb3 y la campaña comunitaria', () => {
  const source = 'Titular\n\nResumen original\n\n@InsideAds_bot\nPublicidad de ejemplo\nhttps://inside.ad/click';
  const parts = extractInsideAdsPromotion(source);
  assert.match(parts.editorialText, /Titular/);
  assert.doesNotMatch(parts.editorialText, /InsideAds/);
  assert.match(parts.promotionText, /@InsideAds_bot/);
  const output = formatTelegramBackfillRichMarkdown(source, 'noticia-prueba', 'Tecnología', '#Tecnología #NW3', {
    id: 'official-test', title: 'Comunidad', description: 'Canal recomendado', cta: 'Unirme',
  });
  assert.match(output, /Leer en NoticiasWeb3/);
  assert.match(output, /COMUNIDAD DESTACADA/);
  assert.match(output, /PUBLICIDAD · INSIDE ADS/);
  assert.match(output, /inside\.ad\/click/);
});

test('recupera de forma segura el botón HTTPS aportado por Inside Ads', () => {
  assert.deepEqual(
    extractInsideAdsButton('Titular\n\n@InsideAds_bot\nAbrir oferta (https://inside.ad/click/123)'),
    { text: 'Abrir oferta', url: 'https://inside.ad/click/123' },
  );
  assert.equal(extractInsideAdsButton('@InsideAds_bot\nAbrir (javascript:alert(1))'), null);
});

test('ordena los botones inline como noticia, Inside Ads y comunidad', () => {
  const keyboard = buildTelegramPostKeyboard('https://t.me/iv?url=noticia',
    { id: 'official-test', cta: 'Seguir comunidad' },
    { text: 'Ver anuncio', url: 'https://inside.ad/click/1' });
  assert.deepEqual(keyboard.inline_keyboard.map((row) => row.map((button) => button.text)),
    [['Leer noticia'], ['Ver anuncio', 'Seguir comunidad']]);
});

test('crea una tarjeta Telegram compacta con seguimiento propio', () => {
  const ad = { id: 'official-test', title: 'Canal <oficial>', description: 'Noticias & comunidad', cta: 'Abrir' };
  const card = formatTelegramHouseAd(ad);
  assert.match(card, /^<blockquote>/);
  assert.match(card, /Recomendado por TodoSobreAllTech/);
  assert.match(card, /Canal &lt;oficial&gt;/);
  assert.match(card, /Noticias &amp; comunidad/);
  assert.match(card, /community-cards\/official-test\/click\?placement=telegram_channel/);
  assert.equal(
    telegramHouseAdTrackingUrl(ad),
    'https://todosobreall.tech/hcgi/api/community-cards/official-test/click?placement=telegram_channel',
  );
});

test('genera el anuncio y la noticia como Rich Markdown 10.2 sin imágenes externas', () => {
  const ad = { id: 'official-test', title: 'Canal oficial', description: 'Noticias y comunidad', cta: 'Abrir' };
  const campaign = formatTelegramHouseAdMarkdown(ad);
  assert.match(campaign, /^> \*\*📣 COMUNIDAD DESTACADA\*\*/);
  assert.match(campaign, /> \*\*Canal oficial\*\* · Noticias y comunidad/);
  assert.doesNotMatch(campaign, /!\[|<img|https?:\/\/[^\s)]*\.(?:png|jpe?g|gif|webp)/i);

  const message = formatTelegramNewsRichMarkdown({ titulo: 'Titular', excerpt: 'Una frase breve.', categoria: 'IA', hashtags: '#IA #NW3' }, 'titular', ad);
  assert.match(message, /^## 📰 Titular/);
  assert.match(message, /\[Leer en NoticiasWeb3\]\(https:\/\/t\.me\/iv\?/);
  assert.match(message, /\n\n---\n\n> \*\*📣 COMUNIDAD DESTACADA\*\*/);
});

test('el backfill genera el mismo diseño Rich Markdown 10.2', () => {
  const ad = { id: 'official-test', title: 'Comunidad', description: 'Canales oficiales', cta: 'Unirme' };
  const message = formatTelegramBackfillRichMarkdown(
    'Titular de la noticia\n\nUna frase breve para el canal.\nhttps://ift.tt/demo',
    'titular-de-la-noticia',
    'Tecnología',
    '#Tecnología #NW3',
    ad,
  );
  assert.match(message, /^## /);
  assert.match(message, /Titular de la noticia/);
  assert.match(message, /\[Leer en NoticiasWeb3\]\(https:\/\/t\.me\/iv\?/);
  assert.match(message, /> \*\*📣 COMUNIDAD DESTACADA\*\*/);
  assert.doesNotMatch(message, /<blockquote>|ift\.tt/);
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

test('procesa inmediatamente posts recientes antes de que Inside Ads los amplíe', () => {
  const now = Date.parse('2026-07-31T12:00:00Z');
  assert.equal(shouldDelayChannelEdit('2026-07-31T11:58:00Z', now), false);
  assert.equal(shouldDelayChannelEdit('2026-07-31T11:50:00Z', now), false);
});

test('interpreta el contador oficial compacto de Telegram', () => {
  assert.equal(parseTelegramViewCount('987'), 987);
  assert.equal(parseTelegramViewCount('1.2K'), 1200);
  assert.equal(parseTelegramViewCount('3,4M'), 3400000);
  assert.equal(parseTelegramViewCount('sin datos'), null);
});

test('el resumen del canal elimina titular repetido y marcas del feed', () => {
  const clean = cleanTelegramSummaryText([
    'Una nueva versión de Telegram mejora las llamadas',
    'NoticiasWeb3',
    'Una nueva versión de Telegram mejora las llamadas con mejor calidad.',
    'Fuente: ejemplo.com',
    'Leer la noticia en NoticiasWeb3',
  ].join('\n'), 'Una nueva versión de Telegram mejora las llamadas');
  assert.equal(clean, 'Una nueva versión de Telegram mejora las llamadas con mejor calidad.');
});

test('la edición del post original elimina residuos antes de añadir NoticiasWeb3', () => {
  const clean = cleanTelegramEditedBase([
    'Telegram estrena llamadas más seguras',
    'Una actualización mejora el cifrado para todos los usuarios.',
    'https://ift.tt/abc123',
    'Fuente: medio.example',
    'NoticiasWeb3',
    'Leer la noticia en NoticiasWeb3',
  ].join('\n'));
  assert.equal(clean, [
    'Telegram estrena llamadas más seguras',
    '',
    'Una actualización mejora el cifrado para todos los usuarios.',
  ].join('\n'));
});

test('el backfill elimina paréntesis huérfanos y fragmentos repetidos de IFTTT', () => {
  const clean = cleanTelegramEditedBase([
    'BMW va a despedir a 8.000 empleados en Alemania. La clave está en su productividad (https://ift.tt/demo',
    'BMW va a despedir a 8.000 empleados en Alemania. La clave está en su productividad',
    'Una reestructuración busca reducir costes durante este año.',
  ].join('\n'));
  assert.equal(clean, [
    'BMW va a despedir a 8.000 empleados en Alemania. La clave está en su productividad',
    '',
    'Una reestructuración busca reducir costes durante este año.',
  ].join('\n'));
});
