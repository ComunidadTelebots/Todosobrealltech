import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const LanguageContext = createContext(null);

const LOCAL_TRANSLATIONS = {
  nav_home: {
    es: 'Inicio',
    en: 'Home',
  },
  nav_blog: {
    es: 'Blog',
    en: 'Blog',
  },
  nav_proxies: {
    es: 'Proxies',
    en: 'Proxies',
  },
  nav_news: {
    es: 'Noticiasweb3',
    en: 'Noticiasweb3',
  },
  nav_resistencia: {
    es: 'Resistencia',
    en: 'Resistance',
  },
  nav_telebots: {
    es: 'Telebots',
    en: 'Telebots',
  },
  nav_gameplays: {
    es: 'Gameplays',
    en: 'Gameplays',
  },
  nav_dashboard: {
    es: 'Panel',
    en: 'Dashboard',
  },
  nav_admin: {
    es: 'Admin',
    en: 'Admin',
  },
  nav_creator: {
    es: 'Creador',
    en: 'Creator',
  },
  login: {
    es: 'Iniciar sesion',
    en: 'Login',
  },
  signup: {
    es: 'Crear cuenta',
    en: 'Sign up',
  },
  profile: {
    es: 'Perfil',
    en: 'Profile',
  },
  settings: {
    es: 'Ajustes',
    en: 'Settings',
  },
  logout: {
    es: 'Cerrar sesion',
    en: 'Log out',
  },
  cookie_preferences: {
    es: 'Preferencias de cookies',
    en: 'Cookie preferences',
  },
  user: {
    es: 'Usuario',
    en: 'User',
  },
  open_menu: {
    es: 'Abrir menu',
    en: 'Open menu',
  },
  home_meta_title: {
    es: 'Todo sobre alltech - Soluciones tecnologicas',
    en: 'Todo sobre alltech - Technology solutions',
  },
  home_meta_description: {
    es: 'Servicios, automatizaciones, bots y herramientas digitales para gestionar proyectos tecnologicos con Todo sobre alltech.',
    en: 'Services, automations, bots and digital tools to manage technology projects with Todo sobre alltech.',
  },
  home_hero_title: {
    es: 'Soluciones tecnologicas para proyectos digitales modernos',
    en: 'Technology solutions for modern digital projects',
  },
  home_hero_subtitle: {
    es: 'Gestiona bots, contenidos, proxies, analitica y servicios online desde una plataforma pensada para crecer contigo.',
    en: 'Manage bots, content, proxies, analytics and online services from a platform built to grow with you.',
  },
  get_started: {
    es: 'Crear cuenta',
    en: 'Get started',
  },
  go_dashboard: {
    es: 'Ir al panel',
    en: 'Go to dashboard',
  },
  feature_fast_title: {
    es: 'Rendimiento rapido',
    en: 'Fast performance',
  },
  feature_fast_desc: {
    es: 'Carga veloz, interacciones fluidas y una base tecnica optimizada para proyectos digitales.',
    en: 'Fast loading, smooth interactions and an optimized technical base for digital projects.',
  },
  feature_security_title: {
    es: 'Seguridad avanzada',
    en: 'Advanced security',
  },
  feature_security_desc: {
    es: 'Proteccion de datos, cifrado y buenas practicas para servicios, bots y paneles de gestion.',
    en: 'Data protection, encryption and good practices for services, bots and management panels.',
  },
  feature_innovation_title: {
    es: 'Soluciones innovadoras',
    en: 'Innovative solutions',
  },
  feature_innovation_desc: {
    es: 'Herramientas actualizadas para automatizar, publicar, analizar y hacer crecer tu presencia online.',
    en: 'Updated tools to automate, publish, analyze and grow your online presence.',
  },
  why_title: {
    es: 'Por que elegir Todo sobre alltech',
    en: 'Why choose Todo sobre alltech',
  },
  why_desc: {
    es: 'Unimos automatizacion, seguridad y contenido para que tus proyectos funcionen con menos friccion.',
    en: 'We combine automation, security and content so your projects run with less friction.',
  },
  testimonials_title: {
    es: 'Lo que dicen nuestros usuarios',
    en: 'What our users say',
  },
  testimonials_desc: {
    es: 'Equipos y creadores confian en Todo sobre alltech para organizar su infraestructura digital.',
    en: 'Teams and creators trust Todo sobre alltech to organize their digital infrastructure.',
  },
  testimonial_role_technical: {
    es: 'Responsable tecnica',
    en: 'Technical lead',
  },
  testimonial_content_technical: {
    es: 'Todo sobre alltech nos ayudo a ordenar servicios, automatizaciones y contenidos desde un unico entorno.',
    en: 'Todo sobre alltech helped us organize services, automations and content from one place.',
  },
  testimonial_role_product: {
    es: 'Gestor de producto',
    en: 'Product manager',
  },
  testimonial_content_product: {
    es: 'La plataforma es estable, clara y nos permite ahorrar tiempo en tareas repetitivas.',
    en: 'The platform is stable, clear and helps us save time on repetitive tasks.',
  },
  ecosystem_title: {
    es: 'Webs del ecosistema',
    en: 'Ecosystem sites',
  },
  ecosystem_desc: {
    es: 'Accede rápidamente a las webs públicas y visores de canales conectados a Todo sobre alltech.',
    en: 'Quickly access the public sites and channel viewers connected to Todo sobre alltech.',
  },
  ecosystem_main_desc: {
    es: 'Portal principal de servicios, paneles, bots, proxies y gestión tecnológica.',
    en: 'Main portal for services, panels, bots, proxies and technology management.',
  },
  ecosystem_news_desc: {
    es: 'Noticias, artículos y contenido tecnológico con estilo clásico y versión moderna.',
    en: 'News, articles and technology content with classic style and modern mode.',
  },
  ecosystem_resistencia_desc: {
    es: 'Visor del canal Resistencia Censura con publicaciones y acceso directo a Telegram.',
    en: 'Viewer for the Resistencia Censura channel with posts and direct Telegram access.',
  },
  ecosystem_telebots_desc: {
    es: 'Comunidad y canal público de Telebots en formato web consultable.',
    en: 'Telebots community and public channel in a browsable web format.',
  },
  ecosystem_gameplays_desc: {
    es: 'Publicaciones del canal TodoSobreGameplays con lectura rápida desde la web.',
    en: 'TodoSobreGameplays channel posts with fast web reading.',
  },
  ecosystem_gamergitbug_desc: {
    es: 'Portfolio de diseño y desarrollo web: proyectos, tecnologías y contacto.',
    en: 'Web design and development portfolio: projects, technologies and contact.',
  },
  open_site: {
    es: 'Abrir web',
    en: 'Open site',
  },
  cta_title: {
    es: 'Listo para impulsar tu proyecto?',
    en: 'Ready to boost your project?',
  },
  cta_desc: {
    es: 'Empieza hoy a centralizar tus herramientas, canales y servicios en una sola plataforma.',
    en: 'Start centralizing your tools, channels and services in one platform today.',
  },
  get_started_today: {
    es: 'Crear cuenta ahora',
    en: 'Get started today',
  },
  footer_desc: {
    es: 'Tu espacio para servicios tecnologicos, automatizaciones, bots y herramientas digitales.',
    en: 'Your space for technology services, automations, bots and digital tools.',
  },
  quick_links: {
    es: 'Enlaces rapidos',
    en: 'Quick links',
  },
  privacy_policy: {
    es: 'Politica de privacidad',
    en: 'Privacy policy',
  },
  terms_service: {
    es: 'Terminos del servicio',
    en: 'Terms of service',
  },
  contact: {
    es: 'Contacto',
    en: 'Contact',
  },
  rights_reserved: {
    es: 'Todos los derechos reservados.',
    en: 'All rights reserved.',
  },
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'es';
  });
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const SUPPORTED_LANGUAGES = [
    'es', 'en', 'pt', 'fr', 'de', 'zh', 'ja', 'ar', 'ru', 
    'it', 'nl', 'sv', 'ko', 'th', 'tr', 'el', 'pl'
  ];

  const fetchTranslations = async () => {
    try {
      const records = await pb.collection('translations').getFullList({
        $autoCancel: false,
      });
      
      const translationsMap = {};
      records.forEach(record => {
        translationsMap[record.key] = {};
        SUPPORTED_LANGUAGES.forEach(lang => {
          translationsMap[record.key][lang] = record[lang];
        });
      });
      
      setTranslations(translationsMap);
    } catch (error) {
      console.error('Failed to fetch translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, []);

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const setLanguage = useCallback((langCode) => {
    setCurrentLanguage(langCode);
    localStorage.setItem('selectedLanguage', langCode);
  }, []);

  const getTranslation = useCallback((key) => {
    const remote = translations[key];
    const local = LOCAL_TRANSLATIONS[key];

    return remote?.[currentLanguage]
      || remote?.es
      || local?.[currentLanguage]
      || local?.es
      || key;
  }, [translations, currentLanguage]);

  const value = {
    currentLanguage,
    setLanguage,
    getTranslation,
    isLoading,
    refreshTranslations: fetchTranslations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
