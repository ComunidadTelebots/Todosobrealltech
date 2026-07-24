import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clover, Crown, Flag, Flame, Ghost, Heart, Landmark, Sparkles, Sun, Snowflake, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext.jsx';

const SEASONS = {
  christmas: {
    icon: Snowflake,
    particles: ['❄', '✦', '❄', '·', '✧', '❄'],
    message: {
      es: 'La magia de la Navidad llega a Todo sobre alltech',
      en: 'Christmas magic has arrived at Todo sobre alltech',
    },
  },
  'new-year': {
    icon: Sparkles,
    particles: ['✦', '✧', '★', '·', '✦', '✧'],
    message: {
      es: '¡Feliz Año Nuevo! Gracias por crecer con nosotros',
      en: 'Happy New Year! Thank you for growing with us',
    },
  },
  valentine: {
    icon: Heart,
    particles: ['♥', '♡', '·', '♥', '♡', '·'],
    message: {
      es: 'Celebramos la tecnología que nos conecta',
      en: 'Celebrating the technology that connects us',
    },
  },
  halloween: {
    icon: Ghost,
    particles: ['✦', '●', '✧', '·', '✦', '●'],
    message: {
      es: 'Halloween tecnológico: navega sin sustos',
      en: 'A tech Halloween: browse without scares',
    },
  },
  fallas: {
    icon: Flame,
    particles: ['✦', '◆', '✧', '·', '◆', '✦'],
    message: {
      es: 'València está en Fallas: arte, luz y tradición',
      en: 'Valencia celebrates Fallas: art, light and tradition',
    },
  },
  'sant-jordi': {
    icon: BookOpen,
    particles: ['♥', '✦', '♡', '·', '✦', '♥'],
    message: {
      es: 'Feliz Sant Jordi: libros, rosas y cultura',
      en: 'Happy Sant Jordi: books, roses and culture',
    },
  },
  'san-juan': {
    icon: Sun,
    particles: ['✦', '☀', '·', '✧', '☀', '✦'],
    message: {
      es: 'Celebramos San Juan y la llegada del verano',
      en: 'Celebrating San Juan and the arrival of summer',
    },
  },
  'st-patrick': {
    icon: Clover,
    particles: ['✦', '◆', '·', '◆', '✧', '✦'],
    message: {
      es: 'Feliz Día de San Patricio',
      en: 'Happy St Patrick’s Day',
    },
  },
  'kings-day': {
    icon: Crown,
    particles: ['✦', '◆', '✧', '·', '◆', '✦'],
    message: {
      es: 'Fijne Koningsdag: celebramos el Día del Rey',
      en: 'Fijne Koningsdag: celebrating King’s Day',
    },
  },
  'europe-day': {
    icon: Flag,
    particles: ['★', '✦', '·', '★', '✧', '✦'],
    message: {
      es: 'Día de Europa: unidos en la diversidad',
      en: 'Europe Day: united in diversity',
    },
  },
  'italy-republic': {
    icon: Landmark,
    particles: ['✦', '◆', '·', '✧', '◆', '✦'],
    message: {
      es: 'Buona Festa della Repubblica',
      en: 'Happy Italian Republic Day',
    },
  },
  'portugal-day': {
    icon: Flag,
    particles: ['✦', '◆', '·', '✧', '◆', '✦'],
    message: {
      es: 'Feliz Dia de Portugal',
      en: 'Happy Portugal Day',
    },
  },
  'bastille-day': {
    icon: Landmark,
    particles: ['✦', '★', '·', '✧', '★', '✦'],
    message: {
      es: 'Bonne fête nationale, France',
      en: 'Happy Bastille Day, France',
    },
  },
  oktoberfest: {
    icon: Sparkles,
    particles: ['✦', '◆', '·', '✧', '◆', '✦'],
    message: {
      es: 'O’zapft is! Celebramos el Oktoberfest',
      en: 'O’zapft is! Celebrating Oktoberfest',
    },
  },
};

const getBrowserRegion = () => {
  const locale = navigator.languages?.[0] || navigator.language || '';
  return locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase() || '';
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

const getRequestedSeason = () => {
  const requested = new URLSearchParams(window.location.search).get('season');
  if (requested === 'none') return null;
  return SEASONS[requested] ? requested : undefined;
};

const SeasonalTheme = () => {
  const { currentLanguage } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const season = useMemo(() => {
    const requested = getRequestedSeason();
    return requested === undefined ? getAutomaticSeason(new Date(), getBrowserRegion()) : requested;
  }, []);

  useEffect(() => {
    if (!season || dismissed) {
      delete document.documentElement.dataset.season;
      return undefined;
    }

    document.documentElement.dataset.season = season;
    return () => {
      delete document.documentElement.dataset.season;
    };
  }, [season, dismissed]);

  if (!season || dismissed) return null;

  const config = SEASONS[season];
  const Icon = config.icon;
  const language = currentLanguage === 'en' ? 'en' : 'es';

  return (
    <>
      <div className="seasonal-banner" role="status">
        <div className="seasonal-banner__glow" aria-hidden="true" />
        <div className="seasonal-banner__content">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{config.message[language]}</span>
          <Sparkles className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="seasonal-banner__close"
          aria-label={language === 'es' ? 'Ocultar decoración especial' : 'Hide special decoration'}
          title={language === 'es' ? 'Ocultar decoración' : 'Hide decoration'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="seasonal-decoration seasonal-decoration--left" aria-hidden="true">
        {config.particles.slice(0, 3).map((particle, index) => (
          <span key={`${particle}-${index}`}>{particle}</span>
        ))}
      </div>
      <div className="seasonal-decoration seasonal-decoration--right" aria-hidden="true">
        {config.particles.slice(3).map((particle, index) => (
          <span key={`${particle}-${index}`}>{particle}</span>
        ))}
      </div>
    </>
  );
};

export default SeasonalTheme;
