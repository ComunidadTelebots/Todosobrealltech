


  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','G-F5P08EW3SV');


  const API = "/api/public";
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // Detección de plataforma
  let platform = "unknown";
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.requestFullscreen === "function") { try { tg.requestFullscreen(); } catch (e) {} }
      if (typeof tg.disableVerticalSwipes === "function") { try { tg.disableVerticalSwipes(); } catch (e) {} }
      if (typeof tg.enableClosingConfirmation === "function") { try { tg.enableClosingConfirmation(); } catch (e) {} }
      if (tg.setHeaderColor) tg.setHeaderColor("#070b14");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#070b14");
      if (tg.setBottomBarColor) { try { tg.setBottomBarColor("#090e18"); } catch(e) {} }
      platform = tg.platform || "unknown";
    } catch(e) {}
  }

  if (platform === "unknown") {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) platform = "ios";
    else if (/Android/.test(ua)) platform = "android";
    else platform = "web";
  }

  if (platform === "ios") document.body.classList.add("platform-ios");
  else if (platform === "android") document.body.classList.add("platform-android");

  // Motor Háptico Táctil
  let hapticsEnabled = true;
  function haptic(type) {
    if (!hapticsEnabled || !tg || !tg.HapticFeedback) return;
    try {
      if (type === "light") tg.HapticFeedback.impactOccurred("light");
      else if (type === "medium") tg.HapticFeedback.impactOccurred("medium");
      else if (type === "heavy") tg.HapticFeedback.impactOccurred("heavy");
      else if (type === "success") tg.HapticFeedback.notificationOccurred("success");
      else if (type === "error") tg.HapticFeedback.notificationOccurred("error");
      else if (type === "selection") tg.HapticFeedback.selectionChanged();
    } catch(e) {}
  }

  // Detector de Gestos Táctiles (Swipe)
  function attachSwipe(element, onSwipe) {
    if (!element) return;
    let startX = 0, startY = 0, startTime = 0;
    element.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    }, { passive: true });

    element.addEventListener("touchend", (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const elapsed = Date.now() - startTime;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 25 && elapsed < 800) {
        if (Math.abs(dx) > Math.abs(dy)) {
          onSwipe(dx > 0 ? "right" : "left");
        } else {
          onSwipe(dy > 0 ? "down" : "up");
        }
        haptic("light");
      }
    }, { passive: true });
  }

  const user = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;
  let master = false;
  let hubMasterToken = "";
  const BOT = "CintiaBot";
  const ADD_LINK = `https://t.me/${BOT}?startchannel&admin=post_messages+edit_messages+invite_users`;

  // Iconos Vectoriales
  const IC = {
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    trendup: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    trenddown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    newspaper: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M10 6h8"/>',
    gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><rect width="20" height="12" x="2" y="6" rx="2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    sparkles: '<path d="M9.94 14.66A4.6 4.6 0 0 1 5.9 10.6 4.6 4.6 0 0 1 9.94 6.56 4.6 4.6 0 0 1 14 10.6a4.6 4.6 0 0 1-4.06 4.06z"/>',
  };

  function svg(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[name] || ''}</svg>`;
  }

  function openLink(u) {
    haptic("light");
    if (tg && tg.openLink) tg.openLink(u);
    else window.open(u, "_blank");
  }

  function openTg(u) {
    haptic("light");
    if (tg && tg.openTelegramLink) tg.openTelegramLink(u);
    else window.open(u, "_blank");
  }

  function fmt(n) {
    if (n == null || isNaN(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '').replace('.', ',') + "K";
    return String(Math.round(n));
  }

  function gpct(n) {
    if (n == null || isNaN(n)) return "—";
    const s = Math.abs(n).toFixed(1).replace('.', ',');
    return (n >= 0 ? "+" : "−") + s + "%";
  }

  function initials(s) {
    return (s || "C").replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || "CH";
  }

  async function apiGet(p) {
    try {
      const r = await fetch(API + p);
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  async function apiPost(p, b) {
    try {
      const r = await fetch(API + p, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b)
      });
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  function ev(name, params) {
    try {
      if (window.gtag) gtag("event", name, params || {});
    } catch (e) {}
  }

  const skel = () => `<div class="skel"></div><div class="skel"></div><div class="skel"></div>`;

  function escAttr(s) { return String(s || "").replace(/"/g, "").replace(/</g, ""); }
  function escHtml(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  function showToast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function channelRow(c, tappable) {
    const up = (c.growth30d || 0) >= 0;
    const collecting = c.collecting ? `<div class="collect">recopilando…</div>` : `<div class="g ${up ? 'up' : 'down'}">${svg(up ? 'trendup' : 'trenddown')} ${gpct(c.growth30d)}</div>`;
    const role = c.role === "administrator" ? `<span class="rbadge">admin</span>` : (c.role === "creator" ? `<span class="rbadge own">propietario</span>` : "");
    const tap = tappable ? `row tappable" data-chat="${c.chat_id}" data-name="${escAttr(c.name)}` : "row";
    return `<div class="${tap}">
      <div class="av">${initials(c.name)}</div>
      <div class="meta"><div class="nm">${escHtml(c.name)} ${role}</div><div class="un">@${c.username || 'privado'}</div></div>
      <div class="num"><div class="s">${fmt(c.subscribers)}</div>${collecting}</div>
    </div>`;
  }

  function bindRowOpen(container) {
    container.querySelectorAll(".row.tappable").forEach(r => r.addEventListener("click", e => {
      if (e.target.closest(".switch")) return;
      haptic("light");
      openGroup(r.dataset.chat, r.dataset.name);
    }));
  }

  // ── Vista: Mis Canales ──
  async function loadCanales() {
    const el = document.getElementById("v-canales");
    el.innerHTML = `<div class="vtitle">Mis canales</div><div class="vsub">Detectados automáticamente donde eres propietario o administrador.</div>` + skel();
    let chs = [];
    if (tg && tg.initData) {
      const d = await apiPost("/stats/mine", { initData: tg.initData });
      if (d && d.ok) chs = d.channels || [];
    }
    if (!chs.length) {
      el.innerHTML = `<div class="empty">
        <div class="big">${svg('megaphone')}</div>
        <h2>Añade tu primer canal</h2>
        <p>Haz administrador a <b style="color:var(--ink)">@${BOT}</b> en tu canal y aparecerá aquí <b style="color:var(--ink)">automáticamente</b>, sin pasos manuales.</p>
        <button class="btn cta" id="ctaAdd">${svg('plus')} Añadir canal a @${BOT}</button>
        <ol class="steps">
          <li><span class="n">1</span><div>Abre tu canal → <b>Administradores</b></div></li>
          <li><span class="n">2</span><div>Toca <b>Añadir administrador</b> y busca <code>@${BOT}</code></div></li>
          <li><span class="n">3</span><div>Deja activado <b>Publicar mensajes</b> y confirma</div></li>
        </ol></div>`;
      document.getElementById("ctaAdd").onclick = () => {
        haptic("medium");
        ev("add_channel", { from: "canales_empty" });
        openTg(ADD_LINK);
      };
      return;
    }
    el.innerHTML = `<div class="vtitle">Mis canales</div><div class="vsub">${chs.length} canal${chs.length > 1 ? 'es' : ''} gestionado${chs.length > 1 ? 's' : ''} · toca uno para abrirlo.</div>`
      + chs.map(c => channelRow(c, true)).join("")
      + `<button class="btn cta" id="ctaAdd2" style="margin-top:8px;">${svg('plus')} Añadir otro canal</button>`;
    document.getElementById("ctaAdd2").onclick = () => {
      haptic("medium");
      ev("add_channel", { from: "canales_list" });
      openTg(ADD_LINK);
    };
    bindRowOpen(el);
  }

  // ── Vista: Administrar ──
  function adminRow(c) {
    const t = c.ctype === "channel" ? "Canal" : "Grupo";
    const uname = (c.username && !String(c.username).startsWith("-")) ? ("@" + c.username) : "privado";
    return `<div class="row tappable" data-chat="${c.chat_id}" data-name="${escAttr(c.name)}">
      <div class="av">${initials(c.name)}</div>
      <div class="meta"><div class="nm">${escHtml(c.name)} <span class="rbadge">${t}</span></div>
        <div class="un">${uname} · ${fmt(c.subscribers)} subs</div></div>
      <div class="switch ${c.listed ? "on" : ""}" data-chat="${c.chat_id}" role="switch" aria-label="Publicar en directorio"><span></span></div>
    </div>`;
  }

  function bindSwitches(el) {
    el.querySelectorAll(".switch").forEach(sw => sw.onclick = (e) => {
      e.stopPropagation();
      haptic("selection");
      const chat = sw.dataset.chat, on = !sw.classList.contains("on");
      sw.classList.toggle("on", on);
      ev("channel_publish", { listed: on });
      apiPost("/admin/set_listed", { initData: tg && tg.initData, chat_id: chat, listed: on })
        .then(d => {
          if (!d || !d.ok) {
            sw.classList.toggle("on", !on);
            haptic("error");
            showToast("No se pudo actualizar");
          } else {
            haptic("success");
            showToast(on ? "Canal publicado en directorio" : "Canal ocultado");
          }
        });
    });
    bindRowOpen(el);
  }

  async function loadAdmin() {
    const el = document.getElementById("v-admin");
    if (!master) {
      el.innerHTML = `<div class="vtitle">Administrar</div><div class="vsub">Tus canales. Activa el interruptor para listarlos en el directorio público.</div><div id="adminList">${skel()}</div>`;
      let chs = [];
      if (tg && tg.initData) {
        const d = await apiPost("/stats/mine", { initData: tg.initData });
        if (d && d.ok) chs = d.channels || [];
      }
      const list = document.getElementById("adminList");
      if (!chs.length) {
        list.innerHTML = `<p class="muted">No administras ningún canal todavía. Añade a @${BOT} como administrador.</p>`;
        return;
      }
      list.innerHTML = chs.map(adminRow).join("");
      bindSwitches(list);
      return;
    }
    el.innerHTML = `<div class="vtitle">Administrar</div><div class="vsub">Todos los canales y grupos vinculados al ecosistema.</div>
      <div class="card"><h3>Panel Moonbot Maestro</h3><p>Control central del bot: moderación global, IA, seguridad, proxies y bots activos.</p>
        <button class="btn teal" id="goPanel" style="margin-top:12px;">${svg('shield')} Abrir panel Moonbot</button></div>
      <div class="sec">Canales vinculados <span id="adCount"></span></div>
      <p class="muted" style="margin:-4px 2px 12px;">El interruptor publica el canal en el directorio público.</p>
      <div id="adminList">${skel()}</div>`;
    document.getElementById("goPanel").onclick = () => { if (curTheme === "clasico") setTheme("nuevo"); showView("master"); };
    const d = await apiPost("/admin/channels", { initData: tg.initData });
    const chs = (d && d.ok && d.channels) || [];
    document.getElementById("adCount").textContent = `(${chs.length})`;
    const list = document.getElementById("adminList");
    list.innerHTML = chs.length ? chs.map(adminRow).join("") : `<p class="muted">El bot no está en ningún canal todavía.</p>`;
    bindSwitches(list);
  }

  // ── Vista: Directorio ──
  async function loadDirectorio() {
    const el = document.getElementById("v-directorio");
    el.innerHTML = `<div class="vtitle">Directorio</div><div class="vsub">Todos los canales de la red ordenados por miembros.</div>` + skel();
    const g = await apiGet("/stats/global");
    const list = await apiGet("/stats/channels?sort=subscribers");
    const chs = (list && list.channels) || [];
    if (!chs.length) {
      el.innerHTML = `<div class="vtitle">Directorio</div><div class="vsub">El directorio está listo para crecer.</div>
        <div class="empty"><div class="big">${svg('compass')}</div><h2>Sé el primero</h2>
        <p>Añade tu canal con @${BOT} y aparecerá listado aquí con sus métricas en vivo.</p>
        <button class="btn cta" id="dirAdd">${svg('plus')} Añadir mi canal</button></div>`;
      document.getElementById("dirAdd").onclick = () => {
        haptic("medium");
        ev("add_channel", { from: "directorio" });
        openTg(ADD_LINK);
      };
      return;
    }
    const gv = g && g.ok ? g : { channels: chs.length, totalSubscribers: 0, avgGrowth: 0 };
    el.innerHTML = `<div class="vtitle">Directorio</div><div class="vsub">${gv.channels} canales en la comunidad.</div>
      <div class="statbar">
        <div class="stat"><div class="v">${fmt(gv.channels)}</div><div class="l">Canales</div></div>
        <div class="stat"><div class="v">${fmt(gv.totalSubscribers)}</div><div class="l">Suscriptores</div></div>
        <div class="stat"><div class="v">${gpct(gv.avgGrowth)}</div><div class="l">Crecim.</div></div>
      </div>`
      + chs.map(c => channelRow(c)).join("")
      + `<button class="btn ghost" id="dirFull" style="margin-top:8px;">${svg('ext')} Ver directorio web completo</button>`;
    document.getElementById("dirFull").onclick = () => openLink("https://canales.todosobreall.tech");
  }

  // ── Vista: Red & Servicios ──
  const SERVICES = [
    { ic: "message", n: "Telegram Web", url: "https://chat.todosobreall.tech" },
    { ic: "newspaper", n: "Noticias Web3", url: "https://noticiasweb3.todosobreall.tech" },
    { ic: "shield", n: "Resistencia", url: "https://resistenciaalacensura.todosobreall.tech" },
    { ic: "gamepad", n: "Gameplays", action: () => showView("juegos") },
    { ic: "globe", n: "Todo Sobre All", url: "https://todosobreall.tech" },
    { ic: "users", n: "Comunidad", url: "https://comunidadtelebots.todosobreall.tech" },
  ];

  function loadRed() {
    const el = document.getElementById("v-red");
    el.innerHTML = `<div class="vtitle">Red</div><div class="vsub">Servicios y herramientas de ComunidadTelebots.</div>
      <div class="services">${SERVICES.map((s, i) => `<div class="svc" data-i="${i}"><span class="si">${svg(s.ic)}</span>${s.n}</div>`).join("")}</div>
      <div class="gsec">Herramientas & Entretenimiento</div>
      <div class="listitem" id="arcadeItem"><span class="li-ic">${svg('gamepad')}</span>
        <div class="li-t"><b>Arcade & Juegos Táctiles</b><span>Snake, 2048, Tres en Raya y Memoria con gestos</span></div>
        <span class="chev">${svg('chevron')}</span></div>
      <div class="listitem" id="proxyItem" style="margin-top:8px;"><span class="li-ic">${svg('globe')}</span>
        <div class="li-t"><b>Obtener proxy MTProto</b><span>Salta censura y bloqueos en Telegram</span></div>
        <span class="chev">${svg('chevron')}</span></div>
      <div class="proxy-out" id="proxyOut"></div>`;
    
    el.querySelectorAll(".svc").forEach(x => x.onclick = () => {
      const item = SERVICES[x.dataset.i];
      if (item.action) item.action();
      else if (item.url) openLink(item.url);
    });

    document.getElementById("arcadeItem").onclick = () => showView("juegos");
    document.getElementById("proxyItem").onclick = () => {
      haptic("light");
      fetchProxy();
    };
  }

  function fetchProxy() {
    const out = document.getElementById("proxyOut");
    out.innerHTML = `<p class="muted" style="margin-top:10px;">Buscando proxies activos…</p>`;
    apiGet("/proxy").then(d => {
      if (!d || !d.ok || !d.proxies || !d.proxies.length) {
        out.innerHTML = `<p class="muted" style="margin-top:10px;">No hay proxies disponibles ahora mismo.</p>`;
        return;
      }
      out.innerHTML = d.proxies.slice(0, 3).map(p => `<div class="proxy-item"><div class="pd">${p.server}:${p.port}<br><small>${p.tag || 'MTProto'}</small></div><span class="connect" data-l="${p.https_link}">Conectar</span></div>`).join("");
      out.querySelectorAll(".connect").forEach(el => el.onclick = () => {
        haptic("medium");
        ev("proxy_connect");
        openTg(el.dataset.l);
      });
    });
  }

  // ── Vista: Arcade & Juegos Táctiles (CON SOPORTE DE GESTOS) ──
  let activeGame = "snake";
  function loadJuegos() {
    const el = document.getElementById("v-juegos");
    el.innerHTML = `
      <button class="backbtn" id="jback">${svg('chevron')} Volver a Red</button>
      <div class="vtitle">Arcade & Juegos</div>
      <div class="vsub">Control con gestos táctiles (Swipe), D-Pad virtual y vibración háptica.</div>
      
      <div class="game-tabs">
        <button class="game-pill ${activeGame==='snake'?'active':''}" data-g="snake">🐍 Snake</button>
        <button class="game-pill ${activeGame==='2048'?'active':''}" data-g="2048">⚡ 2048 Cyber</button>
        <button class="game-pill ${activeGame==='ttt'?'active':''}" data-g="ttt">❌ Tres en Raya</button>
        <button class="game-pill ${activeGame==='mem'?'active':''}" data-g="mem">🧠 Memoria</button>
      </div>

      <div id="gameContainer"></div>
    `;

    document.getElementById("jback").onclick = () => showView("red");

    el.querySelectorAll("[data-g]").forEach(pill => {
      pill.onclick = () => {
        haptic("selection");
        activeGame = pill.dataset.g;
        el.querySelectorAll("[data-g]").forEach(p => p.classList.toggle("active", p.dataset.g === activeGame));
        renderActiveGame();
      };
    });

    renderActiveGame();
  }

  function renderActiveGame() {
    const container = document.getElementById("gameContainer");
    if (!container) return;

    if (activeGame === "snake") {
      container.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <b>Cyber Snake</b>
            <span class="badge" id="hSnakeScore">0 pts</span>
          </div>
          <div id="hSnakeTouch" style="width:100%;max-width:320px;margin:0 auto;touch-action:none;">
            <canvas id="hSnakeCanvas" width="300" height="240" style="width:100%;border-radius:12px;background:#070b14;border:1px solid var(--line);display:block;"></canvas>
          </div>
          <p class="muted" style="text-align:center;margin-top:8px;">👆 Desliza el dedo (Swipe) en la pantalla para girar</p>
          <div class="touch-dpad">
            <div></div>
            <button class="dpad-btn" id="hDpadUp">▲</button>
            <div></div>
            <button class="dpad-btn" id="hDpadLeft">◀</button>
            <button class="dpad-btn" id="hDpadOk" style="font-size:11px;font-weight:700;">OK</button>
            <button class="dpad-btn" id="hDpadRight">▶</button>
            <div></div>
            <button class="dpad-btn" id="hDpadDown">▼</button>
            <div></div>
          </div>
          <div class="btnrow" style="margin-top:12px;">
            <button class="btn cta" id="hSnakeStart" style="flex:1;">Iniciar</button>
            <button class="btn ghost" id="hSnakeReset" style="width:auto;">Reiniciar</button>
          </div>
        </div>
      `;
      initHubSnake();
    } else if (activeGame === "2048") {
      container.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <b>2048 Cyber Puzzle</b>
            <span class="badge" id="h2048Score">Score: 0</span>
          </div>
          <div class="grid-2048" id="h2048Board"></div>
          <p class="muted" style="text-align:center;margin-top:8px;">👆 Desliza en 4 direcciones para unir números</p>
          <button class="btn ghost" id="h2048Reset" style="margin-top:12px;">Nueva Partida</button>
        </div>
      `;
      initHub2048();
    } else if (activeGame === "ttt") {
      container.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <b>Tres en Raya</b>
            <span class="badge" id="hTttStatus">Turno: X</span>
          </div>
          <div id="hTttBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:280px;margin:12px auto;"></div>
          <button class="btn ghost" id="hTttReset" style="margin-top:12px;">Reiniciar Tablero</button>
        </div>
      `;
      initHubTTT();
    } else if (activeGame === "mem") {
      container.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <b>Memoria Cuántica</b>
            <span class="badge" id="hMemMoves">Movs: 0</span>
          </div>
          <div id="hMemBoard" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:300px;margin:12px auto;"></div>
          <button class="btn ghost" id="hMemReset" style="margin-top:12px;">Mezclar Cartas</button>
        </div>
      `;
      initHubMem();
    }
  }

  // Snake Engine para el Hub Mini App
  function initHubSnake() {
    const canvas = document.getElementById("hSnakeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("hSnakeScore");
    const startBtn = document.getElementById("hSnakeStart");
    const resetBtn = document.getElementById("hSnakeReset");
    const touchArea = document.getElementById("hSnakeTouch");

    const cols = 20, rows = 16;
    let snake = [{x: 10, y: 8}];
    let food = {x: 4, y: 4};
    let dir = {x: 1, y: 0}, nextDir = {x: 1, y: 0};
    let timer = null, score = 0;

    function place() {
      let ok = false;
      while (!ok) {
        food = {x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows)};
        ok = !snake.some(s => s.x === food.x && s.y === food.y);
      }
    }

    function draw() {
      const cw = canvas.width / cols, ch = canvas.height / rows;
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(food.x * cw + cw/2, food.y * ch + ch/2, cw/2.4, 0, Math.PI * 2);
      ctx.fill();

      snake.forEach((p, idx) => {
        ctx.fillStyle = idx === 0 ? "#22D3EE" : "#5DCAA5";
        ctx.beginPath();
        ctx.roundRect(p.x * cw + 1, p.y * ch + 1, cw - 2, ch - 2, 4);
        ctx.fill();
      });
    }

    function step() {
      dir = nextDir;
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || snake.some(p => p.x === head.x && p.y === head.y)) {
        clearInterval(timer);
        timer = null;
        haptic("error");
        if (startBtn) startBtn.textContent = "Reintentar";
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        if (scoreEl) scoreEl.textContent = score + " pts";
        haptic("light");
        place();
      } else {
        snake.pop();
      }
      draw();
    }

    function reset() {
      clearInterval(timer);
      timer = null;
      snake = [{x: 10, y: 8}];
      dir = {x: 1, y: 0};
      nextDir = {x: 1, y: 0};
      score = 0;
      if (scoreEl) scoreEl.textContent = "0 pts";
      if (startBtn) startBtn.textContent = "Iniciar";
      place();
      draw();
    }

    function setDir(d) {
      if (d === "up" && dir.y !== 1) nextDir = {x: 0, y: -1};
      if (d === "down" && dir.y !== -1) nextDir = {x: 0, y: 1};
      if (d === "left" && dir.x !== 1) nextDir = {x: -1, y: 0};
      if (d === "right" && dir.x !== -1) nextDir = {x: 1, y: 0};
    }

    if (startBtn) {
      startBtn.onclick = () => {
        haptic("medium");
        if (!timer) {
          timer = setInterval(step, 115);
          startBtn.textContent = "Pausar";
        } else {
          clearInterval(timer);
          timer = null;
          startBtn.textContent = "Reanudar";
        }
      };
    }
    if (resetBtn) resetBtn.onclick = reset;

    attachSwipe(touchArea, (d) => {
      if (!timer && startBtn) startBtn.click();
      setDir(d);
    });

    const u = document.getElementById("hDpadUp");
    const d = document.getElementById("hDpadDown");
    const l = document.getElementById("hDpadLeft");
    const r = document.getElementById("hDpadRight");
    const ok = document.getElementById("hDpadOk");
    if (u) u.onclick = () => { setDir("up"); haptic("light"); };
    if (d) d.onclick = () => { setDir("down"); haptic("light"); };
    if (l) l.onclick = () => { setDir("left"); haptic("light"); };
    if (r) r.onclick = () => { setDir("right"); haptic("light"); };
    if (ok && startBtn) ok.onclick = () => startBtn.click();

    reset();
  }

  // 2048 Engine
  function initHub2048() {
    const board = document.getElementById("h2048Board");
    const scoreEl = document.getElementById("h2048Score");
    const resetBtn = document.getElementById("h2048Reset");
    if (!board) return;
    let grid = Array(16).fill(0), score = 0;

    function addTile() {
      const empty = [];
      grid.forEach((v, i) => { if (v === 0) empty.push(i); });
      if (!empty.length) return;
      const idx = empty[Math.floor(Math.random() * empty.length)];
      grid[idx] = Math.random() < 0.9 ? 2 : 4;
    }

    function render() {
      board.innerHTML = "";
      grid.forEach(val => {
        const c = document.createElement("div");
        c.className = "cell-2048";
        if (val > 0) {
          c.textContent = String(val);
          c.dataset.val = String(val);
        }
        board.appendChild(c);
      });
      if (scoreEl) scoreEl.textContent = "Score: " + score;
    }

    function slide(row) {
      let arr = row.filter(x => x !== 0);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          arr[i + 1] = 0;
          haptic("light");
        }
      }
      arr = arr.filter(x => x !== 0);
      while (arr.length < 4) arr.push(0);
      return arr;
    }

    function move(dir) {
      let changed = false;
      const old = [...grid];
      if (dir === "left" || dir === "right") {
        for (let r = 0; r < 4; r++) {
          let row = [grid[r*4], grid[r*4+1], grid[r*4+2], grid[r*4+3]];
          if (dir === "right") row.reverse();
          let sl = slide(row);
          if (dir === "right") sl.reverse();
          for (let c = 0; c < 4; c++) grid[r*4+c] = sl[c];
        }
      } else if (dir === "up" || dir === "down") {
        for (let c = 0; c < 4; c++) {
          let col = [grid[c], grid[c+4], grid[c+8], grid[c+12]];
          if (dir === "down") col.reverse();
          let sl = slide(col);
          if (dir === "down") sl.reverse();
          for (let r = 0; r < 4; r++) grid[r*4+c] = sl[r];
        }
      }
      changed = grid.some((v, i) => v !== old[i]);
      if (changed) {
        addTile();
        render();
      }
    }

    attachSwipe(board, (d) => move(d));
    if (resetBtn) resetBtn.onclick = () => { grid = Array(16).fill(0); score = 0; addTile(); addTile(); render(); };
    grid = Array(16).fill(0); score = 0; addTile(); addTile(); render();
  }

  // Tres en Raya
  function initHubTTT() {
    const board = document.getElementById("hTttBoard");
    const status = document.getElementById("hTttStatus");
    const resetBtn = document.getElementById("hTttReset");
    if (!board) return;
    let ttt = Array(9).fill(""), turn = "X", over = false;
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    function check() {
      for (const [a,b,c] of wins) {
        if (ttt[a] && ttt[a] === ttt[b] && ttt[a] === ttt[c]) return ttt[a];
      }
      if (ttt.every(x => x)) return "draw";
      return "";
    }

    function render() {
      board.innerHTML = "";
      for (let i = 0; i < 9; i++) {
        const b = document.createElement("button");
        b.textContent = ttt[i] || " ";
        b.style.height = "64px";
        b.style.fontSize = "22px";
        b.style.fontWeight = "800";
        b.style.borderRadius = "12px";
        b.style.border = "1px solid var(--line)";
        b.style.background = ttt[i] ? "rgba(93,202,165,0.15)" : "var(--card)";
        b.style.color = ttt[i] === "X" ? "var(--cyan)" : "var(--teal)";
        b.onclick = () => {
          if (over || ttt[i]) return;
          haptic("light");
          ttt[i] = turn;
          const r = check();
          if (r) {
            over = true;
            status.textContent = r === "draw" ? "Empate" : `Gana: ${r}`;
            haptic("success");
          } else {
            turn = turn === "X" ? "O" : "X";
            status.textContent = "Turno: " + turn;
          }
          render();
        };
        board.appendChild(b);
      }
    }

    if (resetBtn) resetBtn.onclick = () => { ttt = Array(9).fill(""); turn = "X"; over = false; status.textContent = "Turno: X"; render(); };
    render();
  }

  // Memoria Cuántica
  function initHubMem() {
    const board = document.getElementById("hMemBoard");
    const movesEl = document.getElementById("hMemMoves");
    const resetBtn = document.getElementById("hMemReset");
    if (!board) return;
    const icons = ["🌙","🚀","🤖","🧠","⚡","🛡️","📡","💎"];
    let cards = [], open = [], lock = false, moves = 0;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function render() {
      board.innerHTML = "";
      cards.forEach((c, idx) => {
        const b = document.createElement("button");
        b.style.height = "60px";
        b.style.fontSize = "22px";
        b.style.borderRadius = "12px";
        b.style.border = "1px solid var(--line)";
        b.style.background = c.done || c.open ? "rgba(34,211,238,0.18)" : "var(--card)";
        b.textContent = c.done || c.open ? c.v : "•";
        b.onclick = () => {
          if (lock || c.done || c.open) return;
          haptic("light");
          c.open = true;
          open.push(idx);
          render();
          if (open.length === 2) {
            moves++;
            if (movesEl) movesEl.textContent = "Movs: " + moves;
            const [a, bIdx] = open;
            if (cards[a].v === cards[bIdx].v) {
              cards[a].done = true;
              cards[bIdx].done = true;
              open = [];
              haptic("success");
              render();
            } else {
              lock = true;
              setTimeout(() => {
                cards[a].open = false;
                cards[bIdx].open = false;
                open = [];
                lock = false;
                render();
              }, 600);
            }
          }
        };
        board.appendChild(b);
      });
    }

    function reset() {
      moves = 0;
      if (movesEl) movesEl.textContent = "Movs: 0";
      open = [];
      lock = false;
      cards = shuffle(icons.concat(icons)).map(v => ({v, open: false, done: false}));
      render();
    }

    if (resetBtn) resetBtn.onclick = reset;
    reset();
  }

  // ── Vista: Ajustes ──
  function loadAjustes() {
    const el = document.getElementById("v-ajustes");
    el.innerHTML = `<button class="backbtn" id="aback">${svg('chevron')} Volver</button>
      <div class="vtitle">Ajustes</div><div class="vsub">Personaliza la experiencia del panel.</div>
      <div class="gsec">Tema visual</div>
      <div class="themeopt" data-theme-opt="nuevo"><div class="ra"></div><div class="to-t"><b>Nuevo (Aurora)</b><span>Pestañas modernas, gradientes fluidos y jerarquía móvil.</span></div></div>
      <div class="themeopt" data-theme-opt="oled"><div class="ra"></div><div class="to-t"><b>OLED Oscuro</b><span>Fondo negro puro para pantallas OLED con mínimo consumo.</span></div></div>
      <div class="themeopt" data-theme-opt="clasico"><div class="ra"></div><div class="to-t"><b>Clásico</b><span>La maqueta original con tarjetas apiladas.</span></div></div>
      
      <div class="gsec">Respuesta Háptica</div>
      <div class="setrow"><div><b>Vibración táctil</b><span>Respuesta física al tocar botones e interruptores</span></div><div class="switch ${hapticsEnabled ? 'on' : ''}" id="swHaptics"><span></span></div></div>

      <div class="gsec">Información del sistema</div>
      <div class="card">
        <p style="font-size:13px;line-height:1.8;">
          <b>Plataforma:</b> <span class="mono">${platform.toUpperCase()}</span><br>
          <b>Cliente:</b> <span class="mono">${tg ? 'Telegram Mini App' : 'Navegador Web'}</span><br>
          <b>Bot oficial:</b> <span class="mono">@${BOT}</span>
        </p>
      </div>`;
    
    document.getElementById("aback").onclick = () => showView("canales");

    el.querySelectorAll("[data-theme-opt]").forEach(o => o.onclick = () => {
      haptic("selection");
      setTheme(o.dataset.themeOpt);
    });

    document.getElementById("swHaptics").onclick = function() {
      hapticsEnabled = !hapticsEnabled;
      this.classList.toggle("on", hapticsEnabled);
      haptic("selection");
      try { localStorage.setItem("hub_haptics", hapticsEnabled ? "1" : "0"); } catch(e) {}
    };

    reflectTheme();
  }

  function reflectTheme() {
    document.querySelectorAll("[data-theme-opt]").forEach(o => o.classList.toggle("sel", o.dataset.themeOpt === curTheme));
  }

  // ── Vista: Detalle de Grupo / Canal ──
  let curChat = null;
  const gp = (p, b) => apiPost(p, Object.assign({ initData: tg && tg.initData, chat_id: curChat }, b));

  function toUTC(local) {
    if (!local) return "";
    const d = new Date(local);
    if (isNaN(d)) return "";
    const p = n => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
  }

  function fromUTC(s) {
    if (!s) return "";
    const d = new Date(String(s).replace(" ", "T") + "Z");
    return isNaN(d) ? s : d.toLocaleString();
  }

  function openGroup(chat_id, name) {
    curChat = chat_id;
    if (window.gtag) gtag("event", "page_view", { page_path: "/hub/grupo" });
    document.querySelectorAll("#app .view").forEach(v => v.hidden = v.dataset.view !== "grupo");
    document.querySelectorAll("#app .tab").forEach(t => t.classList.remove("active"));
    
    if (tg && tg.BackButton) {
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBackClick);
      } catch(e) {}
    }

    const el = document.getElementById("v-grupo");
    el.innerHTML = `<button class="backbtn" id="gback">${svg('chevron')} Volver a canales</button>
      <div class="vtitle">${escHtml(name || 'Grupo')}</div>
      <div class="vsub">Cargando datos del canal…</div>` + skel();
    document.getElementById("gback").onclick = () => showView("canales");
    loadGroup();
  }

  function handleBackClick() {
    haptic("light");
    showView("canales");
  }

  async function loadGroup() {
    const d = await gp("/group/get", {});
    const el = document.getElementById("v-grupo");
    if (!d || !d.ok) {
      el.innerHTML = `<button class="backbtn" id="gb">${svg('chevron')} Volver a canales</button>
        <p class="muted">No se pudo cargar la información (sin permiso o canal no vinculado).</p>`;
      document.getElementById("gb").onclick = () => showView("canales");
      return;
    }
    const m = d.meta || {}, t = m.ctype === "channel" ? "Canal" : "Grupo";
    const sched = d.scheduled || [], bans = d.bans || [], warns = d.warns || [], cfg = d.config || {};
    el.innerHTML = `
      <button class="backbtn" id="gback">${svg('chevron')} Volver a canales</button>
      <div class="vtitle">${escHtml(m.name || 'Grupo')}</div>
      <div class="vsub">${t} · ${fmt(m.subscribers)} miembros</div>

      <div id="gstats"></div>
      <div id="gads"></div>

      <div class="gsec">${svg('share')} Enviar mensaje</div>
      <textarea id="gmsg" rows="3" placeholder="Escribe un mensaje para publicar en el canal…"></textarea>
      <div class="btnrow"><button class="btn cta" id="gsend" style="flex:1">Enviar ahora</button></div>
      <div class="btnrow" style="align-items:center"><input type="datetime-local" id="gwhen" style="flex:1"><button class="btn ghost" id="gsched" style="width:auto;padding:12px 18px">Programar</button></div>

      <div class="gsec">${svg('sparkles')} Generar imagen con IA</div>
      <div class="btnrow" style="align-items:center"><input type="text" id="gimgprompt" placeholder="Describe la imagen que deseas generar…" style="flex:1"><button class="btn ghost" id="gimggen" style="width:auto;padding:12px 18px">Generar</button></div>
      <div id="gimgout"></div>

      <div class="gsec">Programados (${sched.length})</div><div id="gschedlist"></div>
      <div class="gsec">Moderación</div>
      <div class="dropdown" id="dd-bans"><div class="dhead">Baneados en Telegram (${bans.length}) <span class="chev">${svg('chevron')}</span></div><div class="dbody" id="gbans" hidden></div></div>
      <div class="dropdown" id="dd-warns"><div class="dhead">Con avisos (${warns.length}) <span class="chev">${svg('chevron')}</span></div><div class="dbody" id="gwarns" hidden></div></div>
      <div class="gsec">Ajustes del bot</div><div id="gsettings"></div>
      <div class="gsec">Palabras prohibidas</div>
      <textarea id="gbadwords" rows="2" placeholder="palabra1, palabra2, palabra3…">${escHtml((d.badwords && d.badwords.words || []).join(", "))}</textarea>
      <div class="btnrow" style="align-items:center">
        <select id="gbwaction" style="flex:1">
          <option value="delete">Borrar mensaje</option>
          <option value="warn">Borrar y avisar</option>
          <option value="ban">Borrar y banear</option>
        </select>
        <button class="btn ghost" id="gbwsave" style="width:auto;padding:12px 18px">Guardar filtro</button>
      </div>

      <div class="gsec">Notas internas</div>
      <textarea id="gnotes" rows="2" placeholder="Notas internas para administradores…">${escHtml(d.notes)}</textarea>
      <div class="btnrow"><button class="btn ghost" id="gnotesSave">Guardar notas</button></div>`;
    
    document.getElementById("gback").onclick = () => showView("canales");

    document.getElementById("gsend").onclick = async () => {
      const txt = document.getElementById("gmsg").value.trim();
      if (!txt) { haptic("error"); showToast("Escribe un mensaje primero"); return; }
      haptic("medium");
      const r = await gp("/group/send", { text: txt });
      if (r && r.ok) {
        haptic("success");
        ev("group_message_sent");
        document.getElementById("gmsg").value = "";
        showToast("Mensaje enviado con éxito");
      } else {
        haptic("error");
        showToast("No se pudo enviar el mensaje");
      }
    };

    document.getElementById("gsched").onclick = async () => {
      const txt = document.getElementById("gmsg").value.trim(), when = toUTC(document.getElementById("gwhen").value);
      if (!txt) { haptic("error"); showToast("Escribe un mensaje primero"); return; }
      if (!when) { haptic("error"); showToast("Selecciona fecha y hora"); return; }
      haptic("medium");
      const r = await gp("/group/schedule", { text: txt, send_at: when });
      if (r && r.ok) {
        haptic("success");
        showToast("Mensaje programado correctamente");
        loadGroup();
      } else {
        haptic("error");
        showToast("No se pudo programar");
      }
    };

    const sl = document.getElementById("gschedlist");
    sl.innerHTML = sched.length ? sched.map(s => `<div class="userchip"><div><div class="uid">${escHtml((s.text || '').slice(0, 42))}</div><div class="w">${fromUTC(s.send_at)}</div></div><span class="minibtn red" data-sid="${s.id}">Cancelar</span></div>`).join("") : `<p class="muted">No hay mensajes programados.</p>`;
    sl.querySelectorAll("[data-sid]").forEach(b => b.onclick = async () => {
      haptic("medium");
      const r = await gp("/group/unschedule", { id: b.dataset.sid });
      if (r && r.ok) {
        haptic("success");
        showToast("Programación cancelada");
        loadGroup();
      }
    });

    function userRow(uid, extra, actLabel, actAttr) {
      return `<div class="userchip uexp" data-uid="${uid}">
          <span class="uid">${uid}${extra || ""}</span>
          <span style="display:flex;gap:8px;align-items:center"><span class="minibtn" ${actAttr}>${actLabel}</span><span class="chev">${svg('chevron')}</span></span>
        </div><div class="casbox" data-cas="${uid}" hidden></div>`;
    }

    function bindCas(container) {
      container.querySelectorAll(".uexp").forEach(row => row.addEventListener("click", async e => {
        if (e.target.closest(".minibtn")) return;
        haptic("light");
        const uid = row.dataset.uid, box = container.querySelector(`[data-cas="${uid}"]`);
        if (!box) return;
        row.classList.toggle("open");
        box.hidden = !box.hidden;
        if (!box.hidden && !box.dataset.loaded) {
          box.innerHTML = `<span class="k">Consultando cas.chat…</span>`;
          const c = await gp("/group/cas", { user_id: uid });
          if (c && c.ok) {
            const cas = c.cas || {}, res = cas.result;
            let ex = "";
            if (res && typeof res === "object") {
              if (res.offenses != null) ex += `<div><span class="k">Ofensas registradas:</span> ${res.offenses}</div>`;
              if (res.time_added) ex += `<div><span class="k">En CAS desde:</span> ${res.time_added}</div>`;
            }
            box.innerHTML = `<div><span class="k">cas.chat:</span> <span class="${cas.banned ? 'banned' : 'clean'}">${cas.banned ? 'BANEADO globalmente' : 'Limpio'}</span></div>${ex}<div><span class="k">Estado en el grupo:</span> ${c.tg_status || '—'}</div>`;
            box.dataset.loaded = "1";
          } else {
            box.innerHTML = `<span class="k">No se pudo consultar la API de CAS.</span>`;
          }
        }
      }));
    }

    const bl = document.getElementById("gbans");
    bl.innerHTML = bans.length ? bans.map(u => userRow(u, "", 'Quitar ban', `data-unban="${u}"`)).join("") : `<p class="muted">Sin usuarios baneados registrados.</p>`;
    bl.querySelectorAll("[data-unban]").forEach(b => b.onclick = async (e) => {
      e.stopPropagation();
      haptic("medium");
      const r = await gp("/group/unban", { user_id: b.dataset.unban });
      if (r && r.ok) {
        haptic("success");
        showToast("Usuario desbaneado");
        loadGroup();
      }
    });
    bindCas(bl);
    bindDropdown("dd-bans");

    const wl = document.getElementById("gwarns");
    wl.innerHTML = warns.length ? warns.map(w => userRow(w.user_id, ` <span class="w">${w.count} avisos</span>`, 'Quitar', `data-unwarn="${w.user_id}"`)).join("") : `<p class="muted">Sin usuarios con avisos.</p>`;
    wl.querySelectorAll("[data-unwarn]").forEach(b => b.onclick = async (e) => {
      e.stopPropagation();
      haptic("medium");
      const r = await gp("/group/unwarn", { user_id: b.dataset.unwarn });
      if (r && r.ok) {
        haptic("success");
        showToast("Aviso retirado");
        loadGroup();
      }
    });
    bindCas(wl);
    bindDropdown("dd-warns");

    const SET = [
      ["auto_mod", "Auto-moderación", "Filtra spam, enlaces no autorizados y flood"],
      ["security_shield", "Escudo de seguridad", "Bloquea cuentas en listas negras globales"],
      ["welcome", "Mensaje de bienvenida", "Saluda automáticamente a los nuevos miembros"],
      ["ia_learning", "Aprendizaje IA", "Permite que la IA contextual aprenda del canal"]
    ];
    const gs = document.getElementById("gsettings");
    gs.innerHTML = SET.map(([k, tt, de]) => `<div class="setrow"><div><b>${tt}</b><span>${de}</span></div><div class="switch ${cfg[k] ? 'on' : ''}" data-set="${k}"><span></span></div></div>`).join("");
    gs.querySelectorAll("[data-set]").forEach(sw => sw.onclick = async () => {
      haptic("selection");
      const on = !sw.classList.contains("on");
      sw.classList.toggle("on", on);
      const r = await gp("/group/settings", { key: sw.dataset.set, value: on });
      if (!r || !r.ok) {
        sw.classList.toggle("on", !on);
        haptic("error");
      } else {
        haptic("success");
      }
    });

    document.getElementById("gnotesSave").onclick = async () => {
      haptic("medium");
      const r = await gp("/group/notes", { notes: document.getElementById("gnotes").value });
      if (r && r.ok) {
        haptic("success");
        showToast("Notas guardadas");
      }
    };

    const bwsel = document.getElementById("gbwaction");
    if (d.badwords && d.badwords.action) bwsel.value = d.badwords.action;
    document.getElementById("gbwsave").onclick = async () => {
      haptic("medium");
      const words = document.getElementById("gbadwords").value.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
      const r = await gp("/group/badwords", { words, action: bwsel.value });
      if (r && r.ok) {
        haptic("success");
        showToast(`Filtro guardado (${words.length} palabras)`);
      } else {
        haptic("error");
        showToast("No se pudo guardar el filtro");
      }
    };

    document.getElementById("gimggen").onclick = async () => {
      const p = document.getElementById("gimgprompt").value.trim();
      if (!p) { haptic("error"); showToast("Describe la imagen a generar"); return; }
      haptic("medium");
      const out = document.getElementById("gimgout");
      out.innerHTML = `<p class="muted" style="margin-top:10px">Generando 4 variantes con IA…</p>`;
      const r = await gp("/image/generate", { prompt: p });
      if (!r || !r.ok || !r.images) {
        out.innerHTML = `<p class="muted" style="margin-top:10px">No se pudo generar la imagen.</p>`;
        haptic("error");
        return;
      }
      haptic("success");
      out.innerHTML = `<div class="imggrid">${r.images.map(u => `<img class="genimg" src="${u}" data-url="${u}" loading="lazy">`).join("")}</div>
        <button class="btn cta" id="gimgsend" disabled style="margin-top:10px">Enviar imagen seleccionada</button>`;
      let sel = null;
      out.querySelectorAll(".genimg").forEach(im => im.onclick = () => {
        haptic("selection");
        out.querySelectorAll(".genimg").forEach(x => x.classList.remove("sel"));
        im.classList.add("sel");
        sel = im.dataset.url;
        document.getElementById("gimgsend").disabled = false;
      });
      document.getElementById("gimgsend").onclick = async () => {
        if (!sel) return;
        haptic("medium");
        const cap = document.getElementById("gmsg").value.trim();
        const rr = await gp("/group/sendphoto", { photo_url: sel, caption: cap });
        if (rr && rr.ok) {
          haptic("success");
          showToast("Imagen enviada al canal");
        } else {
          haptic("error");
          showToast("No se pudo enviar la imagen");
        }
      };
    };

    loadStats();
    loadAds();
  }

  function bindDropdown(id) {
    const dd = document.getElementById(id);
    if (!dd) return;
    const head = dd.querySelector(".dhead"), body = dd.querySelector(".dbody");
    head.onclick = () => {
      haptic("light");
      body.hidden = !body.hidden;
      dd.classList.toggle("open", !body.hidden);
    };
  }

  function imgGenHTML(pfx, placeholder) {
    return `<div class="btnrow" style="align-items:center;margin-top:8px"><input type="text" id="${pfx}p" placeholder="${placeholder || 'Describe la imagen…'}" style="flex:1"><button class="btn ghost" id="${pfx}g" style="width:auto;padding:12px 14px">Generar</button></div><div id="${pfx}o"></div>`;
  }

  function bindImgGen(pfx, onSelect) {
    const g = document.getElementById(pfx + "g");
    if (!g) return;
    g.onclick = async () => {
      const p = document.getElementById(pfx + "p").value.trim();
      if (!p) { haptic("error"); showToast("Describe la imagen"); return; }
      haptic("medium");
      const o = document.getElementById(pfx + "o");
      o.innerHTML = `<p class="muted" style="margin-top:8px">Generando imágenes con IA…</p>`;
      const r = await gp("/image/generate", { prompt: p });
      if (!r || !r.ok || !r.images) {
        haptic("error");
        o.innerHTML = `<p class="muted">No se pudo generar.</p>`;
        return;
      }
      haptic("success");
      o.innerHTML = `<div class="imggrid">${r.images.map(u => `<img class="genimg" src="${u}" data-url="${u}" loading="lazy">`).join("")}</div>`;
      o.querySelectorAll(".genimg").forEach(im => im.onclick = () => {
        haptic("selection");
        o.querySelectorAll(".genimg").forEach(x => x.classList.remove("sel"));
        im.classList.add("sel");
        onSelect(im.dataset.url);
        showToast("Imagen seleccionada");
      });
    };
  }

  function lineChart(series) {
    const w = 320, h = 90, pad = 5;
    const ys = series.map(p => p.subs), min = Math.min(...ys), max = Math.max(...ys), span = (max - min) || 1;
    const sx = (w - pad * 2) / (series.length - 1);
    const pts = series.map((p, i) => [pad + i * sx, h - pad - ((p.subs - min) / span) * (h - pad * 2)]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:88px;display:block">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5DCAA5" stop-opacity=".3"/><stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#cg)"/><path d="${line}" fill="none" stroke="#5DCAA5" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }

  async function loadStats() {
    const st = document.getElementById("gstats");
    if (!st) return;
    const d = await gp("/group/stats", {});
    if (!d || !d.ok || !d.stats) { st.innerHTML = ""; return; }
    const s = d.stats, up = (s.growth30d || 0) >= 0, series = s.series || [];
    const n7 = s.new7d != null ? ((s.new7d >= 0 ? "+" : "") + fmt(s.new7d)) : "—";
    st.innerHTML = `<div class="gsec">Estadísticas del canal</div>
      <div class="statbar">
        <div class="stat"><div class="v">${fmt(s.subscribers)}</div><div class="l">Suscriptores</div></div>
        <div class="stat"><div class="v" style="color:${up ? 'var(--teal)' : 'var(--red)'}">${gpct(s.growth30d)}</div><div class="l">30 días</div></div>
        <div class="stat"><div class="v">${n7}</div><div class="l">Nuevos 7d</div></div>
      </div>
      <div class="statbar">
        <div class="stat"><div class="v">${fmt(s.postsPerDay)}</div><div class="l">Posts / día</div></div>
        <div class="stat"><div class="v">${fmt(s.posts_count)}</div><div class="l">Posts vistos</div></div>
        <div class="stat"><div class="v">${series.length}</div><div class="l">Días de datos</div></div>
      </div>
      ${series.length >= 2 ? `<div class="card" style="padding:14px">${lineChart(series)}</div>`
        : `<p class="muted">La gráfica de evolución se trazará según se acumulen muestras diarias.</p>`}`;
  }

  async function loadAds() {
    const box = document.getElementById("gads");
    if (!box) return;
    const inc = await gp("/ads/incoming", {});
    const ads = (inc && inc.ads) || [];
    const p = await gp("/ads/partners", {});
    const partners = (p && p.partners) || [];
    box.innerHTML = `<div class="gsec">Intercambio de Anuncios</div>
      <div class="dropdown" id="dd-adnew"><div class="dhead">Solicitar anuncio cruzado <span class="chev">${svg('chevron')}</span></div>
        <div class="dbody" hidden>
          <p class="muted" style="margin:2px 0 10px">Tu anuncio se publica en el canal socio y el suyo en el tuyo, de forma coordinada.</p>
          <select id="adpartner">${partners.length ? partners.map(x => `<option value="${x.chat_id}">${escHtml(x.name)} · ${fmt(x.subscribers)} subs</option>`).join("") : `<option value="">(no hay canales socios disponibles)</option>`}</select>
          <textarea id="admsg" rows="3" placeholder="Texto del anuncio que quieres publicar…" style="margin-top:10px"></textarea>
          <div style="font-size:12px;color:var(--muted);margin:10px 2px 0">Imagen del anuncio (opcional)</div>
          ${imgGenHTML("adimg", "Describe la imagen del anuncio…")}
          <div class="btnrow" style="align-items:center"><input type="datetime-local" id="adwhen" style="flex:1"><button class="btn ghost" id="adsend" style="width:auto;padding:12px 18px">Enviar</button></div>
        </div></div>
      <div class="dropdown" id="dd-adinc"><div class="dhead">Solicitudes recibidas (${ads.length}) <span class="chev">${svg('chevron')}</span></div>
        <div class="dbody" hidden id="adinclist"></div></div>`;
    bindDropdown("dd-adnew");
    bindDropdown("dd-adinc");
    let adImg = null;
    bindImgGen("adimg", u => { adImg = u; });
    document.getElementById("adsend").onclick = async () => {
      const to = document.getElementById("adpartner").value, txt = document.getElementById("admsg").value.trim(), when = toUTC(document.getElementById("adwhen").value);
      if (!to) { haptic("error"); showToast("Elige un canal socio"); return; }
      if (!txt) { haptic("error"); showToast("Escribe el contenido del anuncio"); return; }
      if (!when) { haptic("error"); showToast("Elige fecha y hora"); return; }
      haptic("medium");
      const r = await gp("/ads/request", { from_chat: curChat, to_chat: to, from_ad: txt, when, from_image: adImg || "" });
      if (r && r.ok) {
        haptic("success");
        showToast("Solicitud enviada");
        document.getElementById("admsg").value = "";
        adImg = null;
        document.getElementById("adimgo").innerHTML = "";
      } else {
        haptic("error");
        showToast((r && r.error) || "No se pudo enviar");
      }
    };
    const il = document.getElementById("adinclist");
    const incImg = {};
    il.innerHTML = ads.length ? ads.map(a => `<div class="casbox" style="margin-bottom:10px">
        <div><span class="k">De:</span> ${escHtml(a.from_name || 'canal')}</div>
        <div style="margin:6px 0"><span class="k">Su anuncio:</span><br>${escHtml(a.from_ad)}</div>
        ${a.from_image ? `<img src="${a.from_image}" style="width:100%;border-radius:10px;margin:6px 0" loading="lazy">` : ""}
        <div><span class="k">Programado para:</span> ${fromUTC(a.when)}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">Tu anuncio recíproco</div>
        <textarea rows="2" placeholder="Texto de tu anuncio…" data-adtext="${a.id}"></textarea>
        ${imgGenHTML("ai" + a.id, "Describe la imagen de tu anuncio…")}
        <div class="btnrow"><button class="btn cta" data-adok="${a.id}" style="flex:1">Aceptar</button><button class="btn ghost" data-adno="${a.id}" style="width:auto">Rechazar</button></div>
      </div>`).join("") : `<p class="muted">No hay solicitudes pendientes.</p>`;
    ads.forEach(a => bindImgGen("ai" + a.id, u => { incImg[a.id] = u; }));
    il.querySelectorAll("[data-adok]").forEach(b => b.onclick = async () => {
      const id = b.dataset.adok, ta = il.querySelector(`[data-adtext="${id}"]`);
      haptic("medium");
      const r = await gp("/ads/accept", { id, to_ad: ta.value.trim(), to_image: incImg[id] || "" });
      if (r && r.ok) {
        haptic("success");
        showToast("Aceptado y programado");
        loadAds();
      } else {
        haptic("error");
        showToast((r && r.error) || "Escribe tu anuncio");
      }
    });
    il.querySelectorAll("[data-adno]").forEach(b => b.onclick = async () => {
      haptic("medium");
      const r = await gp("/ads/decline", { id: b.dataset.adno });
      if (r && r.ok) {
        haptic("success");
        showToast("Rechazado");
        loadAds();
      }
    });
  }


  let hubMasterLoading = false;
  async function hubMasterRequest(path, options = {}) {
    if (!master || !hubMasterToken) throw new Error("Cierra y abre el Hub desde Telegram para validar tu sesión master.");
    const response = await fetch(path, {...options, headers: {"Content-Type":"application/json", Authorization:`Bearer ${hubMasterToken}`}, signal:AbortSignal.timeout(12000), cache:"no-store"});
    if (response.status === 401 || response.status === 403) {
      hubMasterToken = "";
      throw new Error("La sesión master ha caducado. Vuelve a abrir el Hub desde Telegram.");
    }
    if (!response.ok) throw new Error("Esta función no está disponible temporalmente.");
    const data = await response.json();
    if (!data.ok) throw new Error("No se pudo consultar Moonbot.");
    return data;
  }
  function hubMasterEscape(value) {
    const el=document.createElement("span"); el.textContent=String(value ?? "—"); return el.innerHTML;
  }
  async function loadIntegratedMaster() {
    const el=document.getElementById("v-master");
    if (!master) { el.textContent="Solo disponible para el master verificado por Telegram."; return; }
    if (hubMasterLoading) return;
    hubMasterLoading=true;
    el.innerHTML=`<div class="vtitle">Centro de control master</div><div class="vsub">Administra Moonbot sin salir de Telegram.</div>
      <div class="card"><h3>Sesión master verificada</h3><p>Panel integrado · versión estable</p></div>
      <div id="hubMasterStatus" aria-live="polite">Consultando estado…</div>
      <button class="btn ghost" id="hubMasterRefresh" disabled>Actualizar estado</button>
      <div class="sec">Administración</div>
      <button class="btn teal" id="hubMasterGroups">Grupos y canales</button>
      <button class="btn ghost" id="hubMasterSettings">Configuración y mantenimiento</button>
      <button class="btn ghost" id="hubMasterAudit">Auditoría administrativa</button>
      <div id="hubMasterDetail" style="margin-top:16px" aria-live="polite"></div>`;
    document.getElementById("hubMasterGroups").onclick=()=>showView("admin");
    document.getElementById("hubMasterSettings").onclick=loadIntegratedMasterSettings;
    document.getElementById("hubMasterAudit").onclick=loadIntegratedMasterAudit;
    document.getElementById("hubMasterRefresh").onclick=loadIntegratedMaster;
    try {
      const d=await hubMasterRequest("/api/status"), esc=hubMasterEscape;
      const metrics=[["CPU",d.cpu==null?null:d.cpu+" %"],["RAM",d.ram==null?null:d.ram+" %"],["Disco",d.disk==null?null:d.disk+" %"],["Tiempo activo",d.uptime]];
      document.getElementById("hubMasterStatus").innerHTML=`<div class="hub-master-metrics">${metrics.map(([k,v])=>`<div class="card"><p>${esc(k)}</p><b>${esc(v)}</b></div>`).join("")}</div><p class="muted">Versión ${esc(d.version)} · Lectura ${esc(new Date().toLocaleTimeString())}</p>`;
    } catch(e) { document.getElementById("hubMasterStatus").textContent=e.message; }
    finally { hubMasterLoading=false; document.getElementById("hubMasterRefresh").disabled=false; }
  }
  async function loadIntegratedMasterSettings() {
    const box=document.getElementById("hubMasterDetail");box.textContent="Cargando configuración…";
    try {
      const d=await hubMasterRequest("/api/settings");
      box.innerHTML=`<div class="card"><h3>Configuración</h3><label>Mensaje de bienvenida<textarea id="hubMasterWelcome" rows="3"></textarea></label><label style="display:block;margin:14px 0"><input type="checkbox" id="hubMasterMaintenance"> Modo mantenimiento</label><button class="btn teal" id="hubMasterSave">Guardar cambios</button><p id="hubMasterSaveResult" role="status"></p></div>`;
      document.getElementById("hubMasterWelcome").value=d.welcome_msg||"";
      document.getElementById("hubMasterMaintenance").checked=d.maintenance_mode===true;
      document.getElementById("hubMasterSave").onclick=async()=>{
        const button=document.getElementById("hubMasterSave"),result=document.getElementById("hubMasterSaveResult");
        if (!window.confirm("¿Guardar la configuración global de Moonbot? El mantenimiento afecta a todos los bots.")) return;
        button.disabled=true;
        try {
          await hubMasterRequest("/api/settings",{method:"POST",body:JSON.stringify({welcome_msg:document.getElementById("hubMasterWelcome").value,maintenance_mode:document.getElementById("hubMasterMaintenance").checked})});
          result.textContent="Configuración guardada.";
        } catch(e) { result.textContent=e.message; }
        finally { button.disabled=false; }
      };
    } catch(e) { box.textContent=e.message; }
  }
  async function loadIntegratedMasterAudit() {
    const box=document.getElementById("hubMasterDetail");box.textContent="Cargando auditoría…";
    try {
      const d=await hubMasterRequest("/api/audit");
      box.innerHTML='<div class="card"><h3>Auditoría administrativa</h3><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px"></pre></div>';
      box.querySelector("pre").textContent=JSON.stringify((Array.isArray(d.logs)?d.logs:[]).slice(-30),null,2);
    } catch(e) { box.textContent=e.message; }
  }

  // ── Navegación entre Vistas ──
  const LOADERS = {
    master: loadIntegratedMaster,
    canales: loadCanales,
    admin: loadAdmin,
    directorio: loadDirectorio,
    red: loadRed,
    juegos: loadJuegos,
    ajustes: loadAjustes
  };

  function showView(name) {
    haptic("light");
    document.querySelectorAll("#app .view").forEach(v => v.hidden = v.dataset.view !== name);
    document.querySelectorAll("#app .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    
    if (tg && tg.BackButton) {
      try {
        if (name === "grupo" || name === "ajustes" || name === "juegos") {
          tg.BackButton.show();
          tg.BackButton.onClick(handleBackClick);
        } else {
          tg.BackButton.hide();
        }
      } catch(e) {}
    }

    if (window.gtag) gtag("event", "page_view", { page_path: "/hub/" + name });
    (LOADERS[name] || (() => {}))();
  }

  let newBound = false;
  function initNew() {
    if (!newBound) {
      document.querySelectorAll("#app .tab").forEach(t => t.onclick = () => showView(t.dataset.tab));
      document.getElementById("btnAjustes").onclick = () => {
        haptic("light");
        showView("ajustes");
      };
      newBound = true;
    }
    showView("canales");
  }

  // ── Tema Clásico ──
  let classicBound = false;
  function initClassic() {
    if (user && user.first_name) document.getElementById("c-hello").innerHTML = `Hola <b style="color:var(--ink)">${user.first_name}</b>, este es tu panel.`;
    if (master) document.getElementById("c-masterCard").style.display = "block";
    apiGet("/stats/global").then(d => {
      if (d && d.ok && d.channels > 0) document.getElementById("c-chStat").textContent = `${d.channels} canales · ${fmt(d.totalSubscribers)} suscriptores`;
    });
    document.getElementById("c-services").innerHTML = SERVICES.map((s, i) => `<div class="svc" data-i="${i}"><span class="si">${svg(s.ic)}</span>${s.n}</div>`).join("");
    if (classicBound) return;
    classicBound = true;
    document.getElementById("c-services").querySelectorAll(".svc").forEach(x => x.onclick = () => {
      const s = SERVICES[x.dataset.i];
      if (s.action) s.action();
      else if (s.url) openLink(s.url);
    });
    document.getElementById("c-btnCanales").onclick = () => openLink("https://canales.todosobreall.tech");
    document.getElementById("c-btnMaster").onclick = () => { if (curTheme === "clasico") setTheme("nuevo"); showView("master"); };
    document.getElementById("c-backNew").onclick = () => {
      haptic("medium");
      setTheme("nuevo");
    };
    document.getElementById("c-btnProxy").onclick = function () {
      haptic("light");
      const out = document.getElementById("c-proxyOut");
      out.innerHTML = `<p class="muted">Buscando…</p>`;
      apiGet("/proxy").then(d => {
        if (!d || !d.ok || !d.proxies || !d.proxies.length) {
          out.innerHTML = `<p class="muted">No hay proxies disponibles ahora.</p>`;
          return;
        }
        out.innerHTML = d.proxies.slice(0, 3).map(p => `<div class="proxy-item"><div class="pd">${p.server}:${p.port}<br><small>${p.tag || 'MTProto'}</small></div><span class="connect" data-l="${p.https_link}">Conectar</span></div>`).join("");
        out.querySelectorAll(".connect").forEach(el => el.onclick = () => {
          haptic("medium");
          ev("proxy_connect");
          openTg(el.dataset.l);
        });
      });
    };
  }

  // ── Gestión del Tema Seleccionado ──
  let curTheme = "nuevo";
  function applyTheme(t) {
    curTheme = (t === "clasico" || t === "oled") ? t : "nuevo";
    document.body.classList.toggle("theme-oled", curTheme === "oled");
    const esClasico = curTheme === "clasico";
    document.getElementById("app").hidden = esClasico;
    document.getElementById("app-classic").hidden = !esClasico;
    if (!esClasico) initNew();
    else initClassic();
  }

  function setTheme(t) {
    ev("theme_change", { theme: t });
    saveTheme(t);
    applyTheme(t);
    if (curTheme !== "clasico") reflectTheme();
  }

  function saveTheme(t) {
    try { if (tg && tg.CloudStorage) tg.CloudStorage.setItem("hub_theme", t); } catch (e) {}
    try { localStorage.setItem("hub_theme", t); } catch (e) {}
  }

  function loadTheme() {
    return new Promise(res => {
      let fb = "nuevo";
      try { fb = localStorage.getItem("hub_theme") || "nuevo"; } catch (e) {}
      if (tg && tg.CloudStorage) {
        try { tg.CloudStorage.getItem("hub_theme", (err, val) => res(val || fb)); } catch (e) { res(fb); }
      } else res(fb);
    });
  }

  // ── Arranque Inicial ──
  (async function () {
    try {
      const h = localStorage.getItem("hub_haptics");
      if (h !== null) hapticsEnabled = (h === "1");
    } catch(e) {}

    if (user && user.first_name) {
      document.getElementById("uname").textContent = user.first_name;
    }

    if (tg && tg.initData) {
      const d = await apiPost("/tg_auth", { initData: tg.initData });
      if (d && d.ok && d.is_master) {
        master = true;
        hubMasterToken = d.token || "";
        document.getElementById("masterTab").hidden = false;
        document.getElementById("hubMasterAccess").hidden = false;
        document.getElementById("hubMasterOpen").onclick = () => { if (curTheme === "clasico") setTheme("nuevo"); showView("master"); };
        document.getElementById("roleBadge").hidden = false;
      }
    }

    const t = await loadTheme();
    applyTheme(t);
  })();
