import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { navItems } from '../components/SiteHeader.jsx';
import pb from '../pb.js';

async function saveNavSettings(settingsId, setSettingsId, hidden, custom) {
  const value = { hidden, custom };
  if (settingsId) {
    await pb.collection('nw3_settings').update(settingsId, { value });
  } else {
    const r = await pb.collection('nw3_settings').create({ key: 'nav', value });
    setSettingsId(r.id);
  }
}

export default function IniciarSesionPage() {
  const { login, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [navSettingsId, setNavSettingsId] = useState(null);
  const [hiddenNavPaths, setHiddenNavPaths] = useState([]);
  const [customNavItems, setCustomNavItems] = useState([]);
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [nuevoUrl, setNuevoUrl] = useState('');
  const [añadiendo, setAñadiendo] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    pb.collection('nw3_settings').getFirstListItem('key="nav"')
      .then((r) => {
        setNavSettingsId(r.id);
        setHiddenNavPaths(r.value?.hidden || []);
        setCustomNavItems(r.value?.custom || []);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  async function toggleNavItem(path) {
    const newHidden = hiddenNavPaths.includes(path)
      ? hiddenNavPaths.filter((p) => p !== path)
      : [...hiddenNavPaths, path];
    setHiddenNavPaths(newHidden);
    try {
      await saveNavSettings(navSettingsId, setNavSettingsId, newHidden, customNavItems);
    } catch { /* ignore */ }
  }

  async function handleAñadir(e) {
    e.preventDefault();
    const label = nuevoLabel.trim();
    const url = nuevoUrl.trim();
    if (!label || !url) return;
    const isExternal = url.startsWith('http://') || url.startsWith('https://');
    const newItem = { label, path: url, ...(isExternal ? { external: true } : {}) };
    const newCustom = [...customNavItems, newItem];
    setAñadiendo(true);
    try {
      await saveNavSettings(navSettingsId, setNavSettingsId, hiddenNavPaths, newCustom);
      setCustomNavItems(newCustom);
      setNuevoLabel('');
      setNuevoUrl('');
    } catch {
      alert('No se pudo guardar el enlace.');
    } finally {
      setAñadiendo(false);
    }
  }

  async function handleEliminarCustom(path) {
    const newCustom = customNavItems.filter((i) => i.path !== path);
    const newHidden = hiddenNavPaths.filter((p) => p !== path);
    try {
      await saveNavSettings(navSettingsId, setNavSettingsId, newHidden, newCustom);
      setCustomNavItems(newCustom);
      setHiddenNavPaths(newHidden);
    } catch {
      alert('No se pudo eliminar el enlace.');
    }
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
              Desmarca para ocultar al público. Tú los sigues viendo siempre.
            </p>

            <p style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', margin: '4px 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Items originales
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

            {customNavItems.length > 0 && (
              <>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', margin: '8px 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Enlaces añadidos
                </p>
                {customNavItems.map((item) => (
                  <div key={item.path} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="admin-cat-toggle" style={{ flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={!hiddenNavPaths.includes(item.path)}
                        onChange={() => toggleNavItem(item.path)}
                      />
                      {item.label}
                      <span style={{ fontSize: '11px', color: '#999', marginLeft: 4 }}>({item.path})</span>
                      {hiddenNavPaths.includes(item.path) && (
                        <span className="admin-cat-hidden-tag">oculto</span>
                      )}
                    </label>
                    <button
                      type="button"
                      className="admin-btn admin-btn-delete admin-btn-sm"
                      onClick={() => handleEliminarCustom(item.path)}
                      title="Eliminar este enlace"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}

            <p style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Añadir nuevo enlace
            </p>
            <form onSubmit={handleAñadir} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', flex: '1 1 160px' }}>
                Nombre
                <input
                  type="text"
                  value={nuevoLabel}
                  onChange={(e) => setNuevoLabel(e.target.value)}
                  placeholder="Mi página"
                  maxLength={60}
                  required
                  style={{ padding: '5px 8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', flex: '2 1 220px' }}>
                URL
                <input
                  type="text"
                  value={nuevoUrl}
                  onChange={(e) => setNuevoUrl(e.target.value)}
                  placeholder="/mi-pagina o https://ejemplo.com"
                  maxLength={300}
                  required
                  style={{ padding: '5px 8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                />
              </label>
              <button
                type="submit"
                disabled={añadiendo}
                className="admin-btn admin-btn-edit"
                style={{ marginBottom: '1px' }}
              >
                {añadiendo ? 'Guardando…' : '+ Añadir'}
              </button>
            </form>
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
