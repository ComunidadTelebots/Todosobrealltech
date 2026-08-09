import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import pb from '../pb.js';
import './AfiliarteePage.css';

const initial = { title: '', description: '', url: '', contact: '', kind: 'telegram', placements: ['inline'], accepted_terms: false, company_website: '' };
const authHeaders = (json = false) => ({ Authorization: `Bearer ${pb.authStore.token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) });

export default function AfiliarteePage() {
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(initial), [status, setStatus] = useState('idle'), [message, setMessage] = useState('');
  const [reference, setReference] = useState(() => localStorage.getItem('nw3_affiliate_reference') || '');
  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const togglePlacement = (value) => field('placements', form.placements.includes(value) ? form.placements.filter((item) => item !== value) : [...form.placements, value]);

  async function submit(event) {
    event.preventDefault();
    if (!isAuthenticated) { setStatus('error'); setMessage('Debes crear una cuenta o iniciar sesión para enviar la solicitud.'); return; }
    setStatus('sending'); setMessage('');
    try {
      const response = await fetch('/hcgi/api/house-ads/apply', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo enviar');
      localStorage.setItem('nw3_affiliate_reference', payload.reference);
      setReference(payload.reference); setStatus('sent'); setForm(initial);
    } catch (error) { setStatus('error'); setMessage(error.message); }
  }

  async function checkStatus() {
    if (!isAuthenticated) { setStatus('error'); setMessage('Inicia sesión para consultar tu solicitud.'); return; }
    setStatus('checking');
    try {
      const response = await fetch(`/hcgi/api/house-ads/apply/${encodeURIComponent(reference)}`, { headers: authHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setMessage(({ pending: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'No aprobada', needs_changes: 'Necesita cambios' })[payload.application.status] || payload.application.status);
      setStatus('checked');
    } catch (error) { setMessage(error.message); setStatus('error'); }
  }

  return <div id="main" className="affiliate-apply-page">
    <header className="affiliate-apply-hero"><span>COLABORACIONES · SIN COSTE</span><h1>Solicita aparecer en nuestros anuncios</h1><p>Presenta tu canal, comunidad, web o proyecto. Todas las solicitudes se revisan manualmente antes de publicarse.</p></header>
    {!isAuthenticated && <section className="affiliate-account-gate"><div><span>CUENTA GRATUITA OBLIGATORIA</span><h2>Regístrate para afiliar tu proyecto</h2><p>La cuenta nos permite identificar al responsable, proteger la solicitud y mantenerte informado durante la revisión.</p></div><div className="affiliate-account-actions"><a className="affiliate-create-account" href="https://todosobreall.tech/signup?return=https%3A%2F%2Fnoticiasweb3.todosobreall.tech%2Fafiliarte">Crear cuenta gratis</a><Link to="/iniciar-sesion">Ya tengo cuenta</Link></div></section>}
    {isAuthenticated && <div className="affiliate-account-active"><span>✓</span><div><b>Solicitud vinculada a tu cuenta</b><small>{user?.name || user?.email || 'Usuario registrado'}</small></div></div>}
    <div className="affiliate-apply-layout">
      <form className={`affiliate-apply-form ${!isAuthenticated ? 'affiliate-form-locked' : ''}`} onSubmit={submit} aria-disabled={!isAuthenticated}>
        <h2>Tu propuesta</h2>{!isAuthenticated && <p className="affiliate-locked-note">🔒 Crea una cuenta o inicia sesión para habilitar el formulario.</p>}
        <fieldset disabled={!isAuthenticated} className="affiliate-form-fields">
          <label>Tipo de proyecto<select value={form.kind} onChange={(e) => field('kind', e.target.value)}><option value="telegram">Canal o grupo de Telegram</option><option value="website">Sitio web</option><option value="social">Red social</option><option value="project">Otro proyecto</option></select></label>
          <label>Nombre<input required minLength="3" maxLength="80" value={form.title} onChange={(e) => field('title', e.target.value)} /></label>
          <label>Descripción<textarea required minLength="10" maxLength="240" rows="4" value={form.description} onChange={(e) => field('description', e.target.value)} /><small>{form.description.length}/240</small></label>
          <label>Enlace HTTPS<input required type="url" value={form.url} onChange={(e) => field('url', e.target.value)} placeholder="https://t.me/tu_canal" /></label>
          <label>Contacto privado<input required value={form.contact} onChange={(e) => field('contact', e.target.value)} placeholder="correo@ejemplo.com o @usuario" /><small>No se muestra públicamente.</small></label>
          <fieldset><legend>Ubicaciones preferidas</legend><div className="affiliate-placement-grid">{[['top','Superior'],['left','Lateral izquierdo'],['right','Lateral derecho'],['inline','Entre contenidos'],['footer','Pie de página']].map(([value,label]) => <label key={value}><input type="checkbox" checked={form.placements.includes(value)} onChange={() => togglePlacement(value)} />{label}</label>)}</div></fieldset>
          <input className="affiliate-honeypot" tabIndex="-1" autoComplete="off" value={form.company_website} onChange={(e) => field('company_website', e.target.value)} aria-hidden="true" />
          <label className="affiliate-terms"><input required type="checkbox" checked={form.accepted_terms} onChange={(e) => field('accepted_terms', e.target.checked)} /><span>Acepto los <a href="/terminos" target="_blank">términos</a>. Es un intercambio de visibilidad sin pago y la aprobación no está garantizada.</span></label>
          <button className="affiliate-submit" disabled={status === 'sending'}>{status === 'sending' ? 'Enviando…' : 'Enviar para revisión'}</button>
        </fieldset>
        {status === 'error' && <p className="affiliate-form-error">{message}</p>}{status === 'sent' && <div className="affiliate-form-success"><b>Solicitud recibida</b><p>Referencia: <code>{reference}</code></p></div>}
      </form>
      <aside className="affiliate-apply-preview">
        <span>VISTA PREVIA</span><div className="affiliate-preview-card"><small>AFILIADO · INTERCAMBIO DE VISITAS</small><strong>{form.title || 'Tu proyecto'}</strong><p>{form.description || 'Aquí aparecerá la descripción breve de tu proyecto.'}</p><button type="button">{form.kind === 'telegram' ? 'Abrir comunidad' : 'Visitar proyecto'} →</button></div>
        <section className="affiliate-benefits"><h3>Ventajas de registrarte</h3><ul><li><b>Solicitud protegida:</b> queda vinculada a tu identidad y nadie puede consultarla por ti.</li><li><b>Seguimiento privado:</b> consulta si está pendiente, aprobada o necesita cambios.</li><li><b>Contacto seguro:</b> tus datos de contacto nunca aparecen en el anuncio público.</li><li><b>Perfil reutilizable:</b> usa la misma cuenta en NoticiasWeb3 y TodoSobreAllTech.</li><li><b>Servicio gratuito:</b> solicitar la afiliación no tiene coste ni garantiza la aprobación.</li></ul></section>
        <h3>¿Qué revisamos?</h3><ul><li>Contenido legal y seguro.</li><li>Destino accesible e información clara.</li><li>Afinidad con tecnología o comunidad.</li><li>Ausencia de engaños y malware.</li></ul>
        {reference && isAuthenticated && <div className="affiliate-status-box"><b>Consultar solicitud</b><code>{reference}</code><button type="button" onClick={checkStatus}>{status === 'checking' ? 'Consultando…' : 'Ver estado'}</button>{status === 'checked' && <p>{message}</p>}</div>}
      </aside>
    </div>
  </div>;
}
