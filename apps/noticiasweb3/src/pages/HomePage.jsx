import { Link } from 'react-router-dom';

export default function HomePage({ appPlatform = 'android', onPlatformChange = () => {}, siteVersion = '2014' }) {
  const isAndroid = appPlatform === 'android';
  const isWindows = appPlatform === 'windows';
  const platformLabel = isAndroid ? 'Android' : isWindows ? 'Windows 11' : 'iOS';

  return (
    <div id="main">
      <h1>Bienvenido</h1>

      <div className="article-body">
        <p>
          <img
            src="https://web.archive.org/web/20140625191205im_/http://content.pimp-my-profile.com/i68/2/2/24/f_1d2ec86ea67c.png"
            alt=""
            style={{ maxWidth: '100%' }}
          />
        </p>
        <p>
          <img
            src="https://web.archive.org/web/20140625191205im_/http://content.pimp-my-profile.com/i68/2/2/26/f_5d1d94ac8403.png"
            alt=""
            style={{ maxWidth: '100%' }}
          />
        </p>

        <p>&nbsp;- <Link to="/extensiones">Extensiones de buscadores.</Link></p>
        <p>&nbsp;- <Link to="/pulseras-rojas">Pulseras Rojas</Link></p>
        <p>&nbsp;- <Link to="/play-station">Play Station</Link></p>
        <p>&nbsp;- <Link to="/juegos-pc">Juegos PC</Link></p>
        <p>&nbsp;- <Link to="/juegos-online">Juegos Online</Link></p>
        <p>&nbsp;- <Link to="/sube-imagenes">Sube tu imagen</Link></p>

        {siteVersion === '2026' && <section className={`app-showcase ${isAndroid ? 'android-active' : isWindows ? 'windows-active' : 'ios-active'}`} aria-labelledby="nw3-app-title">
          <div className="app-copy">
            <p className="app-kicker">Nueva experiencia 2026</p>
            <h2 id="nw3-app-title">Noticiasweb3 en {isWindows ? 'tu escritorio' : 'tu movil'}</h2>
            <p>
              Cambia entre Android, iOS y Windows 11 para ver como podria sentirse
              Noticiasweb3 como aplicacion moderna.
            </p>
            <div className="app-actions" role="group" aria-label="Cambiar diseno de aplicacion">
              <button
                type="button"
                className={`store-button android ${isAndroid ? 'active' : ''}`}
                onClick={() => onPlatformChange('android')}
              >
                <span className="store-icon">A</span>
                <span>
                  <strong>Android</strong>
                  <small>Material feed</small>
                </span>
              </button>
              <button
                type="button"
                className={`store-button ios ${appPlatform === 'ios' ? 'active' : ''}`}
                onClick={() => onPlatformChange('ios')}
              >
                <span className="store-icon">i</span>
                <span>
                  <strong>iOS</strong>
                  <small>Today cards</small>
                </span>
              </button>
              <button
                type="button"
                className={`store-button windows ${isWindows ? 'active' : ''}`}
                onClick={() => onPlatformChange('windows')}
              >
                <span className="store-icon">W</span>
                <span>
                  <strong>Windows 11</strong>
                  <small>Fluent desktop</small>
                </span>
              </button>
            </div>
          </div>

          <div className="phone-previews">
            <div className={`phone-card ${isAndroid ? 'android-phone' : isWindows ? 'windows-device' : 'ios-phone'}`} id="app-preview">
              <div className="phone-top"></div>
              <div className="phone-screen">
                <span className="phone-badge">{platformLabel}</span>
                <h3>{isAndroid ? 'NW3 Feed' : isWindows ? 'NW3 Start' : 'NW3 Today'}</h3>
                <p>
                  {isAndroid && 'Novedades, juegos y grupos en tarjetas rapidas con barra inferior.'}
                  {appPlatform === 'ios' && 'Lectura limpia, tarjetas amplias y accesos directos tipo iPhone.'}
                  {isWindows && 'Paneles, accesos anclados y noticias como una app Fluent de escritorio.'}
                </p>
                <div className="phone-list">
                  {(isAndroid
                    ? ['Noticias', 'Juegos PC', 'Extensiones']
                    : isWindows
                      ? ['Inicio', 'Widgets', 'Comunidad']
                      : ['Grupo', 'Foro', 'Encuestas']
                  ).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="phone-nav" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
              </div>
            </div>
          </div>
        </section>}

        <p>
          <img
            src="https://web.archive.org/web/20140625191205im_/http://content.pimp-my-profile.com/i68/2/2/25/f_0d34ebb6a3d8.png"
            alt=""
            style={{ maxWidth: '100%' }}
          />
        </p>

        <p>
          <img
            src="https://web.archive.org/web/20140625191205im_/http://content.pimp-my-profile.com/i68/2/3/1/f_40c1d34eeca4.png"
            alt=""
            style={{ maxWidth: '100%' }}
          />
        </p>

        <p style={{ fontSize: 'x-large' }}>Estamos en:</p>

        <p>
          <a href="https://www.facebook.com/Noticiasweb3estl" target="_blank" rel="noopener noreferrer">
            <img
              src="https://web.archive.org/web/20140625191205im_/http://img.webme.com/pic/n/noticiasweb3/logo_fb.jpg"
              alt="Facebook"
            />
          </a>
          &nbsp;&nbsp;
          <a href="https://twitter.com/GrupoNW3" target="_blank" rel="noopener noreferrer">
            <img
              src="https://web.archive.org/web/20140625191205im_/http://img.webme.com/pic/n/noticiasweb3/twitter-icon-28x28.png"
              alt="Twitter"
            />
          </a>
          &nbsp;&nbsp;
          <img
            src="https://web.archive.org/web/20140625191205im_/http://img.webme.com/pic/n/noticiasweb3/tuenti-logo.dgfwiavm-c.png"
            alt="Tuenti"
          />
        </p>

        <p style={{ fontSize: 'large' }}>
          Pan y Pasteleria <a href="http://www.paipasteleriaanna.com/" target="_blank" rel="noopener noreferrer">Anna</a>.<br />
          C/Blasco de Garay, Nº 224,<br />
          08224 TERRASSA.<br />
          TEL 634802880
        </p>

        <p style={{ fontSize: 'large' }}>
          ¿Quieres ahorrarte hasta un 80% en el alumbrado de tu comunidad? Preguntame como.
        </p>
        <p style={{ fontSize: 'large' }}>
          Concierte visita llamando al 687837917, por email:{' '}
          <a href="mailto:bewater.2011@gmail.com">bewater.2011@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
