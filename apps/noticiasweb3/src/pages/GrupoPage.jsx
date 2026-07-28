const archive2012 = 'https://web.archive.org/web/20121026210044/http://www.noticiasweb3.es.tl/';
const archive2014 = 'https://web.archive.org/web/20140625191533/http://noticiasweb3.es.tl/Novedades-y-Noticias.htm';

const milestones = [
  {
    year: '2012',
    title: 'Nace noticiasweb3.es.tl',
    text: 'La primera etapa reunía noticias, juegos, trucos, descargas, compraventa de móviles y soporte. La comunidad comenzó a crecer alrededor del foro, Facebook y Tuenti.',
  },
  {
    year: '2013',
    title: 'La web se convierte en un grupo',
    text: 'Llegaron los apartados de afiliación, contenidos de Pulseras Rojas, juegos online, descuentos locales, cuentas de usuario y publicaciones firmadas por el equipo de soporte del Grupo Noticiasweb3.',
  },
  {
    year: '2014',
    title: 'Una nueva imagen',
    text: 'NoticiasWeb3 estrenó el diseño claro que hoy puede recuperarse con el selector 2014. Integraba versión móvil, comentarios, traducción, Facebook y la cuenta de Twitter @GrupoNW3.',
  },
  {
    year: 'Después',
    title: 'El proyecto original deja de actualizarse',
    text: 'La publicación perdió continuidad y la antigua web quedó ligada a una plataforma gratuita y a servicios externos que fueron envejeciendo o desapareciendo.',
  },
  {
    year: '2026',
    title: 'NoticiasWeb3 vuelve',
    text: 'El proyecto regresa dentro de TodoSobreAllTech, conserva sus versiones históricas y recupera noticias, comunidad y archivo con una infraestructura propia y mantenible.',
  },
];

export default function GrupoPage() {
  return (
    <div id="main" className="nw3-history-page">
      <header className="nw3-history-hero">
        <span className="nw3-history-kicker">Archivo del proyecto</span>
        <h1>La historia de NoticiasWeb3</h1>
        <p>Antes de formar parte de TodoSobreAllTech, esta comunidad vivió en <strong>noticiasweb3.es.tl</strong>. Esta es la historia que hemos podido reconstruir a partir de sus propias copias conservadas.</p>
      </header>

      <section className="nw3-history-origin">
        <h2>Los inicios</h2>
        <p>NoticiasWeb3 comenzó en 2012 como una web hecha por aficionados para compartir tecnología, actualidad y entretenimiento. Su portada invitaba a enviar sugerencias y ofrecía juegos, trucos, enlaces, soporte y contenidos sobre móviles.</p>
        <p>Muy pronto dejó de ser solamente una página. Aparecieron un foro, perfiles privados, afiliados, encuestas, redes sociales y un equipo que firmaba sus publicaciones como <strong>Grupo Noticiasweb3</strong>. La comunidad también utilizó Facebook, Tuenti y la cuenta <strong>@GrupoNW3</strong>.</p>
      </section>

      <section aria-labelledby="history-timeline-title">
        <h2 id="history-timeline-title">Nuestra cronología</h2>
        <div className="nw3-history-timeline">
          {milestones.map((item) => (
            <article key={item.year} className="nw3-history-event">
              <span>{item.year}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="nw3-history-close" aria-labelledby="why-closed-title">
        <h2 id="why-closed-title">¿Por qué tuvo que cerrar?</h2>
        <p>No se conserva un comunicado público que señale una sola causa. Lo que sí muestra el archivo es que la web dependía por completo del alojamiento gratuito de <strong>es.tl/Webme</strong>, de publicidad impuesta por la plataforma y de numerosos recursos externos cargados sin HTTPS.</p>
        <p>Con el paso del tiempo, varias integraciones quedaron obsoletas, las redes sociales cambiaron y mantener aquella estructura dejó de ser viable. Al perder continuidad editorial, la web original terminó cerrando. Esta explicación es una reconstrucción basada en el material conservado; no pretende sustituir un anuncio de cierre que no aparece en el archivo.</p>
      </section>

      <section className="nw3-history-return">
        <h2>El regreso</h2>
        <p>La nueva NoticiasWeb3 recupera aquella identidad sin borrar su pasado. Los modos 2012 y 2014 recuerdan sus dos diseños originales, mientras que la versión 2026 continúa el proyecto con tecnología actual, alojamiento propio y el respaldo del ecosistema TodoSobreAllTech.</p>
        <div className="nw3-history-actions">
          <a href={archive2012} target="_blank" rel="noopener noreferrer">Ver copia de 2012</a>
          <a href={archive2014} target="_blank" rel="noopener noreferrer">Ver copia de 2014</a>
          <a href="https://t.me/TodoSobreAllTech" target="_blank" rel="noopener noreferrer">Comunidad actual</a>
        </div>
      </section>
    </div>
  );
}
