import { Link } from 'react-router-dom';

const extensiones = [
  {
    slug: 'adblock',
    title: 'AdBlock',
    description: 'Uno de los bloqueadores de anuncios más populares. Bloquea anuncios intrusivos, banners y vídeos publicitarios en todas las webs.',
    categoria: 'Bloqueador de anuncios',
    compatibilidad: 'Chrome, Firefox, Edge, Safari',
  },
  {
    slug: 'avast',
    title: 'Avast Online Security',
    description: 'Extensión de seguridad que avisa sobre webs de phishing y malware en tiempo real mientras navegas.',
    categoria: 'Seguridad',
    compatibilidad: 'Chrome, Firefox, Edge',
  },
  {
    slug: 'bitdefender',
    title: 'Bitdefender QuickScan',
    description: 'Herramienta de análisis rápido de Bitdefender para detectar malware y amenazas en tu navegador sin necesidad de instalar el antivirus completo.',
    categoria: 'Antivirus / Seguridad',
    compatibilidad: 'Chrome, Firefox, Edge',
  },
];

export default function ExtensionesPage() {
  return (
    <div id="main">
      <h1>Extensiones de Buscadores</h1>

      {extensiones.map((ext) => (
        <div className="article" key={ext.slug}>
          <h2><Link to={`/extensiones/${ext.slug}`}>{ext.title}</Link></h2>
          <div className="article-meta">{ext.categoria} · {ext.compatibilidad}</div>
          <div className="article-body">
            <p>{ext.description}</p>
          </div>
          <Link className="read-more" to={`/extensiones/${ext.slug}`}>Ver más »</Link>
        </div>
      ))}
    </div>
  );
}
