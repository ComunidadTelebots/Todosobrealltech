import { Link } from 'react-router-dom';

export default function HomePage() {
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
