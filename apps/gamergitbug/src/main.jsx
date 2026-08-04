import React, { useEffect, useState } from 'react';
import './styles.css';

const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
const CONSENT_STORAGE_KEY = 'gamergitbug_analytics_consent';

const CONSENT_REQUIRED_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

function getRegionalDefaultConsentValue() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase() || '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  if (CONSENT_REQUIRED_REGIONS.has(region)) return 'denied';
  if (timeZone.startsWith('Europe/')) return 'denied';
  if (timeZone === 'Atlantic/Canary' || timeZone === 'Atlantic/Madeira' || timeZone === 'Atlantic/Azores') return 'denied';
  if (!timeZone && !region) return 'denied';

  return 'granted';
}

function getConsentSettings(consentValue) {
  return {
    analytics_storage: consentValue,
    ad_storage: consentValue,
    ad_user_data: consentValue,
    ad_personalization: consentValue,
  };
}

function getStoredAnalyticsConsent() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function trackPageView() {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
  });
}

function initGA(analyticsEnabled) {
  if (!GA_ID) return;
  const consentValue = analyticsEnabled ? 'granted' : 'denied';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (document.getElementById('ga-script')) {
    window.gtag('consent', 'update', getConsentSettings(consentValue));
    if (analyticsEnabled) trackPageView();
    return;
  }

  window.gtag('consent', 'default', {
    ...getConsentSettings(consentValue),
    wait_for_update: 500,
  });

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });
  if (analyticsEnabled) trackPageView();
}

const services = [
  'Portafolios y landing pages',
  'Sitios para comunidades y creadores',
  'Interfaces admin y dashboards',
];

const projects = [
  {
    title: 'TodoSobreAllTech',
    text: 'Hub principal con blog, panel de administración, sistema de autenticación y gestión de contenido por colecciones.',
    tags: ['React', 'shadcn/ui', 'PocketBase', 'Tailwind'],
    url: 'https://todosobreall.tech',
  },
  {
    title: 'NoticiasWeb3',
    text: 'Sitio de noticias con secciones de juegos PC, extensiones de navegador, PlayStation, foro y modo noche automático.',
    tags: ['React', 'React Router', 'AdSense', 'Docker'],
    url: 'https://noticiasweb3.todosobreall.tech',
  },
  {
    title: 'Resistencia a la Censura',
    text: 'Visor web del canal de Telegram con búsqueda, filtros por fecha y estadísticas de publicaciones en tiempo real.',
    tags: ['React', 'Telegram API', 'Lucide', 'Docker'],
    url: 'https://resistenciaalacensura.todosobreall.tech',
  },
  {
    title: 'Comunidad Telebots',
    text: 'Sitio web para la comunidad de bots de Telegram, con visor de canal integrado, búsqueda y galería de imágenes.',
    tags: ['React', 'Telegram API', 'Lucide', 'Docker'],
    url: 'https://comunidadtelebots.todosobreall.tech',
  },
  {
    title: 'Todo Sobre Gameplays',
    text: 'Canal de contenido sobre gameplays presentado como web: visor de posts, filtros y navegación por publicaciones.',
    tags: ['React', 'Telegram API', 'Vite', 'Docker'],
    url: 'https://todosobregameplays.todosobreall.tech',
  },
];

const skills = ['React', 'Vite', 'Docker', 'Traefik', 'HTML/CSS', 'SEO', 'Responsive Design', 'UI Systems'];

export default function App() {
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const storedConsent = getStoredAnalyticsConsent();
    const hasChoice = storedConsent === 'true' || storedConsent === 'false';
    const regionalConsent = getRegionalDefaultConsentValue();
    const shouldEnableAnalytics = hasChoice ? storedConsent === 'true' : regionalConsent === 'granted';

    setAnalyticsEnabled(shouldEnableAnalytics);
    setShowCookieBanner(!hasChoice);
    initGA(shouldEnableAnalytics);
  }, []);

  const updateAnalyticsConsent = (enabled) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Consent still updates for the current page when storage is unavailable.
    }
    setAnalyticsEnabled(enabled);
    setShowCookieBanner(false);
    initGA(enabled);
  };

  return (
    <>
      <main className="page" id="inicio">
        <section className="hero">
          <div className="kicker">Gamergitbug // Portfolio</div>
          <h1>Diseño y desarrollo web con estilo propio.</h1>
          <p>
            Soy Gamergitbug. Creo experiencias web modernas, rapidas y visualmente fuertes para proyectos personales, marcas y comunidades.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#proyectos">Ver proyectos</a>
            <a className="button secondary" href="#contacto">Contactar</a>
          </div>
        </section>

        <section className="intro-grid" aria-label="Resumen">
          <article className="panel">
            <h2>Sobre mi</h2>
            <p>Me enfoco en construir sitios claros, con identidad visual y buena experiencia en movil y escritorio.</p>
          </article>

          <article className="panel">
            <h2>Servicios</h2>
            <ul>
              {services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </article>
        </section>

        <section id="proyectos" className="section">
          <div className="section-heading">
            <h2>Proyectos</h2>
            <p>Sitios en producción construidos y mantenidos por mí.</p>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.title}>
                <h3>
                  {project.url
                    ? <a href={project.url} target="_blank" rel="noopener noreferrer">{project.title} ↗</a>
                    : project.title}
                </h3>
                <p>{project.text}</p>
                <div className="tags">
                  {project.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>Skills</h2>
            <p>Herramientas y tecnologias que uso para construir proyectos solidos.</p>
          </div>
          <div className="skills" aria-label="Skills">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>

        <section id="contacto" className="contact-panel">
          <h2>Contacto</h2>
          <p>Abierto a colaboraciones, encargos y nuevos proyectos.</p>
          <a href="mailto:hello@gamergitbug.com">hello@gamergitbug.com</a>
        </section>
      </main>

      {showCookieBanner ? (
        <aside className="cookie-banner" aria-label="Preferencias de cookies">
          <div>
            <strong>Cookies y estadisticas</strong>
            <p>
              Usamos Google Analytics para medir visitas y mejorar la web. Puedes aceptar o rechazar las cookies de analitica.
            </p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="button secondary" onClick={() => updateAnalyticsConsent(false)}>
              Rechazar
            </button>
            <button type="button" className="button primary" onClick={() => updateAnalyticsConsent(true)}>
              Aceptar
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="cookie-preferences"
          onClick={() => setShowCookieBanner(true)}
          aria-label="Abrir preferencias de cookies"
        >
          Cookies {analyticsEnabled ? 'on' : 'off'}
        </button>
      )}
    </>
  );
}
