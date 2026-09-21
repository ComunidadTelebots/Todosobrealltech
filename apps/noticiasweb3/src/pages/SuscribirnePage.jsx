import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import pb from '../pb.js';

const RSS_URL = 'https://todosobreall.tech/hcgi/api/noticias/rss';
const TELEGRAM_URL = 'https://t.me/TodoSobreAllTech';
const TOPICS = ['Tecnología', 'Ciberseguridad', 'Inteligencia artificial', 'Web3', 'Telegram', 'Videojuegos', 'Privacidad'];
const DEFAULT_PREFERENCES = { topics: ['Tecnología', 'Ciberseguridad', 'Inteligencia artificial'], frequency: 'instant', active: true };

export default function SuscribirnePage() {
  const { user, isAuthenticated } = useAuth();
  const [recordId, setRecordId] = useState('');
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user?.id) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    pb.collection('nw3_subscriptions').getFirstListItem(`user="${user.id}"`)
      .then((record) => {
        if (!active) return;
        setRecordId(record.id);
        setPreferences({
          topics: Array.isArray(record.topics) ? record.topics.filter((topic) => TOPICS.includes(topic)) : DEFAULT_PREFERENCES.topics,
          frequency: ['instant', 'daily', 'weekly'].includes(record.frequency) ? record.frequency : 'instant',
          active: record.active !== false,
        });
      })
      .catch((error) => { if (active && error?.status !== 404) setMessage('No se pudieron cargar tus preferencias.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  const summary = useMemo(() => preferences.topics.length
    ? `${preferences.topics.length} temas · ${preferences.frequency === 'instant' ? 'al momento' : preferences.frequency === 'daily' ? 'resumen diario' : 'resumen semanal'}`
    : 'Selecciona al menos un tema', [preferences]);

  function toggleTopic(topic) {
    setMessage('');
    setPreferences((current) => ({ ...current, topics: current.topics.includes(topic)
      ? current.topics.filter((item) => item !== topic)
      : [...current.topics, topic] }));
  }

  async function savePreferences() {
    if (!isAuthenticated || !user?.id) return;
    if (!preferences.topics.length) { setMessage('Selecciona al menos un tema.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const payload = { user: user.id, topics: preferences.topics, frequency: preferences.frequency, active: preferences.active };
      const record = recordId
        ? await pb.collection('nw3_subscriptions').update(recordId, payload)
        : await pb.collection('nw3_subscriptions').create(payload);
      setRecordId(record.id);
      setMessage('Preferencias guardadas correctamente.');
    } catch (error) {
      setMessage(error?.response?.message || 'No se pudieron guardar las preferencias.');
    } finally { setSaving(false); }
  }

  async function copyRss() {
    try { await navigator.clipboard.writeText(RSS_URL); setMessage('Enlace RSS copiado.'); }
    catch { setMessage('Abre el RSS y copia la dirección desde el navegador.'); }
  }

  return (
    <div id="main" className="subscription-page">
      <header className="subscription-hero">
        <span className="subscription-kicker">NoticiasWeb3 · Suscripciones</span>
        <h1>Elige cómo seguir las noticias</h1>
        <p>Canales oficiales y abiertos, sin vender tu dirección ni crear perfiles publicitarios.</p>
      </header>

      <div className="subscription-grid">
        <article className="subscription-card subscription-card--telegram">
          <span className="subscription-card-icon" aria-hidden="true">✈</span>
          <div><small>Actualizaciones inmediatas</small><h2>Canal de Telegram</h2><p>Recibe titulares, enlaces a los artículos y novedades de la comunidad.</p></div>
          <a className="subscription-primary" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Unirme al canal →</a>
        </article>

        <article className="subscription-card subscription-card--rss">
          <span className="subscription-card-icon" aria-hidden="true">◔</span>
          <div><small>Abierto y sin algoritmos</small><h2>Fuente RSS</h2><p>Añádela a cualquier lector y conserva el control sobre lo que consultas.</p></div>
          <div className="subscription-actions"><a href={RSS_URL} target="_blank" rel="noopener noreferrer">Abrir RSS</a><button type="button" onClick={copyRss}>Copiar enlace</button></div>
        </article>
      </div>

      <section className="subscription-preferences" aria-labelledby="subscription-preferences-title">
        <header><div><small>Panel personal</small><h2 id="subscription-preferences-title">Preferencias de contenido</h2><p>Guarda los temas que te interesan para personalizar las próximas funciones de lectura y resúmenes.</p></div><span className={`subscription-status ${preferences.active ? 'is-active' : ''}`}>{preferences.active ? 'Activo' : 'Pausado'}</span></header>
        {!isAuthenticated ? <div className="subscription-login"><p>Inicia sesión para guardar estas preferencias de forma privada en tu cuenta.</p><Link to="/iniciar-sesion">Iniciar sesión →</Link></div> : loading ? <p className="subscription-loading">Cargando preferencias…</p> : <>
          <fieldset><legend>Temas</legend><div className="subscription-topics">{TOPICS.map((topic) => <button key={topic} type="button" className={preferences.topics.includes(topic) ? 'selected' : ''} aria-pressed={preferences.topics.includes(topic)} onClick={() => toggleTopic(topic)}>{preferences.topics.includes(topic) ? '✓ ' : '+ '}{topic}</button>)}</div></fieldset>
          <fieldset><legend>Frecuencia preferida</legend><div className="subscription-frequency">{[['instant', 'Al momento'], ['daily', 'Resumen diario'], ['weekly', 'Resumen semanal']].map(([value, label]) => <label key={value}><input type="radio" name="subscription-frequency" value={value} checked={preferences.frequency === value} onChange={() => setPreferences((current) => ({ ...current, frequency: value }))}/><span>{label}</span></label>)}</div></fieldset>
          <div className="subscription-save"><label><input type="checkbox" checked={preferences.active} onChange={(event) => setPreferences((current) => ({ ...current, active: event.target.checked }))}/> Suscripción activa</label><span>{summary}</span><button type="button" disabled={saving || !preferences.topics.length} onClick={savePreferences}>{saving ? 'Guardando…' : 'Guardar preferencias'}</button></div>
        </>}
      </section>
      {message && <p className="subscription-message" role="status">{message}</p>}
      <p className="subscription-privacy">Puedes cambiar o eliminar tus preferencias cuando quieras. Consulta nuestra <Link to="/privacidad">política de privacidad</Link>.</p>
    </div>
  );
}
