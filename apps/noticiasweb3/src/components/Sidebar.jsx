import { useEffect } from 'react';

export default function Sidebar() {
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
