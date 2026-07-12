/* <tsa-netbar> — Barra de red compartida "Red Todo Sobre AllTech". */
(function () {
  const SITES = [
    { id: 'inicio',       label: 'Inicio',              url: 'https://todosobreall.tech' },
    { id: 'noticias',     label: 'Noticias Web3',       url: 'https://noticiasweb3.todosobreall.tech' },
    { id: 'gamergitbug',  label: 'GamerGitBug',         url: 'https://gamergitbug.todosobreall.tech' },
    { id: 'gameplays',    label: 'Gameplays',           url: 'https://todosobregameplays.todosobreall.tech' },
    { id: 'resistencia',  label: 'Resistencia Censura', url: 'https://resistenciaalacensura.todosobreall.tech' },
    { id: 'proxy',        label: 'Proxies MTProto',     url: 'https://proxy.todosobreall.tech' },
    { id: 'comunidad',    label: 'ComunidadTelebots',   url: 'https://comunidadtelebots.todosobreall.tech' },
    { id: 'telegram',     label: 'Telegram Web',        url: 'https://chat.todosobreall.tech' },
  ];
  const STYLE = `
    :host{ all: initial; display:block; }
    .netbar{ font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; font-size:12.5px; line-height:1;
      background:linear-gradient(180deg,#0c1322,#0a0f1a); border-bottom:1px solid rgba(255,255,255,.09); color:#8794ad; }
    .inner{ max-width:1120px; margin:0 auto; padding:9px 28px; display:flex; align-items:center; gap:6px 16px; flex-wrap:wrap; }
    .label{ display:flex; align-items:center; gap:8px; color:#3ee0c7; font-family:ui-monospace,"JetBrains Mono",monospace;
      font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; padding-right:16px; border-right:1px solid rgba(255,255,255,.12); }
    .label::before{ content:''; width:7px; height:7px; border-radius:2px; background:linear-gradient(135deg,#36b6f0,#5b8af1); }
    a{ color:#8794ad; text-decoration:none; font-weight:500; transition:color .2s; }
    a:hover{ color:#e9f0fb; }
    a.cur{ color:#e9f0fb; font-weight:600; display:inline-flex; align-items:center; gap:7px; }
    a.cur::before{ content:''; width:6px; height:6px; border-radius:50%; background:#3ee0c7; box-shadow:0 0 9px #3ee0c7; }
    @media (max-width:520px){ .label{ display:none; } .inner{ padding:8px 16px; } }
  `;
  class TsaNetbar extends HTMLElement {
    connectedCallback() {
      const current = (this.getAttribute('current') || '').toLowerCase();
      const root = this.attachShadow({ mode: 'open' });
      const links = SITES.map(s => {
        const cur = s.id === current;
        return `<a href="${s.url}"${cur ? ' class="cur" aria-current="page"' : ' target="_top"'}>${s.label}</a>`;
      }).join('');
      root.innerHTML = `<style>${STYLE}</style><nav class="netbar" aria-label="Red Todo Sobre AllTech"><div class="inner"><span class="label">Red Todo Sobre AllTech</span>${links}</div></nav>`;
    }
  }
  if (!customElements.get('tsa-netbar')) customElements.define('tsa-netbar', TsaNetbar);
})();
