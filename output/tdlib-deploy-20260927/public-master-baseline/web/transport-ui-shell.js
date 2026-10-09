/**
 * Ecosistema de Interfaces Canva para Rutas del Continente (Canal Alfa).
 * Implementa fielmente las 12 pantallas y la capa de estado compartida de la página 022.
 */

export const TRANSPORT_INTERFACE_SECTIONS = [
  { id: "home",      icon: "🏠", label: "Inicio",     title: "Inicio y perfil de piloto", subtitle: "Estado general de tu conductor, empresa, KPIs y mundo compartido." },
  { id: "world",     icon: "🌐", label: "Mapa",       title: "Mapa mundial y conexiones", subtitle: "Red transcontinental de carreteras, ferris y corredores de carga." },
  { id: "drive",     icon: "🧭", label: "Conducción", title: "Puesto de conducción y cabina", subtitle: "Ruta activa, cuadro digital, cámaras y ayudas a la conducción." },
  { id: "garage",    icon: "🏢", label: "Garaje",     title: "Garaje y gestión de flota", subtitle: "Camiones, autobuses, vehículos de emergencia, barcos y aeronaves." },
  { id: "contracts", icon: "📋", label: "Contratos",  title: "Contratos y carrera europea", subtitle: "Ofertas comerciales, pagos por kilometraje, plazos y reputación." },
  { id: "cargo",     icon: "📦", label: "Logística",  title: "Logística, carga y custodia", subtitle: "Integridad, cadena de frío, materiales peligrosos y manifiesto." },
  { id: "air",       icon: "✈️", label: "Aeropuertos", title: "Carga aérea y aeropuertos", subtitle: "Operaciones aéreas, hangares, pistas y aviones de carga." },
  { id: "ports",     icon: "🚢", label: "Puertos",    title: "Puertos marítimos y ferris", subtitle: "Grúas de contenedores, atraques, despacho aduanero y buques." },
  { id: "workshop",  icon: "🔧", label: "Taller",     title: "Taller, diagnóstico y mejoras", subtitle: "Mantenimiento preventivo, reparaciones, pintura y personalización." },
  { id: "convoy",    icon: "👥", label: "Convoy",     title: "Convoy multijugador y radio CB", subtitle: "Salas online/LAN, telemetría compartida y comunicación diegética." },
  { id: "weather",   icon: "⚡", label: "Clima",      title: "Clima en vivo y emergencias", subtitle: "Alertas meteorológicas, tormentas, asistencia y rescate en ruta." },
  { id: "system",    icon: "⚙️", label: "Ajustes",    title: "Ajustes, gráficos y sistema", subtitle: "Calidad gráfica adaptativa, volantes FFB, accesibilidad y canales." }
];

const cards = (section, rows) => rows.map(([icon, title, description, target, tone]) => ({
  section,
  icon,
  title,
  description,
  target,
  close: target === "close",
  tone
}));

export const TRANSPORT_INTERFACE_CARDS = [
  ...cards("home", [
    ["↗", "Continuar ruta", "Regresa inmediatamente a la conducción.", "close", "primary"],
    ["◎", "Mapa mundial", "Posición, zoom y red logística global.", "worldMapButton"],
    ["▥", "Empresa y cuentas", "Saldo, facturación, garajes y contratos.", "contractButton"],
    ["▣", "Trabajo activo", "Objetivos, mercancía y recompensa.", "vehicleJobsButton"],
    ["△", "Incidencias de ruta", "Alertas meteorológicas y obras.", "eventsButton", "warning"],
    ["★", "Progreso de piloto", "Nivel de experiencia, logros e hitos.", "achievementsButton"]
  ]),
  ...cards("world", [
    ["◎", "Red mundial 3D", "28 hubs logísticos en 7 regiones globales.", "worldMapButton", "primary"],
    ["EU", "Red europea OSM", "Ciudades europeas, autopistas y peajes.", "europeMapButton"],
    ["⌖", "Minimapa de ruta", "Seguimiento GPS local y puntos de interés.", "mapButton"],
    ["✈", "Vuelos de carga", "Conexiones aéreas transcontinentales.", "worldFlyButton"],
    ["≈", "Líneas marítimas", "Transbordadores y transporte oceánico.", "worldSailButton"],
    ["⌘", "Operaciones de zona", "Control de fronteras y aduanas.", "regionOperationsButton"]
  ]),
  ...cards("drive", [
    ["▰", "Seleccionar vehículo", "Alternar entre camión, bus y flota.", "truck"],
    ["◫", "Cámaras 1–9", "Cabina inmersiva, espejos y vistas exteriores.", "cam"],
    ["⌁", "Controles y volante", "Asignación de pedales, force feedback y teclado.", "wheelButton"],
    ["◉", "Academia de conducción", "Pruebas de habilidad y eficiencia.", "academyButton"],
    ["⚑", "Asistencia en carretera", "Recuperación de vehículo y grúa.", "rescue"],
    ["P", "Tomar el volante", "Cierra el centro y vuelve a conducir.", "close", "primary"]
  ]),
  ...cards("garage", [
    ["🚛", "Camiones pesados", "Aster Viento, Frontier 88 y Aurora clásica.", "truck", "primary"],
    ["🚌", "Autobuses de línea", "Flota de pasajeros y transporte interurbano.", "truck"],
    ["🚒", "Flota de emergencias", "Ambulancia, bomberos y vehículos de auxilio.", "ambulance"],
    ["✈️", "Aeronaves de carga", "Céfiro G2, Mercurio C70 y Altair H4.", "fleetVehicle"],
    ["🚢", "Buques y ferris", "Marina Senda y Océano Vector.", "fleetVehicle"],
    ["🎨", "Personalizar librea", "Diseños oficiales y colores de empresa.", "fleetLivery"]
  ]),
  ...cards("contracts", [
    ["€", "Mercado de contratos", "Rutas disponibles con tarifa y plazo.", "contractButton", "primary"],
    ["📦", "Cargas de alto valor", "Electrónica, medicina y maquinaria.", "contractButton"],
    ["⏱", "Entregas urgentes", "Bonificación por puntualidad y rapidez.", "contractButton"],
    ["📈", "Reputación de empresa", "Nivel de confianza y apertura de mercados.", "contractButton"],
    ["◫", "Campaña narrativa", "Decisiones del prólogo y cuaderno familiar.", "storyButton"]
  ]),
  ...cards("cargo", [
    ["▣", "Monitor de carga", "Temperatura, sujeción y estado del precinto.", "cargoMonitorButton", "primary"],
    ["◆", "Cadena logística", "Trazabilidad multimodal puerta a puerta.", "logisticsChainButton"],
    ["◇", "Transporte especial", "Cargas sobredimensionadas con escolta.", "specialButton"],
    ["⚖", "Estación de pesaje", "Báscula por ejes y control de documentos.", "weighStationButton"],
    ["📦", "Inspección Caja 07-A", "Precinto, manifiesto y análisis de carga.", "storyButton"]
  ]),
  ...cards("air", [
    ["✈️", "Flota aérea", "Aeronaves de transporte urgente.", "fleetVehicle", "primary"],
    ["🛫", "Pistas y despegue", "Simulación de aproximación y maniobra.", "fleetVehicle"],
    ["📦", "Terminal de carga aérea", "Contenedores aéreos y pallets ULD.", "worldFlyButton"],
    ["🌐", "Corredores aéreos", "Planificación de rutas de largo alcance.", "worldMapButton"]
  ]),
  ...cards("ports", [
    ["🚢", "Terminal de contenedores", "Atraques de gran calado y grúas pórtico.", "fleetVehicle", "primary"],
    ["⚓", "Ferry transfronterizo", "Embarque de tractoras y semirremolques.", "worldSailButton"],
    ["📋", "Despacho de aduanas", "Inspección aduanera y permisos marítimos.", "worldMapButton"],
    ["🌊", "Navegación costera", "Rutas marítimas del norte y mediterráneo.", "fleetVehicle"]
  ]),
  ...cards("workshop", [
    ["⚙", "Taller mecánico", "Diagnóstico de motor, frenos y aceite.", "serviceButton", "primary"],
    ["⛽", "Estación de servicio", "Repostaje de diésel y carga eléctrica.", "serviceButton"],
    ["🧰", "Diagnóstico interactivo", "Inspección de mangueras, correas y fugas.", "storyButton"],
    ["🎨", "Pintura y cabina", "Acabados metálicos y elementos estéticos.", "serviceButton"]
  ]),
  ...cards("convoy", [
    ["👥", "Sala de convoy", "Unirse o crear sala con conductores e IA.", "convoyButton", "primary"],
    ["📻", "Emisora Radio CB", "Canales 19, 9, 1 y 11 con mensajes rápidos.", "convoyButton"],
    ["📡", "Telemetría compartida", "Velocidad, carga y posición del convoy.", "convoyButton"],
    ["🏆", "Operaciones conjuntas", "Misiones cooperativas de transporte.", "convoyButton"]
  ]),
  ...cards("weather", [
    ["⚡", "Alertas meteorológicas", "Lluvia, nieve, tormentas y niebla densa.", "eventsButton", "primary"],
    ["🦌", "Fauna en calzada", "Alertas de rebaños y pasos de fauna silvestre.", "eventsButton"],
    ["⚠️", "Obras y desvíos", "Carriles cortados y señalización de obras.", "eventsButton"],
    ["🚒", "Servicios de rescate", "Asistencia de grúa y bomberos.", "ambulance"]
  ]),
  ...cards("system", [
    ["VER", "Canal de lanzamiento", "Cambiar entre Alfa, Beta, RC y Estable.", "releaseChannelButton", "primary"],
    ["GPU", "Rendimiento gráfico", "Perfil adaptable según hardware.", "transportQualitySelect"],
    ["⌁", "Dispositivos de control", "Configuración de volantes FFB y mandos.", "wheelButton"],
    ["◫", "Pantalla completa", "Modo inmersivo sin marcos.", "full"],
    ["Aa", "Accesibilidad", "Tamaño de fuente, contraste y subtítulos.", "accessibilityButton"],
    ["♫", "Ajustes de audio", "Sonido de motor diésel, radio y ambiente.", "audioButton"]
  ])
];

const money = value => `${Math.round(Number(value) || 0).toLocaleString("es-ES")} €`;

export function createTransportUiShell({ career } = {}) {
  const style = document.createElement("style");
  style.textContent = `
    :root{--moon-cyan:#55ead9;--moon-orange:#ff962f;--moon-bg:#061019;--moon-panel:#0b1b26;--moon-line:#234150;--moon-muted:#8da9b7}
    .moon-shell{position:fixed;z-index:60;inset:0;display:grid;grid-template-columns:92px minmax(0,1fr);grid-template-rows:76px minmax(0,1fr);background:radial-gradient(circle at 72% -8%,#174555 0,transparent 34%),linear-gradient(135deg,#030910fa,#07131df7);color:#f2fbfd;backdrop-filter:blur(24px)}
    .moon-shell[hidden]{display:none}
    .moon-shell-nav{grid-column:1;grid-row:1/3;display:flex;flex-direction:column;padding:8px 5px;border-right:1px solid #1d4552;background:#050f18fa;overflow-y:auto}
    .moon-brand{padding:6px 2px 10px;border-bottom:1px solid #ffffff14;text-align:center}
    .moon-brand small{display:block;color:var(--moon-cyan);font-size:7px;font-weight:800;letter-spacing:.12em}
    .moon-brand b{display:block;margin-top:2px;font-size:11px}
    .moon-brand em{display:none}
    .moon-tabs{display:grid;gap:4px;padding:8px 0 0}
    .moon-tabs button{display:grid;grid-template-columns:1fr;justify-items:center;gap:2px;min-height:50px;padding:4px 2px;border:1px solid transparent;border-radius:8px;background:transparent;color:#91abb7;text-align:center;cursor:pointer}
    .moon-tabs button i{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:#102430;color:#77a6b5;font-style:normal;font-size:13px}
    .moon-tabs button span{display:block;font-size:8px}
    .moon-tabs button.on{border-color:#42decc55;background:linear-gradient(180deg,#12322f,#0b2029);color:#fff;box-shadow:inset 3px 0 var(--moon-orange)}
    .moon-tabs button.on i{background:#17443e;color:var(--moon-cyan)}
    .moon-shell-main{grid-column:2;grid-row:1/3;padding:88px 18px 24px;overflow-y:auto}
    .moon-global{position:fixed;z-index:2;left:92px;right:0;top:0;height:76px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 18px;border-bottom:1px solid #224754;background:#06131df4;box-sizing:border-box}
    .moon-global-status{flex:1;display:grid;grid-template-columns:repeat(6,minmax(90px,1fr));gap:6px}
    .moon-global-status span{display:grid;gap:2px;padding:6px 8px;border:1px solid #1d3d49;border-radius:8px;background:#091d27}
    .moon-global-status span small{color:#55ead9;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
    .moon-global-status b{font-size:11px;color:#edfaff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .moon-shell-close{min-width:44px;min-height:44px;border:1px solid #ff963f66;border-radius:10px;background:#3b2119;color:#ffb06a;font-size:20px;cursor:pointer}
    .moon-shell-head{display:grid;grid-template-columns:auto 1fr;column-gap:12px;align-items:end;margin-bottom:12px}
    .moon-shell-head small{grid-row:1/3;display:grid;place-items:center;width:48px;height:48px;border:1px solid #25ddcb66;border-radius:11px;background:#0b2b31;color:#58ead8;font-size:9px;font-weight:900}
    .moon-shell-head h1{margin:0;font-size:clamp(22px,2.6vw,34px);letter-spacing:-.03em}
    .moon-shell-head p{margin:3px 0 0;color:var(--moon-muted);font-size:12px}
    .moon-action-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:9px}
    .moon-action{position:relative;display:grid;grid-template-rows:92px auto 1fr;padding:9px;text-align:left;border:1px solid #244453;border-radius:11px;background:linear-gradient(145deg,#102530,#091721);color:#fff;box-shadow:0 8px 20px #0006;transition:.16s ease;cursor:pointer}
    .moon-action:hover{transform:translateY(-2px);border-color:#54ead999}
    .moon-action i{display:grid;width:100%;min-height:92px;place-items:center;border:1px solid #4de5d43d;border-radius:8px;background:radial-gradient(circle at 70% 30%,#256a6c,#0b2730 52%,#06151d);color:var(--moon-cyan);font-style:normal;font-size:24px;font-weight:800}
    .moon-action b{display:block;padding:8px 4px 0;font-size:13px}
    .moon-action small{display:block;padding:0 4px 4px;color:#91aab6;font-size:10px;line-height:1.4}
    .moon-action.primary{border-color:#41dcc777;background:linear-gradient(145deg,#12423d,#0b2028)}
    .moon-action.warning i{border-color:#ff963f66;background:radial-gradient(circle,#57331f,#26170f);color:#ffad5f}
    .moon-action.warning{border-color:#ff963f55}
    .moon-menu-button{position:fixed;z-index:14;left:12px;top:12px;min-width:64px;height:44px;padding:6px 10px;border:1px solid #4ce6d0;border-radius:10px;background:#09242aee;color:#83fff0;box-shadow:0 8px 24px #0009;cursor:pointer}
    .moon-shell-open{overflow:hidden}
    @media(max-width:900px){
      .moon-shell{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) 58px}
      .moon-shell-nav{grid-column:1;grid-row:2;flex-direction:row;padding:4px;border-right:0;border-top:1px solid #1d4552}
      .moon-brand{display:none}
      .moon-tabs{display:flex;width:100%;padding:0;overflow-x:auto}
      .moon-tabs button{flex:1 0 48px;min-height:48px}
      .moon-shell-main{grid-column:1;grid-row:1;padding:74px 10px 16px}
      .moon-global{left:0;height:68px}
      .moon-global-status{grid-template-columns:repeat(3,1fr)}
      .moon-global-status span:nth-child(n+4){display:none}
      .moon-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
  `;
  document.head.append(style);

  const launcher = document.createElement("button");
  launcher.className = "moon-menu-button";
  launcher.innerHTML = "<b>☰ Menú</b>";
  launcher.setAttribute("aria-label", "Abrir ecosistema de interfaces del simulador");
  document.body.append(launcher);

  const shell = document.createElement("section");
  shell.className = "moon-shell";
  shell.hidden = true;
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.innerHTML = `
    <nav class="moon-shell-nav">
      <div class="moon-brand">
        <small>MOON GAMES</small>
        <b>Rutas 3D</b>
      </div>
      <div class="moon-tabs">
        ${TRANSPORT_INTERFACE_SECTIONS.map(s => `<button data-section="${s.id}"><i>${s.icon}</i><span>${s.label}</span></button>`).join("")}
      </div>
    </nav>
    <main class="moon-shell-main">
      <div class="moon-global">
        <div class="moon-global-status">
          <span><small>Piloto</small><b data-pilot>Piloto Leyenda</b></span>
          <span><small>Saldo</small><b data-money>0 €</b></span>
          <span><small>Nivel</small><b data-level>1</b></span>
          <span><small>Hora</small><b data-clock>14:35 · 24 May</b></span>
          <span><small>Clima</small><b data-weather>18 °C · Nublado</b></span>
          <span><small>Red</small><b data-network>42 ms · En línea</b></span>
        </div>
        <button class="moon-shell-close" aria-label="Cerrar">×</button>
      </div>
      <header class="moon-shell-head">
        <small data-eyebrow>ALFA</small>
        <div>
          <h1 data-title></h1>
          <p data-subtitle></p>
        </div>
      </header>
      <div class="moon-action-grid"></div>
    </main>
  `;
  document.body.append(shell);

  let active = "home", previousFocus = null;
  const grid = shell.querySelector(".moon-action-grid");

  function close() {
    shell.hidden = true;
    document.body.classList.remove("moon-shell-open");
    previousFocus?.focus?.();
  }

  function activate(action) {
    if (action.close) return close();
    const target = document.getElementById(action.target);
    if (!target) return;
    close();
    target.focus?.();
    target.click?.();
  }

  function render(section = active) {
    active = section;
    const meta = TRANSPORT_INTERFACE_SECTIONS.find(s => s.id === section) || TRANSPORT_INTERFACE_SECTIONS[0];
    const state = career?.snapshot;
    shell.querySelector("[data-title]").textContent = meta.title;
    shell.querySelector("[data-subtitle]").textContent = meta.subtitle;
    shell.querySelector("[data-eyebrow]").textContent = meta.label.toUpperCase();
    shell.querySelector("[data-pilot]").textContent = state?.profile?.driverName || "Piloto Leyenda";
    shell.querySelector("[data-money]").textContent = money(state?.economy?.money);
    shell.querySelector("[data-level]").textContent = `${state?.progress?.level || 1} (${state?.progress?.xp || 0} XP)`;
    
    const d = new Date();
    shell.querySelector("[data-clock]").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} · En ruta`;
    shell.querySelector("[data-weather]").textContent = document.querySelector("#roadEvent")?.textContent?.slice(0, 18) || "Despejado · 19 °C";
    shell.querySelector("[data-network]").textContent = document.querySelector("#convoyState")?.textContent?.includes("ms") ? document.querySelector("#convoyState").textContent : "42 ms · Alfa";

    shell.querySelectorAll("[data-section]").forEach(b => b.classList.toggle("on", b.dataset.section === section));
    grid.replaceChildren(...TRANSPORT_INTERFACE_CARDS.filter(a => a.section === section).map(action => {
      const button = document.createElement("button");
      button.className = `moon-action ${action.tone || ""}`;
      button.innerHTML = `<i aria-hidden="true">${action.icon}</i><b>${action.title}</b><small>${action.description}</small>`;
      button.onclick = () => activate(action);
      return button;
    }));
  }

  function open(section = "home") {
    previousFocus = document.activeElement;
    render(section);
    shell.hidden = false;
    document.body.classList.add("moon-shell-open");
    shell.querySelector(".moon-shell-close")?.focus();
  }

  launcher.onclick = () => open();
  shell.querySelector(".moon-shell-close").onclick = close;
  shell.querySelectorAll("[data-section]").forEach(b => b.onclick = () => render(b.dataset.section));
  addEventListener("keydown", e => {
    if (e.key === "Escape" && !shell.hidden) close();
  });
  const unsubscribe = career?.subscribe?.(() => {
    if (!shell.hidden) render();
  });

  return {
    open,
    close,
    render,
    dispose() {
      unsubscribe?.();
      launcher.remove();
      shell.remove();
      style.remove();
      document.body.classList.remove("moon-shell-open");
    }
  };
}

export default createTransportUiShell;
