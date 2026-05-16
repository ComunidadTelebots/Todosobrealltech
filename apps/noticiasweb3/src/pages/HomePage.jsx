export default function HomePage() {
  return (
    <div id="main">
      <h1>Bienvenido a Noticiasweb3</h1>

      <div className="article">
        <h2><a href="/noticias">Novedades y Noticias</a></h2>
        <div className="article-meta">Última actualización: Junio 2025</div>
        <div className="article-body">
          <p>
            Bienvenido a <strong>NW3 - Noticiasweb3</strong>, tu fuente de información sobre las
            últimas novedades tecnológicas: Android, Google, seguridad informática, juegos y mucho más.
          </p>
          <p>
            Explora nuestras secciones para mantenerte al día con todo lo que pasa en el mundo digital.
          </p>
        </div>
        <a className="read-more" href="/noticias">Leer más »</a>
      </div>

      <div className="article">
        <h2><a href="/extensiones">Extensiones de navegador recomendadas</a></h2>
        <div className="article-meta">Seguridad y privacidad</div>
        <div className="article-body">
          <p>
            Protege tu navegación con las mejores extensiones gratuitas: bloqueadores de anuncios,
            herramientas de seguridad y más.
          </p>
        </div>
        <a className="read-more" href="/extensiones">Ver extensiones »</a>
      </div>

      <div className="article">
        <h2><a href="/proxies">Proxies y privacidad online</a></h2>
        <div className="article-meta">Privacidad</div>
        <div className="article-body">
          <p>
            Accede a nuestra lista actualizada de proxies verificados para navegar de forma
            anónima y segura.
          </p>
        </div>
        <a className="read-more" href="/proxies">Ver proxies »</a>
      </div>
    </div>
  );
}
