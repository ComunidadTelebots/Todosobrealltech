import test from 'node:test';
import assert from 'node:assert/strict';
import { houseAdMatches, normalizeHouseAd, normalizeTelegramBoostUrl } from '../src/utils/houseAdsPolicy.js';

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
