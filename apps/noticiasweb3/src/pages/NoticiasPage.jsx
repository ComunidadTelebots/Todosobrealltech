const noticias = [
  {
    id: 1,
    title: 'Google I/O 2025: Android 16, Gemini y más novedades',
    date: '14 de Mayo, 2025',
    body: `Google presentó en su conferencia anual para desarrolladores las últimas novedades de Android 16,
    con mejoras en rendimiento, privacidad y nuevas integraciones con Gemini AI. Entre los anuncios más
    destacados se encuentran el nuevo diseño de Material You y mejoras en la detección de amenazas.`,
  },
  {
    id: 2,
    title: 'Vulnerabilidad crítica en procesadores MediaTek',
    date: '2 de Mayo, 2025',
    body: `Se ha detectado una nueva vulnerabilidad en los chipsets MediaTek que afecta a millones de
    dispositivos Android. Los fabricantes ya están lanzando parches de seguridad. Se recomienda
    actualizar el sistema operativo de tu dispositivo a la última versión disponible.`,
  },
  {
    id: 3,
    title: 'Los mejores bloqueadores de anuncios en 2025',
    date: '20 de Abril, 2025',
    body: `uBlock Origin sigue siendo el rey de los bloqueadores de anuncios, pero han surgido
    alternativas interesantes como AdGuard y Brave Shield. Analizamos las opciones disponibles
    para Chrome, Firefox y Edge.`,
  },
];

export default function NoticiasPage() {
  return (
    <div id="main">
      <h1>Novedades y Noticias</h1>
      {noticias.map((n) => (
        <div className="article" key={n.id}>
          <h2>{n.title}</h2>
          <div className="article-meta">{n.date}</div>
          <div className="article-body">
            <p>{n.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
