import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAdView } from '../src/routes/house-ads.js';

test('el catÃ¡logo pÃºblico no filtra destinos, preset, actor ni cÃ³digo Inside Ads', () => {
  const publicAd = publicAdView({ id: 'inside-1', title: 'Anuncio', url: 'https://inside.ad/?ref=sensitive', web_url: 'https://inside.ad/?ref=sensitive', telegram_url: 'https://t.me/InsideAds_bot/open?startapp=sensitive', boost_url: 'https://t.me/boost/test', code: 'sensitive', inside_ads_scope: 'general', inside_ads_preset: 'inside-general', submitted_by: 'user-secret' });
  for (const key of ['url', 'web_url', 'telegram_url', 'boost_url', 'code', 'inside_ads_scope', 'inside_ads_preset', 'submitted_by']) assert.equal(key in publicAd, false);
  assert.equal(publicAd.has_boost, true);
  assert.equal(publicAd.click_url, '/house-ads/inside-1/click');
  assert.equal(JSON.stringify(publicAd).includes('sensitive'), false);
});

test('añade automáticamente la foto segura del chat a campañas comunitarias', () => {
  const publicAd = publicAdView({ id: 'community-1', community_items: [
    { id: '-1001234567890', title: 'Canal', url: 'https://t.me/canal' },
    { id: 'custom', title: 'Externo', url: 'https://example.com', image: 'https://cdn.example/avatar.jpg' },
  ] });
  assert.equal(publicAd.community_items[0].image, 'https://api.todosobreall.tech/house-ads/community-photo/-1001234567890');
  assert.equal(publicAd.community_items[1].image, 'https://cdn.example/avatar.jpg');
});
