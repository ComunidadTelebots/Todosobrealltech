import { useParams, Link } from 'react-router-dom';

const data = {
  adblock: {
    title: 'AdBlock',
    categoria: 'Bloqueador de anuncios',
    compatibilidad: 'Chrome, Firefox, Edge, Safari',
    sections: [
      {
        heading: '¿Qué es AdBlock?',
        body: 'AdBlock es una de las extensiones de bloqueo de anuncios más descargadas del mundo. Elimina anuncios de YouTube, banners, pop-ups y anuncios en redes sociales como Facebook e Instagram.',
      },
      {
        heading: 'Características principales',
        body: 'Permite crear listas blancas para apoyar webs de confianza, bloquea rastreadores de terceros, y ofrece una lista curada de "Acceptable Ads" para no bloquear anuncios no intrusivos (desactivable).',
      },
      {
        heading: 'Cómo instalarlo',
        body: 'Busca "AdBlock" en la tienda de extensiones de tu navegador. Disponible para Chrome, Firefox, Edge y Safari. La instalación es inmediata y no requiere cuenta.',
      },
    ],
  },
  avast: {
    title: 'Avast Online Security',
    categoria: 'Seguridad',
    compatibilidad: 'Chrome, Firefox, Edge',
    sections: [
      {
        heading: '¿Qué es Avast Online Security?',
        body: 'Es una extensión de seguridad gratuita de Avast que protege contra sitios de phishing, webs maliciosas y rastreadores mientras navegas. Muestra puntuaciones de reputación para cada sitio web.',
      },
      {
        heading: 'Protección en tiempo real',
        body: 'Analiza cada URL que visitas contra la base de datos de amenazas de Avast, que se actualiza constantemente. Avisa antes de que entres en una web fraudulenta o comprometida.',
      },
      {
        heading: 'Cómo instalarlo',
        body: 'Disponible en la Chrome Web Store y Mozilla Add-ons. Al instalarlo, funciona automáticamente sin configuración adicional. Puedes ver el estado de seguridad de cada web en el icono de la barra de herramientas.',
      },
    ],
  },
  bitdefender: {
    title: 'Bitdefender QuickScan',
    categoria: 'Antivirus / Seguridad',
    compatibilidad: 'Chrome, Firefox, Edge',
    sections: [
      {
        heading: '¿Qué es Bitdefender QuickScan?',
        body: 'Bitdefender QuickScan es una herramienta de análisis antivirus rápido que funciona desde el navegador. Permite escanear el equipo en busca de malware sin necesidad de instalar el antivirus completo de Bitdefender.',
      },
      {
        heading: '¿Para qué sirve?',
        body: 'Detecta virus, spyware, adware y otros tipos de malware activos en el sistema. Es especialmente útil como segunda opinión cuando ya tienes otro antivirus instalado o cuando quieres un análisis rápido sin compromisos.',
      },
      {
        heading: 'Cómo usarlo',
        body: 'Accede a la página oficial de Bitdefender QuickScan desde tu navegador y ejecuta el análisis con un solo clic. No requiere instalación permanente y los resultados se muestran en pocos minutos.',
      },
    ],
  },
};

export default function ExtensionDetailPage() {
  const { slug } = useParams();
  const ext = data[slug];

  if (!ext) {
    return (
      <div id="main">
        <h1>Extensión no encontrada</h1>
        <p>La extensión que buscas no existe. <Link to="/extensiones">Ver todas las extensiones</Link></p>
      </div>
    );
  }

  return (
    <div id="main">
      <h1>{ext.title}</h1>
      <p className="article-meta" style={{ marginBottom: '20px' }}>
        {ext.categoria} · {ext.compatibilidad}
      </p>

      {ext.sections.map((s) => (
        <div className="article" key={s.heading}>
          <h2 style={{ color: '#333', fontSize: '16px' }}>{s.heading}</h2>
          <div className="article-body">
            <p>{s.body}</p>
          </div>
        </div>
      ))}

      <p style={{ marginTop: '10px' }}>
        <Link to="/extensiones">← Volver a extensiones</Link>
      </p>
    </div>
  );
}
