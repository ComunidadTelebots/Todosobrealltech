import { useState } from 'react';
import { Link } from 'react-router-dom';
import { readCookieConsent, requiresCookieConsent, saveCookieConsent } from '../utils/cookieConsent.js';

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => requiresCookieConsent() && !readCookieConsent());
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);
  if (!visible) return null;
  const save = (value) => { saveCookieConsent(value); setVisible(false); };
  return <aside className="nw3-cookie-banner" role="dialog" aria-modal="true" aria-labelledby="nw3-cookie-title">
    <div className="nw3-cookie-icon" aria-hidden="true">🍪</div>
    <div className="nw3-cookie-copy">
      <strong id="nw3-cookie-title">Tu privacidad en NoticiasWeb3</strong>
      <p>En Europa necesitamos tu permiso para analítica y publicidad de Google. Los anuncios propios de la comunidad no crean perfiles de terceros.</p>
      {details && <div className="nw3-cookie-options">
        <label><input type="checkbox" checked disabled /> Esenciales</label>
        <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Analítica</label>
        <label><input type="checkbox" checked={ads} onChange={(event) => setAds(event.target.checked)} /> Publicidad de Google</label>
      </div>}
      <small><Link to="/cookies">Política de cookies</Link> · <Link to="/privacidad">Privacidad</Link></small>
    </div>
    <div className="nw3-cookie-actions">
      <button type="button" onClick={() => save({ analytics: false, ads: false })}>Rechazar</button>
      {details
        ? <button type="button" onClick={() => save({ analytics, ads })}>Guardar elección</button>
        : <button type="button" onClick={() => setDetails(true)}>Configurar</button>}
      <button type="button" className="primary" onClick={() => save({ analytics: true, ads: true })}>Aceptar todo</button>
    </div>
  </aside>;
}
