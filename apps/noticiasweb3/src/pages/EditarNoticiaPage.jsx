import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import pb from '../pb.js';
import NewsLegoEditor, { parseLayoutBlocks } from '../components/NewsLegoEditor.jsx';
import RichNewsEditor from '../components/RichNewsEditor.jsx';

const CATEGORIAS = ['Tecnología', 'IA', 'Ciberseguridad', 'Gaming', 'General'];

export default function EditarNoticiaPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [contenido, setContenido] = useState('');
  const [layoutBlocks, setLayoutBlocks] = useState([]);

  useEffect(() => {
    pb.collection('nw3_noticias').getOne(id)
      .then((item) => { setRecord(item); setContenido(item.contenido || ''); setLayoutBlocks(parseLayoutBlocks(item.layout_blocks)); })
      .catch(() => setRecord(null))
      .finally(() => setCargando(false));
  }, [id]);

  if (!isAuthenticated) {
    return (
      <div id="main">
        <h1>Acceso restringido</h1>
        <p>Debes <Link to="/iniciar-sesion">iniciar sesión</Link> para editar noticias.</p>
      </div>
    );
  }

  if (cargando) return <div id="main"><p>Cargando…</p></div>;

  if (!record) {
    return (
      <div id="main">
        <h1>Noticia no encontrada</h1>
        <p><Link to="/noticias">← Volver a noticias</Link></p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const datos = new FormData(e.target);
    const titulo = datos.get('titulo')?.trim();
    const categoria = datos.get('categoria');
    const fecha = datos.get('fecha')?.trim();
    const contenidoFinal = contenido.trim();
    const fuente_label = datos.get('fuente_label')?.trim();
    const fuente_url = datos.get('fuente_url')?.trim();
    const destacado = datos.get('destacado') === 'on';

    const errs = {};
    if (!titulo) errs.titulo = 'El título es obligatorio.';
    if (!contenidoFinal) errs.contenido = 'El contenido es obligatorio.';
    if (Object.keys(errs).length) { setErrores(errs); return; }

    setEnviando(true);
    try {
      await pb.collection('nw3_noticias').update(id, {
        titulo,
        categoria,
        fecha,
        contenido: contenidoFinal,
        fuente_label: fuente_label || '',
        fuente_url: fuente_url || '',
        destacado,
        layout_blocks: JSON.stringify(layoutBlocks),
      });
      navigate(`/noticias/${record.slug}`);
    } catch {
      setErrores({ general: 'No se pudo guardar la noticia. Inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="main">
      <Link to={`/noticias/${record.slug}`} className="foro-volver">← Volver a la noticia</Link>
      <h1>Editar noticia</h1>
      {errores.general && <p className="foro-error">{errores.general}</p>}
      <form className="foro-form" onSubmit={handleSubmit}>
        <label>
          Título
          <input type="text" name="titulo" maxLength={200} required defaultValue={record.titulo} />
          {errores.titulo && <span className="foro-campo-error">{errores.titulo}</span>}
        </label>
        <label>
          Categoría
          <select name="categoria" defaultValue={record.categoria || 'Tecnología'}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Fecha de publicación
          <input type="text" name="fecha" defaultValue={record.fecha} maxLength={40} />
        </label>
        <label>
          Contenido
          <RichNewsEditor value={contenido} onChange={setContenido} draftKey={id} />
          {errores.contenido && <span className="foro-campo-error">{errores.contenido}</span>}
        </label>
        <NewsLegoEditor value={layoutBlocks} onChange={setLayoutBlocks} content={contenido}/>
        <label>
          Fuente — nombre (opcional)
          <input type="text" name="fuente_label" maxLength={100} defaultValue={record.fuente_label} />
        </label>
        <label>
          Fuente — URL (opcional)
          <input type="url" name="fuente_url" defaultValue={record.fuente_url} />
        </label>
        <label className="admin-check-label">
          <input type="checkbox" name="destacado" defaultChecked={record.destacado} />
          Destacar esta noticia
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
