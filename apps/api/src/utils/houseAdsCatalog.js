export const OFFICIAL_ADS = [
  { id: 'official-todosobrealltech', title: 'TodoSobreAllTech en Telegram', description: 'Noticias de tecnología, IA, Web3 y seguridad en nuestro canal oficial.', cta: 'Unirme al canal', url: 'https://t.me/TodoSobreAllTech', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#e9f8ff,#d8f0ff)', foreground: '#12324a', accent: '#168acd', builtin: true },
  {
    id: 'official-comunidadtelebots', title: 'Comunidad TeleBots', description: 'Canales, grupos, bots y proyectos abiertos de nuestra comunidad Telegram.',
    cta: 'Abrir comunidad', url: 'https://t.me/comunidadtelebots', placement: 'all', priority: 60, enabled: true,
    approval_status: 'approved', background: 'linear-gradient(135deg,#f4ecff,#e7ddff)', foreground: '#2f2350', accent: '#7157c8', builtin: true,
    destination_mode: 'community', display_format: 'cards', community_items: [
      { id: 'todosobrealltech', title: 'TodoSobreAllTech', type: 'channel', url: 'https://t.me/TodoSobreAllTech', boost_url: 'https://t.me/boost/TodoSobreAllTech' },
      { id: 'comunidadtelebots', title: 'Comunidad TeleBots', type: 'channel', url: 'https://t.me/comunidadtelebots', boost_url: 'https://t.me/boost/comunidadtelebots' },
      { id: 'resistencia-censura', title: 'Resistencia a la Censura', type: 'channel', url: 'https://t.me/resistencia_censura', boost_url: 'https://t.me/boost/resistencia_censura' },
      { id: 'todosobregameplays', title: 'Todo Sobre Gameplays', type: 'channel', url: 'https://t.me/TodoSobreGameplaysCanal', boost_url: 'https://t.me/boost/TodoSobreGameplaysCanal' },
    ],
  },
  { id: 'official-resistencia-censura', title: 'Resistencia a la Censura', description: 'Privacidad, acceso libre a la información y resistencia digital.', cta: 'Ver canal', url: 'https://t.me/resistencia_censura', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', foreground: '#7c2d12', accent: '#ea580c', builtin: true },
  { id: 'official-todosobregameplays', title: 'Todo Sobre Gameplays', description: 'Vídeos, directos y novedades para la comunidad gaming.', cta: 'Ver gameplays', url: 'https://t.me/TodoSobreGameplaysCanal', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', foreground: '#4c1d95', accent: '#7c3aed', builtin: true },
  { id: 'official-instagram', title: 'TodoSobreAllTech en Instagram', description: 'Noticias, tecnología e inteligencia artificial en formato visual.', cta: 'Seguir en Instagram', url: 'https://www.instagram.com/todosobrealltech/', placement: 'all', priority: 60, enabled: true, approval_status: 'approved', background: 'linear-gradient(135deg,#fff1f2,#fae8ff)', foreground: '#831843', accent: '#db2777', builtin: true },
].map((ad) => {
  const username = String(ad.url || '').match(/^https:\/\/t\.me\/([A-Za-z0-9_]{5,32})\/?$/i)?.[1];
  return { ...ad, boost_url: username ? `https://t.me/boost/${username}` : '', relationship_type: 'official', telegram_verified: false, community_verified: true };
});

export const officialAdsFor = (placement = '') => OFFICIAL_ADS
  .filter((ad) => !placement || ['all', placement].includes(ad.placement));
