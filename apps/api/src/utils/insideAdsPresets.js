export const INSIDE_ADS_PRESETS = Object.freeze([
  Object.freeze({
    id: 'inside-ads-channel-owner', label: 'Propietarios de canales', audience: 'channel_owner', code: 'r_163103382',
    web_url: 'https://inside.ad?ref=r_163103382',
    telegram_url: 'https://t.me/InsideAds_bot/open?startapp=r_163103382',
  }),
  Object.freeze({
    id: 'inside-ads-general', label: 'Público general', audience: 'general', code: 'm_163103382',
    web_url: 'https://inside.ad?ref=m_163103382',
    telegram_url: 'https://t.me/InsideAds_bot/open?startapp=m_163103382',
  }),
]);

export const insideAdsPresetsFor = ({ ownerEligible = false } = {}) => INSIDE_ADS_PRESETS
  .filter((item) => item.audience === 'general' || ownerEligible)
  .map((item) => ({ ...item }));

const canonicalUrl = (value) => {
  try { return new URL(String(value || '').trim()).toString(); }
  catch { return ''; }
};

export const insideAdsPresetByUrl = (value) => {
  const candidate = canonicalUrl(value);
  return INSIDE_ADS_PRESETS.find((item) => [item.web_url, item.telegram_url].some((url) => canonicalUrl(url) === candidate)) || null;
};

export const isInsideAdsCampaign = (campaign) => {
  if (!campaign || typeof campaign !== 'object') return false;
  const preset = String(campaign.inside_ads_preset || '').trim();
  const scope = String(campaign.inside_ads_scope || '').trim();
  if (INSIDE_ADS_PRESETS.some((item) => item.id === preset)) return true;
  if (['general', 'channel_owner'].includes(scope)) return true;
  return [campaign.url, campaign.web_url, campaign.telegram_url]
    .some((value) => Boolean(insideAdsPresetByUrl(value)));
};

export const mayManageInsideAdsCampaign = ({ role, submitted, existing } = {}) => (
  role === 'creator' || (!isInsideAdsCampaign(submitted) && !isInsideAdsCampaign(existing))
);

export const mayReadInsideAdsPresets = ({ role = '', internal = false } = {}) => internal || role === 'creator';

export const insideAdsDestinationFor = (campaign, { placement = '', site = '' } = {}) => {
  const telegramSurface = placement === 'telegram_channel' || placement === 'hub'
    || placement === 'telegram_react_channel' || site === 'telegram_channel'
    || site === 'hub' || site === 'telegram-react';
  return telegramSurface ? campaign?.telegram_url : campaign?.web_url;
};
