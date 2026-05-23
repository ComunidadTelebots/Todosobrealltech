import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { navItems } from '../components/SiteHeader.jsx';
import pb from '../pb.js';

export default function IniciarSesionPage() {
  const { login, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Nav management state (only when logged in)
  const [hiddenNavPaths, setHiddenNavPaths] = useState([]);
  const [navSettingsId, setNavSettingsId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    pb.collection('nw3_settings').getFirstListItem('key="nav"')
      .then((r) => { setNavSettingsId(r.id); setHiddenNavPaths(r.value?.hidden || []); })
      .catch(() => {});
  }, [isAuthenticated]);

  async function toggleNavItem(path) {
    const newHidden = hiddenNavPaths.includes(path)
      ? hiddenNavPaths.filter((p) => p !== path)
      : [...hiddenNavPaths, path];
    setHiddenNavPaths(newHidden);
    try {
      if (navSettingsId) {
        await pb.collection('nw3_settings').update(navSettingsId, { value: { hidden: newHidden } });
      } else {
        const r = await pb.collection('nw3_settings').create({ key: 'nav', value: { hidden: newHidden } });
        setNavSettingsId(r.id);
      }
    } catch { /* ignore */ }
  }

  if (isAuthenticated) {
    return (
      <div id="main">
        <h1>Panel de administración</h1>
        <p style={{ marginBottom: 14 }}>
          Sesión activa como <strong>{user?.email || user?.username}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <Link
            to="/noticias/nueva"
            style={{
              display: 'inline-block', padding: '7px 16px', background: '#b50433',
              color: '#fff', borderRadius: '3px', textDecoration: 'none', fontSize: '13px', fontWeight: '700',
            }}
          >
            + Nueva noticia
          </Link>
          <button
            type="button"
            onClick={() => { logout(); navigate('/'); }}
            style={{
              padding: '7px 16px', background: '#555', color: '#fff', border: 'none',
              borderRadius: '3px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
            }}
          >
            Cerrar sesión
          </button>
        </div>

        <details className="admin-panel-categorias" open>
          <summary>⚙ Gestión del menú de navegación</summary>
          <div className="admin-panel-body" style={{ flexDirection: 'column', gap: '8px' }}>
            <p className="admin-panel-hint">
              Desactiva items para ocultarlos del menú a todos los visitantes. Tú los sigues viendo.
            </p>
            {navItems.map((item) => (
              <label key={item.path} className="admin-cat-toggle">
                <input
                  type="checkbox"
                  checked={!hiddenNavPaths.includes(item.path)}
                  onChange={() => toggleNavItem(item.path)}
                />
                {item.label}
                {hiddenNavPaths.includes(item.path) && (
                  <span className="admin-cat-hidden-tag">oculto</span>
                )}
              </label>
            ))}
          </div>
        </details>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const datos = new FormData(e.target);
    const email = datos.get('email')?.trim();
    const password = datos.get('password');
    setError('');
    setEnviando(true);
    try {
      await login(email, password);
      navigate('/iniciar-sesion');
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="main">
      <h1>Iniciar sesión</h1>
      {error && <p className="foro-error">{error}</p>}
      <form className="foro-form" onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <label>
          Correo electrónico
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
