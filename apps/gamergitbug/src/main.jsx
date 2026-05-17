import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

const CONSENT_REQUIRED_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'UK', 'CH',
]);

function getAnalyticsConsentValue() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase() || '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  if (CONSENT_REQUIRED_REGIONS.has(region)) return 'denied';
  if (timeZone.startsWith('Europe/')) return 'denied';
  if (timeZone === 'Atlantic/Canary' || timeZone === 'Atlantic/Madeira' || timeZone === 'Atlantic/Azores') return 'denied';
  if (!timeZone && !region) return 'denied';

  return 'granted';
}

function initGA() {
  if (!GA_ID || document.getElementById('ga-script')) return;
  const consentValue = getAnalyticsConsentValue();

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: consentValue,
    ad_storage: consentValue,
    ad_user_data: consentValue,
    ad_personalization: consentValue,
    wait_for_update: 500,
  });

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

const services = [
  {
    icon: '⚡',
    title: 'Rendimiento rapido',
    text: 'Carga veloz, interacciones fluidas y una base tecnica optimizada para proyectos digitales.',
  },
  {
    icon: '🛡',
    title: 'Seguridad avanzada',
    text: 'Proteccion de datos, cifrado y buenas practicas para servicios, bots y paneles de gestion.',
  },
  {
    icon: '✦',
    title: 'Soluciones innovadoras',
    text: 'Herramientas actualizadas para automatizar, publicar, analizar y hacer crecer tu presencia online.',
  },
];

const highlights = [
  {
    title: 'Bots y automatizaciones',
    text: 'Flujos para Telegram, paneles de gestion y tareas repetitivas que se ejecutan con menos friccion.',
  },
  {
    title: 'Contenido y canales',
    text: 'Visores web para comunidades, publicaciones y proyectos conectados al ecosistema Todo sobre alltech.',
  },
  {
    title: 'Infraestructura digital',
    text: 'Bases tecnicas para publicar, medir, proteger y hacer crecer herramientas online.',
  },
];

const projects = [
  {
    title: 'Todo sobre alltech',
    url: 'https://todosobreall.tech',
    text: 'Portal principal de servicios, paneles, bots, proxies y gestion tecnologica.',
  },
  {
    title: 'Noticiasweb3',
    url: 'https://noticiasweb3.todosobreall.tech',
    text: 'Noticias, articulos y contenido tecnologico con estilo clasico y version moderna.',
  },
  {
    title: 'Resistencia a la Censura',
    url: 'https://resistenciaalacensura.todosobreall.tech',
    text: 'Visor del canal Resistencia Censura con publicaciones y acceso directo a Telegram.',
  },
  {
    title: 'Comunidad Telebots',
    url: 'https://comunidadtelebots.todosobreall.tech',
    text: 'Comunidad y canal publico de Telebots en formato web consultable.',
  },
  {
    title: 'TodoSobreGameplays',
    url: 'https://todosobregameplays.todosobreall.tech',
    text: 'Publicaciones del canal TodoSobreGameplays con lectura rapida desde la web.',
  },
];

function App() {
  useEffect(() => {
    initGA();
  }, []);

  return (
    <>
      <header className="site-header">
        <a href="#inicio" className="brand" aria-label="GamerGitBug inicio">
          <span className="brand-mark">G</span>
          <span>GamerGitBug</span>
        </a>
        <nav aria-label="Navegacion principal">
          <a href="#servicios">Servicios</a>
          <a href="#proyectos">Portafolio</a>
          <a href="#contacto">Contacto</a>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-media" aria-hidden="true" />
          <div className="hero-overlay" />
          <div className="container hero-content">
            <h1>Soluciones tecnologicas para proyectos digitales modernos</h1>
            <p>
              GamerGitBug reune automatizacion, contenido, canales, analitica y herramientas web desde una plataforma pensada para crecer contigo.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#proyectos">Ver portafolio <span aria-hidden="true">→</span></a>
              <a className="button secondary" href="https://todosobreall.tech" target="_blank" rel="noreferrer">Web principal</a>
            </div>
          </div>
        </section>

        <section id="servicios" className="section">
          <div className="container">
            <div className="section-heading">
            <h2>Por que elegir GamerGitBug</h2>
            <p>Unimos automatizacion, seguridad y contenido para que tus proyectos funcionen con menos friccion.</p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article className="card" key={service.title}>
                  <span className="card-icon" aria-hidden="true">{service.icon}</span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <h2>Servicios, automatizaciones y herramientas digitales</h2>
              <p>Gestiona proyectos, canales y servicios online con una base visual y tecnica alineada con Todo sobre alltech.</p>
            </div>
            <div className="service-grid compact">
              {highlights.map((item) => (
                <article className="card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="proyectos" className="section muted">
          <div className="container">
            <div className="section-heading">
              <h2>Webs del ecosistema</h2>
              <p>Accede rapidamente a las webs publicas y visores de canales conectados a Todo sobre alltech.</p>
            </div>
            <div className="portfolio-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.url}>
                  <div>
                    <span className="card-icon small" aria-hidden="true">↗</span>
                    <h3>{project.title}</h3>
                    <p>{project.text}</p>
                  </div>
                  <a className="button secondary" href={project.url} target="_blank" rel="noreferrer">Abrir web <span aria-hidden="true">→</span></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="section cta-section">
          <div className="container cta">
            <div>
            <h2>Listo para impulsar tu proyecto?</h2>
            <p>Empieza a centralizar tus herramientas, canales y servicios en una sola plataforma.</p>
            </div>
            <a className="button inverted" href="https://todosobreall.tech/signup" target="_blank" rel="noreferrer">Crear cuenta ahora <span aria-hidden="true">→</span></a>
          </div>
        </section>
      </main>

      <footer>
        <span>GamerGitBug</span>
        <span>Parte del ecosistema Todo sobre alltech.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
