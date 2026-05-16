import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SiteHeader from './components/SiteHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import BienvenidoPage from './pages/HomePage.jsx';
import NoticiasPage from './pages/NoticiasPage.jsx';
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
import ContactoPage from './pages/ContactoPage.jsx';
import GrupoPage from './pages/GrupoPage.jsx';
import EncuestasPage from './pages/EncuestasPage.jsx';

function Layout({ children }) {
  return (
    <div id="stage">
      <SiteHeader />
      <div id="container">
        {children}
        <Sidebar />
        <div style={{ clear: 'both' }}></div>
      </div>
      <div id="footer">
        <p>© {new Date().getFullYear()} NW3 - Noticiasweb3</p>
      </div>
    </div>
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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><BienvenidoPage /></Layout>} />
        <Route path="/bienvenido" element={<Layout><BienvenidoPage /></Layout>} />
        <Route path="/noticias" element={<Layout><NoticiasPage /></Layout>} />
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
        <Route path="/contacto" element={<Layout><ContactoPage /></Layout>} />
        <Route path="/grupo" element={<Layout><GrupoPage /></Layout>} />
        <Route path="/encuestas" element={<Layout><EncuestasPage /></Layout>} />
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </Router>
  );
}
