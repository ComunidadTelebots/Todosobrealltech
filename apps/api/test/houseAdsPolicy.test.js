import test from 'node:test';
import assert from 'node:assert/strict';
import { houseAdMatches, normalizeHouseAd } from '../src/utils/houseAdsPolicy.js';

test('normaliza controles de entrega sin aceptar valores arbitrarios', () => {
  const ad = normalizeHouseAd({ placements: ['top', 'evil'], allowed_sites: ['noticiasweb3', 'bad'], display_seconds: 999, frequency_cap: -2 });
  assert.deepEqual(ad.placements, ['top']);
  assert.deepEqual(ad.allowed_sites, ['noticiasweb3']);
  assert.equal(ad.display_seconds, 300);
  assert.equal(ad.frequency_cap, 0);
});

test('filtra por sitio, posición y objetivos', () => {
  const ad = { placements: ['inline'], allowed_sites: ['noticiasweb3'], max_impressions: 10, impressions: 9 };
  assert.equal(houseAdMatches(ad, { placement: 'inline', site: 'noticiasweb3' }), true);
  assert.equal(houseAdMatches(ad, { placement: 'top', site: 'noticiasweb3' }), false);
  assert.equal(houseAdMatches({ ...ad, impressions: 10 }, { placement: 'inline', site: 'noticiasweb3' }), false);
});

