import test from 'node:test';
import assert from 'node:assert/strict';
import { INSIDE_ADS_PRESETS, insideAdsDestinationFor, insideAdsPresetByUrl, insideAdsPresetsFor, isInsideAdsCampaign, mayManageInsideAdsCampaign, mayReadInsideAdsPresets } from '../src/utils/insideAdsPresets.js';

test('modela dos campañas lógicas con dos superficies cada una', () => {
  assert.equal(INSIDE_ADS_PRESETS.length, 2);
  assert.deepEqual(INSIDE_ADS_PRESETS.map(({ audience, web_url, telegram_url }) => ({ audience, web_url, telegram_url })), [
    { audience: 'channel_owner', web_url: 'https://inside.ad?ref=r_163103382', telegram_url: 'https://t.me/InsideAds_bot/open?startapp=r_163103382' },
    { audience: 'general', web_url: 'https://inside.ad?ref=m_163103382', telegram_url: 'https://t.me/InsideAds_bot/open?startapp=m_163103382' },
  ]);
});

test('no filtra campañas owner a visitas sin propiedad confirmada', () => {
  const presets = insideAdsPresetsFor({ ownerEligible: false });
  assert.deepEqual(presets.map((item) => item.audience), ['general']);
});

test('resuelve destino por superficie', () => {
  const campaign = INSIDE_ADS_PRESETS[1];
  assert.equal(insideAdsDestinationFor(campaign, { site: 'noticiasweb3', placement: 'inline' }), campaign.web_url);
  assert.equal(insideAdsDestinationFor(campaign, { placement: 'telegram_channel' }), campaign.telegram_url);
  assert.equal(insideAdsDestinationFor(campaign, { placement: 'hub' }), campaign.telegram_url);
  assert.equal(insideAdsDestinationFor(campaign, { site: 'telegram-react' }), campaign.telegram_url);
});

test('identifica cualquier superficie del preset sin confiar en el cliente', () => {
  assert.equal(insideAdsPresetByUrl('https://inside.ad/?ref=r_163103382')?.audience, 'channel_owner');
  assert.equal(insideAdsPresetByUrl('https://t.me/InsideAds_bot/open?startapp=m_163103382')?.audience, 'general');
});

test('detecta campaÃ±as Inside Ads aunque se eliminen campos del payload', () => {
  assert.equal(isInsideAdsCampaign({ inside_ads_preset: 'inside-ads-general' }), true);
  assert.equal(isInsideAdsCampaign({ inside_ads_scope: 'channel_owner' }), true);
  assert.equal(isInsideAdsCampaign({ url: 'https://inside.ad?ref=m_163103382' }), true);
  assert.equal(isInsideAdsCampaign({ telegram_url: 'https://t.me/InsideAds_bot/open?startapp=r_163103382' }), true);
});

test('no clasifica campaÃ±as HTTPS ordinarias como Inside Ads', () => {
  assert.equal(isInsideAdsCampaign({ audience: 'general', url: 'https://example.org/campaign' }), false);
  assert.equal(isInsideAdsCampaign({ title: 'Inside Ads', url: 'https://example.org/' }), false);
  assert.equal(isInsideAdsCampaign(null), false);
});

test('impide bypass de admin por payload limpio cuando el registro existente es Inside Ads', () => {
  assert.equal(mayManageInsideAdsCampaign({ role: 'admin', submitted: { id: 'ad-1', title: 'editada' }, existing: { id: 'ad-1', inside_ads_scope: 'general' } }), false);
  assert.equal(mayManageInsideAdsCampaign({ role: 'admin', submitted: { url: 'https://inside.ad?ref=m_163103382' } }), false);
  assert.equal(mayManageInsideAdsCampaign({ role: 'creator', existing: { inside_ads_scope: 'general' } }), true);
});

test('no restringe las campaÃ±as ordinarias del administrador', () => {
  assert.equal(mayManageInsideAdsCampaign({ role: 'admin', submitted: { url: 'https://example.org/campaign' }, existing: { url: 'https://example.org/campaign' } }), true);
});

test('presets: autoriza creator o llamada interna y rechaza otros roles', () => {
  assert.equal(mayReadInsideAdsPresets({ role: 'creator' }), true);
  assert.equal(mayReadInsideAdsPresets({ role: 'admin' }), false);
  assert.equal(mayReadInsideAdsPresets({ role: 'user' }), false);
  assert.equal(mayReadInsideAdsPresets({ role: '', internal: false }), false);
  assert.equal(mayReadInsideAdsPresets({ role: '', internal: true }), true);
});
