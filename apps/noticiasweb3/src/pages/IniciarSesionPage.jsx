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
  const { login, isAuthenticated, logout, user, role } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [navSettingsId, setNavSettingsId] = useState(null);
  const [hiddenNavPaths, setHiddenNavPaths] = useState([]);
  const [customNavItems, setCustomNavItems] = useState([]);
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [nuevoUrl, setNuevoUrl] = useState('');
  const [añadiendo, setAñadiendo] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [userError, setUserError] = useState('');

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

  useEffect(() => {
    if (role !== 'admin') return;
    setLoadingUsers(true);
    pb.collection('users').getFullList({ sort: 'created' })
      .then((list) => setUsers(list))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [role]);

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

  async function handleCrearUsuario(e) {
    e.preventDefault();
    const email = newUserEmail.trim();
    const password = newUserPassword.trim();
    if (!email || !password) return;
    setUserError('');
    setCreandoUsuario(true);
    try {
      const created = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        role: newUserRole,
        emailVisibility: true,
        verified: true,
      });
      setUsers((prev) => [...prev, created]);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
    } catch (err) {
      setUserError(err?.message || 'No se pudo crear el usuario.');
    } finally {
      setCreandoUsuario(false);
    }
  }

  async function handleCambiarRol(userId, newRole) {
    try {
      const updated = await pb.collection('users').update(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: updated.role } : u));
    } catch {
      alert('No se pudo cambiar el rol.');
    }
  }

  async function handleEliminarUsuario(userId, email) {
    if (!confirm(`¿Eliminar el usuario ${email}? Esta acción no se puede deshacer.`)) return;
    try {
      await pb.collection('users').delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert('No se pudo eliminar el usuario.');
    }
  }

  if (isAuthenticated) {
    return (
      <div id="main">
        <h1>Panel de administración</h1>
        <p style={{ marginBottom: 14 }}>
          Sesión activa como <strong>{user?.email || user?.username}</strong>
          {role && (
            <span className={`admin-role-badge admin-role-${role}`}>{role}</span>
          )}
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
              Pulsa para cambiar la visibilidad de cada enlace. Los ocultos solo los ves tú.
            </p>

            <p className="admin-section-label">Items originales</p>
            <div className="admin-nav-grid">
              {navItems.map((item) => {
                const isHidden = hiddenNavPaths.includes(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`admin-vis-pill ${isHidden ? 'admin-vis-hidden' : 'admin-vis-visible'}`}
                    onClick={() => toggleNavItem(item.path)}
                    title={isHidden ? 'Oculto al público — pulsa para mostrar' : 'Visible al público — pulsa para ocultar'}
                  >
                    <span className="admin-vis-dot">{isHidden ? '✗' : '●'}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>

            {customNavItems.length > 0 && (
              <>
                <p className="admin-section-label" style={{ marginTop: 10 }}>Enlaces añadidos</p>
                <div className="admin-nav-grid">
                  {customNavItems.map((item) => {
                    const isHidden = hiddenNavPaths.includes(item.path);
                    return (
                      <div key={item.path} className="admin-custom-item">
                        <button
                          type="button"
                          className={`admin-vis-pill ${isHidden ? 'admin-vis-hidden' : 'admin-vis-visible'}`}
                          onClick={() => toggleNavItem(item.path)}
                          title={isHidden ? 'Oculto al público — pulsa para mostrar' : 'Visible al público — pulsa para ocultar'}
                        >
                          <span className="admin-vis-dot">{isHidden ? '✗' : '●'}</span>
                          {item.label}
                          <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: 3 }}>({item.path})</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-delete admin-btn-sm"
                          onClick={() => handleEliminarCustom(item.path)}
                          title="Eliminar este enlace"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <p className="admin-section-label" style={{ marginTop: 10 }}>Añadir nuevo enlace</p>
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

        {role === 'admin' && (
          <details className="admin-panel-categorias" style={{ marginTop: 16 }}>
            <summary>👥 Gestión de usuarios</summary>
            <div className="admin-panel-body" style={{ flexDirection: 'column', gap: '12px' }}>
              {loadingUsers ? (
                <p style={{ fontSize: '13px', color: '#666' }}>Cargando usuarios…</p>
              ) : (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Verificado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={u.id === user?.id ? 'admin-users-row-self' : ''}>
                        <td>{u.email}</td>
                        <td>
                          <select
                            value={u.role || 'user'}
                            disabled={u.id === user?.id}
                            onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                            className="admin-role-select"
                          >
                            <option value="user">user</option>
                            <option value="creator">creator</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {u.verified ? '✓' : '✗'}
                        </td>
                        <td>
                          {u.id !== user?.id && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-delete admin-btn-sm"
                              onClick={() => handleEliminarUsuario(u.id, u.email)}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <p className="admin-section-label" style={{ marginTop: 4 }}>Crear nuevo usuario</p>
              {userError && <p className="foro-error" style={{ margin: 0 }}>{userError}</p>}
              <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', flex: '2 1 200px' }}>
                  Email
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    required
                    style={{ padding: '5px 8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', flex: '2 1 180px' }}>
                  Contraseña
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                    style={{ padding: '5px 8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', flex: '1 1 120px' }}>
                  Rol
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="admin-role-select"
                  >
                    <option value="user">user</option>
                    <option value="creator">creator</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={creandoUsuario}
                  className="admin-btn admin-btn-edit"
                  style={{ marginBottom: '1px' }}
                >
                  {creandoUsuario ? 'Creando…' : '+ Crear usuario'}
                </button>
              </form>
            </div>
          </details>
        )}
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
