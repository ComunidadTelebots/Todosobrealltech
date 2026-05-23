import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { cloneElement, isValidElement, useEffect, useState } from 'react';

const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
const ADSENSE_SLOT_TOP = import.meta.env.VITE_ADSENSE_SLOT_TOP || 'SLOT_TOP';
const ADSENSE_SLOT_RIGHT = import.meta.env.VITE_ADSENSE_SLOT_RIGHT || 'SLOT_RIGHT';
const ADSENSE_SLOT_INLINE = import.meta.env.VITE_ADSENSE_SLOT_INLINE || 'SLOT_INLINE';

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
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
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
  window.gtag('config', GA_ID, { send_page_view: false });
}

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
    });
  }, [location]);
  return null;
}
import SiteHeader from './components/SiteHeader.jsx';
import AdSense from './components/AdSense.jsx';
import Sidebar from './components/Sidebar.jsx';
import BienvenidoPage from './pages/HomePage.jsx';
import NoticiasPage from './pages/NoticiasPage.jsx';
import NoticiaDetailPage from './pages/NoticiaDetailPage.jsx';
import BlogPostDetailPage from './pages/BlogPostDetailPage.jsx';
import CanalPage from './pages/CanalPage.jsx';
import ExtensionesPage from './pages/ExtensionesPage.jsx';
import ExtensionDetailPage from './pages/ExtensionDetailPage.jsx';
import PulserasRojasPage from './pages/PulserasRojasPage.jsx';
import PulseraDetailPage from './pages/PulseraDetailPage.jsx';
import PlayStationPage from './pages/PlayStationPage.jsx';
import JuegosPCPage from './pages/JuegosPCPage.jsx';
import JuegoDetailPage from './pages/JuegoDetailPage.jsx';
import JuegosOnlinePage from './pages/JuegosOnlinePage.jsx';
import JuegoOnlineDetailPage from './pages/JuegoOnlineDetailPage.jsx';
import SubeImagenesPage from './pages/SubeImagenesPage.jsx';
import IniciarSesionPage from './pages/IniciarSesionPage.jsx';
import SuscribirnePage from './pages/SuscribirnePage.jsx';
import AfiliarteePage from './pages/AfiliarteePage.jsx';
import AfiadosPage from './pages/AfiadosPage.jsx';
import ListaVipPage from './pages/ListaVipPage.jsx';
import ForoPage from './pages/ForoPage.jsx';
import ForoCategoriaPage from './pages/ForoCategoriaPage.jsx';
import ForoHiloPage from './pages/ForoHiloPage.jsx';
import ForoNuevoHiloPage from './pages/ForoNuevoHiloPage.jsx';
import ContactoPage from './pages/ContactoPage.jsx';
import GrupoPage from './pages/GrupoPage.jsx';
import EncuestasPage from './pages/EncuestasPage.jsx';
import NuevaNoticiaPage from './pages/NuevaNoticiaPage.jsx';
import EditarNoticiaPage from './pages/EditarNoticiaPage.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

function Layout({ children }) {
  const [siteVersion, setSiteVersion] = useState(() => {
    if (typeof window === 'undefined') return '2014';
    return localStorage.getItem('nw3-version') || '2014';
  });
  const [appPlatform, setAppPlatform] = useState(() => {
    if (typeof window === 'undefined') return 'windows';
    return localStorage.getItem('nw3-platform') || 'windows';
  });
  const [isNightMode, setIsNightMode] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7;
  });

  useEffect(() => {
    localStorage.setItem('nw3-version', siteVersion);
  }, [siteVersion]);

  useEffect(() => {
    localStorage.setItem('nw3-platform', appPlatform);
  }, [appPlatform]);

  useEffect(() => {
    const updateNightMode = () => {
      const hour = new Date().getHours();
      setIsNightMode(hour >= 20 || hour < 7);
    };

    updateNightMode();
    const interval = window.setInterval(updateNightMode, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nw3-night-mode', isNightMode);
    document.body.classList.toggle('nw3-day-mode', !isNightMode);

    return () => {
      document.body.classList.remove('nw3-night-mode', 'nw3-day-mode');
    };
  }, [isNightMode]);

  return (
    <>
      <div id="banner-top">
        <AdSense slot={ADSENSE_SLOT_TOP} style={{ width: 728, height: 90 }} />
      </div>
      <div id="banner-right">
        <AdSense slot={ADSENSE_SLOT_RIGHT} style={{ width: 160, height: 600 }} />
      </div>
      <div id="stage" className={`version-${siteVersion} platform-${appPlatform} ${isNightMode ? 'night-mode' : 'day-mode'}`}>
      <SiteHeader
        siteVersion={siteVersion}
        onVersionChange={setSiteVersion}
        appPlatform={appPlatform}
        onPlatformChange={setAppPlatform}
        isNightMode={isNightMode}
      />
      <div id="container">
        <div id="content">
          <div className="version-shell">
            {isValidElement(children)
              ? cloneElement(children, { appPlatform, onPlatformChange: setAppPlatform, isNightMode, siteVersion })
              : children}
            <AdSense slot={ADSENSE_SLOT_INLINE} className="ad-preview-inline" style={{ minHeight: 110 }} />
          </div>
          <Sidebar siteVersion={siteVersion} />
          <div style={{ clear: 'both' }}></div>
        </div>
      </div>
      <div id="footer">
        <p>© {new Date().getFullYear()} NW3 - Noticiasweb3</p>
      </div>
    </div>
    </>
  );
}

function NotFound() {
  return (
    <div id="main">
      <h1>Página no encontrada</h1>
      <p>La página que buscas no existe. <a href="/">Volver al inicio</a></p>
    </div>
  );
}

export default function App() {
  useEffect(() => { initGA(); }, []);

  return (
    <AuthProvider>
    <Router>
      <PageTracker />
      <Routes>
        <Route path="/" element={<Layout><BienvenidoPage /></Layout>} />
        <Route path="/bienvenido" element={<Layout><BienvenidoPage /></Layout>} />
        <Route path="/noticias" element={<Layout><NoticiasPage /></Layout>} />
        <Route path="/noticias/nueva" element={<Layout><NuevaNoticiaPage /></Layout>} />
        <Route path="/noticias/editar/:id" element={<Layout><EditarNoticiaPage /></Layout>} />
        <Route path="/noticias/:slug" element={<Layout><NoticiaDetailPage /></Layout>} />
        <Route path="/blog/:slug" element={<Layout><BlogPostDetailPage /></Layout>} />
        <Route path="/canal" element={<Layout><CanalPage /></Layout>} />
        <Route path="/iniciar-sesion" element={<Layout><IniciarSesionPage /></Layout>} />
        <Route path="/extensiones" element={<Layout><ExtensionesPage /></Layout>} />
        <Route path="/extensiones/:slug" element={<Layout><ExtensionDetailPage /></Layout>} />
        <Route path="/pulseras-rojas" element={<Layout><PulserasRojasPage /></Layout>} />
        <Route path="/pulseras-rojas/:slug" element={<Layout><PulseraDetailPage /></Layout>} />
        <Route path="/play-station" element={<Layout><PlayStationPage /></Layout>} />
        <Route path="/juegos-pc" element={<Layout><JuegosPCPage /></Layout>} />
        <Route path="/juegos-pc/:slug" element={<Layout><JuegoDetailPage /></Layout>} />
        <Route path="/juegos-online" element={<Layout><JuegosOnlinePage /></Layout>} />
        <Route path="/juegos-online/:slug" element={<Layout><JuegoOnlineDetailPage /></Layout>} />
        <Route path="/sube-imagenes" element={<Layout><SubeImagenesPage /></Layout>} />
        <Route path="/suscribirme" element={<Layout><SuscribirnePage /></Layout>} />
        <Route path="/afiliarte" element={<Layout><AfiliarteePage /></Layout>} />
        <Route path="/afiliados" element={<Layout><AfiadosPage /></Layout>} />
        <Route path="/lista-vip" element={<Layout><ListaVipPage /></Layout>} />
        <Route path="/foro" element={<Layout><ForoPage /></Layout>} />
        <Route path="/foro/nuevo" element={<Layout><ForoNuevoHiloPage /></Layout>} />
        <Route path="/foro/:categoria" element={<Layout><ForoCategoriaPage /></Layout>} />
        <Route path="/foro/:categoria/nuevo" element={<Layout><ForoNuevoHiloPage /></Layout>} />
        <Route path="/foro/:categoria/:id" element={<Layout><ForoHiloPage /></Layout>} />
        <Route path="/contacto" element={<Layout><ContactoPage /></Layout>} />
        <Route path="/grupo" element={<Layout><GrupoPage /></Layout>} />
        <Route path="/encuestas" element={<Layout><EncuestasPage /></Layout>} />
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </Router>
    </AuthProvider>
  );
}
