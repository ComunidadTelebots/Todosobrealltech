(() => {
  const seasons = {
    christmas: { symbol: '❄', es: 'Navidad en ComunidadTelebots', en: 'Christmas at ComunidadTelebots' },
    'new-year': { symbol: '✦', es: '¡Feliz Año Nuevo!', en: 'Happy New Year!' },
    valentine: { symbol: '♥', es: 'La tecnología también nos conecta', en: 'Technology connects us too' },
    halloween: { symbol: '✧', es: 'Halloween: administra sin sustos', en: 'Halloween: manage without scares' },
    fallas: { symbol: '◆', es: 'València está en Fallas', en: 'Valencia celebrates Fallas' },
    'sant-jordi': { symbol: '♥', es: 'Feliz Sant Jordi: libros y rosas', en: 'Happy Sant Jordi: books and roses' },
    'san-juan': { symbol: '☀', es: 'Celebramos San Juan y el verano', en: 'Celebrating San Juan and summer' },
    'st-patrick': { symbol: '◆', es: 'Feliz Día de San Patricio', en: 'Happy St Patrick’s Day' },
    'kings-day': { symbol: '✦', es: 'Fijne Koningsdag', en: 'Happy King’s Day' },
    'europe-day': { symbol: '★', es: 'Día de Europa: unidos en la diversidad', en: 'Europe Day: united in diversity' },
    'italy-republic': { symbol: '✦', es: 'Buona Festa della Repubblica', en: 'Happy Italian Republic Day' },
    'portugal-day': { symbol: '✦', es: 'Feliz Dia de Portugal', en: 'Happy Portugal Day' },
    'bastille-day': { symbol: '★', es: 'Bonne fête nationale, France', en: 'Happy Bastille Day, France' },
    oktoberfest: { symbol: '◆', es: 'O’zapft is! Oktoberfest', en: 'O’zapft is! Oktoberfest' },
  };

  const getTelegram = () => window.Telegram?.WebApp || null;

  const getLanguage = () => {
    const telegramLanguage = getTelegram()?.initDataUnsafe?.user?.language_code;
    return String(telegramLanguage || navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  };

  const getRegion = () => {
    const locale = navigator.languages?.[0] || navigator.language || '';
    const match = locale.match(/[-_]([A-Z]{2})$/i);
    if (match) return match[1].toUpperCase();
    const telegramLanguage = getTelegram()?.initDataUnsafe?.user?.language_code || '';
    return String(telegramLanguage).toLowerCase() === 'es' ? 'ES' : '';
  };

  const getAutomaticSeason = (date, region) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 12 && day >= 31) || (month === 1 && day <= 6)) return 'new-year';
    if (month === 12 && day >= 15) return 'christmas';
    if (month === 2 && day >= 10 && day <= 14) return 'valentine';
    if (month === 10 && day >= 25) return 'halloween';
    if (region === 'ES' && month === 3 && day >= 15 && day <= 19) return 'fallas';
    if (region === 'ES' && month === 4 && day === 23) return 'sant-jordi';
    if (region === 'ES' && month === 6 && day >= 23 && day <= 24) return 'san-juan';
    if (region === 'IE' && month === 3 && day === 17) return 'st-patrick';
    if (region === 'NL' && month === 4 && day === 27) return 'kings-day';
    if (region === 'IT' && month === 6 && day === 2) return 'italy-republic';
    if (region === 'PT' && month === 6 && day === 10) return 'portugal-day';
    if (region === 'FR' && month === 7 && day === 14) return 'bastille-day';
    if (['DE', 'AT'].includes(region) && ((month === 9 && day >= 20) || (month === 10 && day <= 5))) return 'oktoberfest';
    if (month === 5 && day === 9) return 'europe-day';
    return null;
  };

  const getSeason = () => {
    const requested = new URLSearchParams(window.location.search).get('season');
    if (requested === 'none') return null;
    if (seasons[requested]) return requested;
    return getAutomaticSeason(new Date(), getRegion());
  };

  const syncTelegramChrome = () => {
    const telegram = getTelegram();
    if (!telegram) return;
    const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#070b14';
    try {
      telegram.setHeaderColor?.(background);
      telegram.setBackgroundColor?.(background);
      telegram.setBottomBarColor?.(background);
    } catch {
      // Older Telegram clients may not support all color methods.
    }
  };

  const createParticles = (symbol) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const layer = document.createElement('div');
    layer.className = 'seasonal-particles';
    layer.setAttribute('aria-hidden', 'true');

    const particleCount = window.innerWidth < 480 ? 8 : 14;
    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'seasonal-particle';
      particle.textContent = symbol;
      particle.style.left = `${4 + ((index * 37) % 92)}%`;
      particle.style.setProperty('--season-duration', `${8 + (index % 5) * 1.4}s`);
      particle.style.setProperty('--season-delay', `${-(index % 7) * 1.3}s`);
      particle.style.setProperty('--season-drift', `${(index % 2 ? 1 : -1) * (12 + (index % 4) * 8)}px`);
      layer.appendChild(particle);
    }
    return layer;
  };

  const renderSeason = () => {
    const season = getSeason();
    if (!season) return;

    const config = seasons[season];
    const language = getLanguage();
    document.documentElement.dataset.season = season;

    const banner = document.createElement('div');
    banner.className = 'seasonal-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <div class="seasonal-banner__content">
        <span class="seasonal-banner__symbol" aria-hidden="true">${config.symbol}</span>
        <span>${config[language]}</span>
        <span class="seasonal-banner__symbol" aria-hidden="true">${config.symbol}</span>
      </div>
      <button class="seasonal-banner__close" type="button" aria-label="${language === 'es' ? 'Ocultar decoración' : 'Hide decoration'}">×</button>
    `;

    const particles = createParticles(config.symbol);
    document.body.prepend(banner);
    if (particles) document.body.appendChild(particles);

    banner.querySelector('.seasonal-banner__close').addEventListener('click', () => {
      banner.remove();
      particles?.remove();
      delete document.documentElement.dataset.season;
      getTelegram()?.HapticFeedback?.impactOccurred?.('light');
    });

    syncTelegramChrome();
    getTelegram()?.onEvent?.('themeChanged', syncTelegramChrome);
  };

  window.addEventListener('DOMContentLoaded', renderSeason, { once: true });
})();
