import { useEffect } from 'react';
import RecommendedBlock from './RecommendedBlock.jsx';

export default function Sidebar({ siteVersion }) {
  useEffect(() => {
    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load();
    }
  }, []);

  return (
    <div id="sidebar">
      <div className="widget">
        <div id="google_translate_element"></div>
      </div>

      <div className="widget">
        <div
          className="fb-like-box"
          data-href="https://www.facebook.com/Noticiasweb3estl"
          data-width="200"
          data-colorscheme="light"
          data-show-faces="true"
          data-header="true"
          data-stream="false"
          data-show-border="true"
        ></div>
      </div>

      {siteVersion === '2026' && (
        <>
          <RecommendedBlock slot="sidebar" variant="stack" limit={2} />
          <div className="widget">
            <h2 className="widget-title">Telegram</h2>
            <a
              className="telegram-widget"
              href="https://t.me/todosobrealltech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Telegram de TodoSobreAllTech"
            >
              <span className="telegram-widget__signal"></span>
              <span className="telegram-widget__top">
                <span className="telegram-widget__avatar">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.7 4.3 18.5 19c-.2 1-1 1.2-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.2 9.5-8.6c.4-.4-.1-.6-.6-.2L5.8 12.3.7 10.7c-1-.3-1-1.1.2-1.6L20.4 1.6c.9-.3 1.7.2 1.3 2.7z" />
                  </svg>
                </span>
                <span>
                  <strong>TodoSobreAllTech</strong>
                  <small>Canal oficial en Telegram</small>
                </span>
              </span>
              <span className="telegram-widget__messages" aria-hidden="true">
                <i>Noticias IA</i>
                <i>Web3</i>
                <i>Comunidad</i>
              </span>
              <span className="telegram-widget__cta">Unirme al canal</span>
            </a>
          </div>

          <div className="widget">
            <h2 className="widget-title">Instagram</h2>
            <a
              className="instagram-widget"
              href="https://www.instagram.com/todosobrealltech/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Instagram de TodoSobreAllTech"
            >
              <span className="instagram-widget__glow"></span>
              <span className="instagram-widget__top">
                <span className="instagram-widget__avatar">TA</span>
                <span>
                  <strong>@todosobrealltech</strong>
                  <small>Noticias, IA y tecnologia</small>
                </span>
              </span>
              <span className="instagram-widget__grid" aria-hidden="true">
                <i></i><i></i><i></i><i></i><i></i><i></i>
              </span>
              <span className="instagram-widget__cta">Ver perfil en Instagram</span>
            </a>
          </div>
        </>
      )}

      <div className="widget">
        <a
          className="twitter-timeline"
          href="https://twitter.com/search?q=%23Noticiasweb3estl"
          data-widget-id="411952003007266816"
          data-height="300"
        >
          Tweets sobre #Noticiasweb3estl
        </a>
      </div>

      <div className="widget">
        <a
          className="twitter-timeline"
          href="https://twitter.com/GrupoNW3"
          data-widget-id="427490459305250816"
          data-height="300"
        >
          Tweets por @GrupoNW3
        </a>
      </div>
    </div>
  );
}
