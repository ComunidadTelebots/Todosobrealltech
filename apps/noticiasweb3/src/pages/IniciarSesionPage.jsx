import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function IniciarSesionPage() {
  const { login, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (isAuthenticated) {
    return (
      <div id="main">
        <h1>Sesión activa</h1>
        <p>Has iniciado sesión como <strong>{user?.email || user?.username}</strong>.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Link
            to="/noticias/nueva"
            style={{
              display: 'inline-block',
              padding: '7px 16px',
              background: '#b50433',
              color: '#fff',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            + Nueva noticia
          </Link>
          <button
            type="button"
            onClick={() => { logout(); navigate('/'); }}
            style={{
              padding: '7px 16px',
              background: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
            }}
          >
            Cerrar sesión
          </button>
        </div>
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
      navigate('/');
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
