/**
 * Panel de Botones del Vehículo, Salpicadero y Controles Táctiles (Canal Alfa).
 * Basado fielmente en el diseño de cabina de la página 021 de Canva.
 */

export const DASHBOARD_BUTTONS = Object.freeze([
  { id: "engine",        icon: "⭕", label: "Motor",             desc: "Start / Stop del motor diésel", key: "I", row: 1 },
  { id: "lights",        icon: "💡", label: "Luces",             desc: "Cruce y carretera",             key: "L", row: 1 },
  { id: "indicators",    icon: "↔️", label: "Indicadores",       desc: "Intermitentes de giro",         key: "Q/E", row: 1 },
  { id: "wipers",        icon: "🌧️", label: "Limpiaparabrisas", desc: "Barrido continuo e intermitente", key: "G", row: 1 },
  { id: "parking_brake", icon: "🅿️", label: "Freno de mano",    desc: "Freno de estacionamiento",      key: "Space", row: 1 },
  { id: "retarder",      icon: "⚙️", label: "Retarder",          desc: "Freno hidráulico continuo",     key: "R", row: 1 },
  
  { id: "horn",          icon: "📯", label: "Bocina",            desc: "Claxon de advertencia",         key: "H", row: 2 },
  { id: "hazards",       icon: "⚠️", label: "Emergencia",        desc: "Warning 4 intermitentes",       key: "J", row: 2 },
  { id: "cam_1",         icon: "1️⃣", label: "Cámara 1",         desc: "Cabina conductor",             key: "1", row: 2 },
  { id: "cam_2",         icon: "2️⃣", label: "Cámara 2",         desc: "Exterior seguimiento",         key: "2", row: 2 },
  { id: "cam_3",         icon: "3️⃣", label: "Cámara 3",         desc: "Vista cenital / superior",     key: "3", row: 2 },
  { id: "cam_4",         icon: "4️⃣", label: "Cámara 4",         desc: "Paragolpes delantero",         key: "4", row: 2 },
  { id: "cam_5",         icon: "5️⃣", label: "Cámara 5",         desc: "Rueda y lateral",              key: "5", row: 2 },

  { id: "cam_6",         icon: "6️⃣", label: "Cámara 6",         desc: "Retrovisor derecho",           key: "6", row: 3 },
  { id: "cam_7",         icon: "7️⃣", label: "Cámara 7",         desc: "Vista cinemática",             key: "7", row: 3 },
  { id: "cam_8",         icon: "8️⃣", label: "Cámara 8",         desc: "Vista drone libre",            key: "8", row: 3 },
  { id: "cam_9",         icon: "9️⃣", label: "Cámara 9",         desc: "Órbita libre",                 key: "9", row: 3 },
  { id: "map",           icon: "🗺️", label: "Mapa M",           desc: "Abrir navegador y GPS",        key: "M", row: 3 }
]);

export function calculateRpmFromSpeed(speedKmh = 0, gear = 1) {
  if (speedKmh <= 0.1) return 650; // Ralentí diésel estándar
  const effectiveGear = Math.max(1, Math.min(12, Number(gear) || 1));
  const gearRatios = [14.2, 11.4, 9.1, 7.3, 5.8, 4.6, 3.7, 2.9, 2.3, 1.8, 1.4, 1.0];
  const ratio = gearRatios[effectiveGear - 1];
  const wheelCircumference = 3.18; // Neumático 315/80 R22.5
  const wheelRpm = (speedKmh * 1000 / 60) / wheelCircumference;
  const rawEngineRpm = wheelRpm * (ratio * 0.48);
  return Math.round(Math.max(650, Math.min(2400, rawEngineRpm + 650)));
}

export function createVehicleDashboardSystem({ onStateChange = null } = {}) {
  const state = {
    engineRunning: false,
    lightsOn: false,
    wipersOn: false,
    parkingBrake: true,
    retarderLevel: 0,
    hazardsOn: false,
    turnLeft: false,
    turnRight: false,
    gear: "N",
    speedKmh: 0,
    rpm: 650,
    fuelPercent: 63,
    damagePercent: 32,
    cameraIndex: 1
  };

  const listeners = new Set();
  if (typeof onStateChange === "function") listeners.add(onStateChange);

  const emit = () => {
    state.rpm = state.engineRunning ? calculateRpmFromSpeed(state.speedKmh, state.gear === "D" ? 8 : 1) : 0;
    const snap = { ...state };
    listeners.forEach(fn => {
      try { fn(snap); } catch {}
    });
  };

  const toggleButton = buttonId => {
    switch (buttonId) {
      case "engine":
        state.engineRunning = !state.engineRunning;
        break;
      case "lights":
        state.lightsOn = !state.lightsOn;
        break;
      case "wipers":
        state.wipersOn = !state.wipersOn;
        break;
      case "parking_brake":
        state.parkingBrake = !state.parkingBrake;
        break;
      case "retarder":
        state.retarderLevel = (state.retarderLevel + 1) % 4;
        break;
      case "hazards":
        state.hazardsOn = !state.hazardsOn;
        break;
      case "map":
        break;
      default:
        if (buttonId.startsWith("cam_")) {
          state.cameraIndex = Number(buttonId.replace("cam_", "")) || 1;
        }
        break;
    }
    emit();
    return { ...state };
  };

  const setGear = gearValue => {
    if (["G", "D", "N", "R"].includes(gearValue)) {
      state.gear = gearValue;
      emit();
    }
  };

  const updateTelemetry = ({ speedKmh = state.speedKmh, fuelPercent = state.fuelPercent, damagePercent = state.damagePercent } = {}) => {
    state.speedKmh = Math.max(0, speedKmh);
    state.fuelPercent = Math.max(0, Math.min(100, fuelPercent));
    state.damagePercent = Math.max(0, Math.min(100, damagePercent));
    emit();
  };

  return {
    get state() { return { ...state }; },
    toggleButton,
    setGear,
    updateTelemetry,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

export function mountCockpitBoardUI({ parent = document.body, dashboard = null, onAction = null } = {}) {
  if (!globalThis.document) return null;
  const dash = dashboard || createVehicleDashboardSystem();

  const board = document.createElement("aside");
  board.className = "cockpit-tablero-panel";
  board.id = "cockpitTableroPanel";
  board.hidden = true;

  const style = document.createElement("style");
  style.id = "cockpit-tablero-style";
  style.textContent = `
    .cockpit-tablero-panel{position:fixed;z-index:65;right:16px;bottom:78px;width:min(460px,calc(100vw - 32px));padding:14px;border:2px solid #234d5c;border-radius:18px;background:linear-gradient(145deg,#06141df5,#0a212df8);box-shadow:0 20px 60px #000d;color:#effaff;backdrop-filter:blur(18px)}
    .cockpit-tablero-panel[hidden]{display:none}
    .cockpit-tablero-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1c4250}
    .cockpit-tablero-panel header b{color:#55ead9;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
    .cockpit-grid-row{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:6px}
    .cockpit-board-btn{display:grid;grid-template-rows:28px 1fr;justify-items:center;align-items:center;padding:8px 4px;border:1px solid #1a3e4c;border-radius:10px;background:#081b25;color:#d8ecf2;cursor:pointer;transition:.12s ease}
    .cockpit-board-btn:hover{border-color:#55ead9;background:#0d2c38;color:#fff}
    .cockpit-board-btn.active{border-color:#ff963f;background:radial-gradient(circle,#3a2014,#142c33);color:#ffaa55;box-shadow:0 0 14px #ff963f44}
    .cockpit-board-btn i{font-style:normal;font-size:18px}
    .cockpit-board-btn span{font-size:9px;font-weight:700;margin-top:2px;text-align:center;line-height:1.1}
  `;
  if (!document.getElementById(style.id)) document.head.append(style);

  board.innerHTML = `
    <header>
      <b>Panel de Botones del Vehículo (Tablero)</b>
      <button data-close style="border:0;background:transparent;color:#91abb6;font-size:18px;cursor:pointer">×</button>
    </header>
    <div class="cockpit-grid-row" data-row="1"></div>
    <div class="cockpit-grid-row" data-row="2"></div>
    <div class="cockpit-grid-row" data-row="3"></div>
  `;
  parent.append(board);

  const row1 = board.querySelector('[data-row="1"]');
  const row2 = board.querySelector('[data-row="2"]');
  const row3 = board.querySelector('[data-row="3"]');

  DASHBOARD_BUTTONS.forEach(btn => {
    const el = document.createElement("button");
    el.className = "cockpit-board-btn";
    el.dataset.boardId = btn.id;
    el.title = `${btn.desc} [${btn.key}]`;
    el.innerHTML = `<i>${btn.icon}</i><span>${btn.label}</span>`;
    el.onclick = () => {
      dash.toggleButton(btn.id);
      onAction?.(btn.id);
    };
    if (btn.row === 1) row1.append(el);
    else if (btn.row === 2) row2.append(el);
    else row3.append(el);
  });

  const renderActiveStates = state => {
    board.querySelectorAll(".cockpit-board-btn").forEach(b => {
      const id = b.dataset.boardId;
      const isActive =
        (id === "engine" && state.engineRunning) ||
        (id === "lights" && state.lightsOn) ||
        (id === "wipers" && state.wipersOn) ||
        (id === "parking_brake" && state.parkingBrake) ||
        (id === "retarder" && state.retarderLevel > 0) ||
        (id === "hazards" && state.hazardsOn) ||
        (id === `cam_${state.cameraIndex}`);
      b.classList.toggle("active", Boolean(isActive));
    });
  };

  dash.subscribe(renderActiveStates);
  board.querySelector("[data-close]").onclick = () => { board.hidden = true; };

  return {
    board,
    open() { board.hidden = false; renderActiveStates(dash.state); },
    close() { board.hidden = true; },
    dashboard: dash
  };
}

export default { DASHBOARD_BUTTONS, calculateRpmFromSpeed, createVehicleDashboardSystem, mountCockpitBoardUI };
