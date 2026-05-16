import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SiteHeader from './components/SiteHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import BienvenidoPage from './pages/BienvenidoPage.jsx';
import NoticiasPage from './pages/NoticiasPage.jsx';

function Layout({ children }) {
  return (
    <div id="stage">
      <SiteHeader />
      <div id="container">
        {children}
        <Sidebar />
      </div>
      <div id="footer">
        <p>
          © {new Date().getFullYear()} NW3 - Noticiasweb3 ·{' '}
          <a href="https://todosobreall.tech" target="_blank" rel="noopener noreferrer">
            TodoSobreAllTech
          </a>{' '}
          · <a href="https://t.me/todosobrealltech" target="_blank" rel="noopener noreferrer">Telegram</a>
        </p>
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
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </Router>
  );
}
