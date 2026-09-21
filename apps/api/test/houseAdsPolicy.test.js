import test from 'node:test';
import assert from 'node:assert/strict';
import { disclosureFor, houseAdMatches, normalizeHouseAd, normalizeHouseAdDestination, normalizeTelegramBoostUrl, normalizeTelegramTargetIds, selectAdVariant } from '../src/utils/houseAdsPolicy.js';

test('normaliza controles de entrega sin aceptar valores arbitrarios', () => {
  const ad = normalizeHouseAd({ placements: ['top', 'evil'], allowed_sites: ['noticiasweb3', 'bad'], display_seconds: 999, frequency_cap: -2 });
  assert.deepEqual(ad.placements, ['top']);
  assert.deepEqual(ad.allowed_sites, ['noticiasweb3']);
  assert.equal(ad.display_seconds, 300);
  assert.equal(ad.frequency_cap, 0);
});

test('acepta solo enlaces boost oficiales de Telegram', () => {
  assert.equal(normalizeTelegramBoostUrl('https://t.me/boost/TodoSobreAllTech'), 'https://t.me/boost/TodoSobreAllTech');
  assert.equal(normalizeTelegramBoostUrl('https://t.me/boost?c=1234567890'), 'https://t.me/boost?c=1234567890');
  assert.equal(normalizeTelegramBoostUrl('https://evil.example/boost/TodoSobreAllTech'), '');
  assert.equal(normalizeTelegramBoostUrl('javascript:alert(1)'), '');
});

test('normaliza enlaces boost de campaña y de cada chat comunitario', () => {
  const ad = normalizeHouseAd({
    boost_url: 'https://telegram.me/boost/canal_publico',
    community_items: [
      { id: '1', boost_url: 'https://t.me/boost?c=123456' },
      { id: '2', boost_url: 'https://example.com/not-telegram' },
    ],
  });
  assert.equal(ad.boost_url, 'https://t.me/boost/canal_publico');
  assert.equal(ad.community_items[0].boost_url, 'https://t.me/boost?c=123456');
  assert.equal(ad.community_items[1].boost_url, '');
});

test('filtra por sitio, posición y objetivos', () => {
  const ad = { placements: ['inline'], allowed_sites: ['noticiasweb3'], max_impressions: 10, impressions: 9 };
  assert.equal(houseAdMatches(ad, { placement: 'inline', site: 'noticiasweb3' }), true);
  assert.equal(houseAdMatches(ad, { placement: 'top', site: 'noticiasweb3' }), false);
  assert.equal(houseAdMatches({ ...ad, impressions: 10 }, { placement: 'inline', site: 'noticiasweb3' }), false);
});

test('acepta destinos HTTPS de Telegram y terceros y rechaza esquemas inseguros', () => {
  assert.equal(normalizeHouseAdDestination('https://inside.ad?ref=m_163103382'), 'https://inside.ad/?ref=m_163103382');
  assert.equal(normalizeHouseAdDestination('https://example.org/path?q=1'), 'https://example.org/path?q=1');
  assert.equal(normalizeHouseAdDestination('http://inside.ad?ref=m_163103382'), '');
  assert.equal(normalizeHouseAdDestination('javascript:alert(1)'), '');
});

test('normaliza audiencia y destinos separados por superficie', () => {
  const ad = normalizeHouseAd({ audience: 'channel_owner', web_url: 'https://inside.ad?ref=r_1', telegram_url: 'https://t.me/bot?start=r_1' });
  assert.equal(ad.audience, 'channel_owner');
  assert.equal(ad.web_url, 'https://inside.ad/?ref=r_1');
  assert.equal(ad.telegram_url, 'https://t.me/bot?start=r_1');
});

test('segmenta campañas de Telegram por canales y grupos concretos', () => {
  const ad = { placements: ['telegram_channel'], allowed_sites: ['telegram_channel'], target_channel_ids: ['-1001234567890'], target_group_ids: ['-1009876543210'] };
  assert.equal(houseAdMatches(ad, { placement: 'telegram_channel', site: 'telegram_channel', chatId: '-1001234567890', chatType: 'channel' }), true);
  assert.equal(houseAdMatches(ad, { placement: 'telegram_channel', site: 'telegram_channel', chatId: '-1000000000000', chatType: 'channel' }), false);
  assert.equal(houseAdMatches(ad, { placement: 'telegram_channel', site: 'telegram_channel' }), false);
});

test('aplica inclusión y exclusión geográfica y lingüística', () => {
  const ad = { target_countries: ['ES', 'MX'], excluded_countries: ['US'], target_languages: ['es'], excluded_languages: ['ru'] };
  assert.equal(houseAdMatches(ad, { country: 'ES', language: 'es-ES' }), true);
  assert.equal(houseAdMatches(ad, { country: 'US', language: 'es' }), false);
  assert.equal(houseAdMatches(ad, { country: 'ES', language: 'ru' }), false);
  assert.equal(houseAdMatches(ad, { country: 'FR', language: 'es' }), false);
});

test('las exclusiones de chat prevalecen sobre destinos incluidos', () => {
  const ad = { target_channel_ids: ['-1001234567890'], excluded_channel_ids: ['-1001234567890'] };
  assert.equal(houseAdMatches(ad, { chatId: '-1001234567890', chatType: 'channel' }), false);
});

test('respeta días, franja horaria y zona IANA incluso al cruzar medianoche', () => {
  const workday = { delivery_days: [1], delivery_start: '10:00', delivery_end: '14:00', delivery_timezone: 'Europe/Madrid' };
  assert.equal(houseAdMatches(workday, { now: new Date('2026-08-10T10:00:00Z') }), true);
  assert.equal(houseAdMatches(workday, { now: new Date('2026-08-10T14:00:00Z') }), false);
  const overnight = { delivery_start: '22:00', delivery_end: '06:00', delivery_timezone: 'UTC' };
  assert.equal(houseAdMatches(overnight, { now: new Date('2026-08-10T23:00:00Z') }), true);
  assert.equal(houseAdMatches(overnight, { now: new Date('2026-08-10T12:00:00Z') }), false);
});

test('aplica reglas de categoría, inclusión y exclusión contextual', () => {
  const ad = { content_categories: ['seguridad'], include_keywords: ['telegram'], exclude_keywords: ['apuestas'] };
  assert.equal(houseAdMatches(ad, { contentCategory: 'seguridad', contentText: 'Privacidad en Telegram' }), true);
  assert.equal(houseAdMatches(ad, { contentCategory: 'gaming', contentText: 'Telegram' }), false);
  assert.equal(houseAdMatches(ad, { contentCategory: 'seguridad', contentText: 'Telegram y apuestas' }), false);
  assert.equal(houseAdMatches(ad, { contentCategory: 'seguridad', contentText: 'Otra plataforma' }), false);
});

test('normaliza y aplica presupuesto diario de entrega', () => {
  const ad = normalizeHouseAd({ daily_click_cap: 20, daily_impression_cap: 100, clicks_today: 19, impressions_today: 99 });
  assert.equal(ad.daily_click_cap, 20);
  assert.equal(ad.daily_impression_cap, 100);
  assert.equal(houseAdMatches(ad), true);
  assert.equal(houseAdMatches({ ...ad, clicks_today: 20 }), false);
  assert.equal(houseAdMatches({ ...ad, impressions_today: 100 }), false);
});

test('normaliza transparencia y variantes A/B con asignaciÃ³n estable', () => {
  const ad = normalizeHouseAd({ id: 'ad-1', url: 'https://inside.ad/?ref=secret', ab_enabled: true, variants: [
    { id: 'a', title: 'A', weight: 50 }, { id: 'b', title: 'B', weight: 50 }, { id: '<script>', title: 'C', weight: 999 },
  ] });
  assert.equal(ad.disclosure_type, 'inside_ads');
  assert.equal(ad.variants[2].id, 'script');
  assert.equal(ad.variants[2].weight, 100);
  assert.equal(disclosureFor(ad).paid, true);
  assert.deepEqual(selectAdVariant(ad, 'same-viewer'), selectAdVariant(ad, 'same-viewer'));
  assert.ok(['a', 'b', 'script'].includes(selectAdVariant(ad, 'same-viewer').variant_id));
});

test('valida listas de destinos sin iterar objetos o cadenas maliciosas', () => {
  assert.deepEqual(normalizeTelegramTargetIds('123456'), []);
  assert.deepEqual(normalizeTelegramTargetIds({ 0: '-1001234567890' }), []);
  assert.deepEqual(normalizeTelegramTargetIds(['-1001234567890', 'javascript:1', '-1001234567890'], 100), ['-1001234567890']);
});
