/**
 * Sistema de Convoy y Radio CB para Rutas Moon (Canal Alfa).
 * Permite comunicación diegética entre camiones en ruta, telemetría
 * de compañeros de convoy y control de frecuencias de radio CB.
 */

export const CB_CHANNELS = Object.freeze([
  { channel: 19, freq: "27.185 MHz", label: "Canal 19 · Carretera general", description: "Canal estándar de comunicación entre transportistas." },
  { channel: 9,  freq: "27.065 MHz", label: "Canal 9 · Emergencias y auxilio", description: "Frecuencia prioritaria para incidencias y rescate." },
  { channel: 1,  freq: "26.965 MHz", label: "Canal 1 · Logística y convoy", description: "Coordinación interna de rutas y entregas compartidas." },
  { channel: 11, freq: "27.085 MHz", label: "Canal 11 · Enlace de flota", description: "Comunicaciones privadas de empresa y telemetría." }
]);

export const CB_QUICK_MESSAGES = Object.freeze([
  { id: "overtaking",   label: "Adelantando",        text: "Adelantando por la izquierda, mantén distancia." },
  { id: "hazard_ahead", label: "Peligro en ruta",    text: "Atasco o peligro más adelante, reduce velocidad." },
  { id: "fuel_stop",    label: "Parada gasolinera",  text: "Haciendo parada técnica en la próxima estación de servicio." },
  { id: "grouped",      label: "Convoy agrupado",    text: "Convoy agrupado y en formación. Manteniendo velocidad." },
  { id: "slow_down",    label: "Frenada brusca",     text: "Reduciendo marcha por visibilidad o tráfico denso." },
  { id: "clear_road",   label: "Vía despejada",      text: "Carretera despejada, vía libre para avanzar." }
]);

export function createConvoyRadioSystem({ defaultChannel = 19, storage = globalThis.localStorage } = {}) {
  let activeChannel = CB_CHANNELS.find(c => c.channel === defaultChannel) || CB_CHANNELS[0];
  const listeners = new Set();
  const history = [];

  const setChannel = channelNumber => {
    const found = CB_CHANNELS.find(c => c.channel === Number(channelNumber));
    if (found) {
      activeChannel = found;
      emit({ type: "channel_change", channel: activeChannel.channel, label: activeChannel.label, freq: activeChannel.freq });
    }
    return activeChannel;
  };

  const broadcast = (messageId, { senderName = "Conductor", extraText = "" } = {}) => {
    const quick = CB_QUICK_MESSAGES.find(m => m.id === messageId);
    const text = quick ? quick.text : String(extraText || messageId);
    const packet = {
      id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channel: activeChannel.channel,
      freq: activeChannel.freq,
      sender: senderName,
      text,
      timestamp: Date.now()
    };
    history.push(packet);
    if (history.length > 50) history.shift();
    emit({ type: "message", ...packet });
    return packet;
  };

  const emit = event => {
    listeners.forEach(fn => {
      try { fn(event); } catch {}
    });
  };

  const onMessage = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return {
    get currentChannel() { return activeChannel; },
    get history() { return [...history]; },
    setChannel,
    broadcast,
    onMessage
  };
}

export function createConvoyPanel({ convoy = globalThis.MoonConvoy, radio = null, eventLog = null } = {}) {
  if (!globalThis.document) return null;
  const radioSystem = radio || createConvoyRadioSystem();
  
  const style = document.createElement("style");
  style.id = "moon-convoy-panel-style";
  style.textContent = `
    .convoy-panel{position:fixed;z-index:70;right:14px;top:74px;width:min(440px,calc(100vw - 28px));max-height:calc(100vh - 120px);padding:14px;border:1px solid #295b6a;border-radius:18px;background:linear-gradient(145deg,#071822fa,#0d2734f6);color:#effdff;box-shadow:0 24px 70px #000c;backdrop-filter:blur(20px);overflow:auto}
    .convoy-panel[hidden]{display:none}
    .convoy-panel header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #234855}
    .convoy-panel header h3{margin:0;font-size:16px;letter-spacing:-.02em}
    .convoy-room-bar{display:flex;gap:7px;margin:12px 0}
    .convoy-room-bar input{flex:1;padding:8px 11px;border:1px solid #234b58;border-radius:9px;background:#05131c;color:#fff;font:inherit;font-size:12px}
    .convoy-room-bar button{padding:8px 14px;border:1px solid #4de4d3;border-radius:9px;background:#13433e;color:#78fbe9;font-weight:700;cursor:pointer}
    .convoy-drivers{display:grid;gap:6px;margin:12px 0}
    .convoy-driver-card{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;padding:9px 12px;border:1px solid #1c3c48;border-radius:11px;background:#091e2a}
    .convoy-driver-card.you{border-color:#48decb88;background:linear-gradient(90deg,#0f3439,#0b232e)}
    .convoy-driver-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:8px;background:#153744;color:#55ead9;font-size:16px}
    .convoy-driver-meta b{display:block;font-size:12px}.convoy-driver-meta small{color:#8da9b5;font-size:10px}
    .convoy-driver-speed{font-weight:800;color:#55ead9;font-size:12px}
    .convoy-radio-deck{margin-top:14px;padding-top:12px;border-top:1px solid #234855}
    .convoy-radio-deck small{color:#ff9e3b;font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:9px}
    .convoy-channel-select{width:100%;margin:6px 0 10px;padding:8px;border:1px solid #285462;border-radius:9px;background:#06141d;color:#eafaff;font:inherit;font-size:11px}
    .convoy-quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
    .convoy-quick-grid button{padding:8px 6px;text-align:left;border:1px solid #1f424f;border-radius:8px;background:#0c222e;color:#d5e8ed;font-size:10px;cursor:pointer}
    .convoy-quick-grid button:hover{border-color:#55ead9;background:#12353f;color:#fff}
    .convoy-radio-log{max-height:110px;overflow-y:auto;margin-top:10px;padding:8px;border:1px solid #1a3843;border-radius:8px;background:#040d13;font-size:10px;line-height:1.4}
    .convoy-radio-log p{margin:3px 0;color:#b2ccd4}.convoy-radio-log p b{color:#55ead9}
  `;
  if (!document.getElementById(style.id)) document.head.append(style);

  const panel = document.createElement("aside");
  panel.className = "convoy-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <header>
      <div><small style="color:#55ead9;font-weight:800;letter-spacing:.12em">MOON CONVOY · ALFA</small><h3>Convoy y Radio CB</h3></div>
      <button data-close style="border:0;background:transparent;color:#91abb6;font-size:20px;cursor:pointer">×</button>
    </header>
    <div class="convoy-room-bar">
      <input id="convoyRoomInput" placeholder="Código de sala (ej. RUTA-19)" />
      <button id="convoyJoinBtn">Unirse</button>
    </div>
    <div class="convoy-drivers" id="convoyDriversList"></div>
    <section class="convoy-radio-deck">
      <small>Emisora Radio CB</small>
      <select class="convoy-channel-select" id="convoyChannelSelect">
        ${CB_CHANNELS.map(c => `<option value="${c.channel}" ${c.channel === radioSystem.currentChannel.channel ? "selected" : ""}>${c.label} (${c.freq})</option>`).join("")}
      </select>
      <div class="convoy-quick-grid">
        ${CB_QUICK_MESSAGES.map(m => `<button data-cb-msg="${m.id}">📻 ${m.label}</button>`).join("")}
      </div>
      <div class="convoy-radio-log" id="convoyRadioLog">
        <p style="color:#6d8c97">Emisora en espera · Canal ${radioSystem.currentChannel.channel}</p>
      </div>
    </section>
  `;
  document.body.append(panel);

  const roomInput = panel.querySelector("#convoyRoomInput");
  const joinBtn = panel.querySelector("#convoyJoinBtn");
  const driversList = panel.querySelector("#convoyDriversList");
  const channelSelect = panel.querySelector("#convoyChannelSelect");
  const radioLog = panel.querySelector("#convoyRadioLog");

  const appendRadioLog = msg => {
    const p = document.createElement("p");
    p.innerHTML = `<b>[CH ${msg.channel}] ${msg.sender}:</b> ${msg.text}`;
    radioLog.prepend(p);
  };

  radioSystem.onMessage(msg => {
    if (msg.type === "message") appendRadioLog(msg);
  });

  channelSelect.onchange = () => {
    const ch = radioSystem.setChannel(channelSelect.value);
    const p = document.createElement("p");
    p.style.color = "#ffb049";
    p.textContent = `Sintonizado ${ch.label} (${ch.freq})`;
    radioLog.prepend(p);
  };

  panel.querySelectorAll("[data-cb-msg]").forEach(btn => {
    btn.onclick = () => {
      const msg = radioSystem.broadcast(btn.dataset.cbMsg, { senderName: "Tú (Aster 3D)" });
      eventLog?.record?.("operations", "convoy:radio_broadcast", { messageId: btn.dataset.cbMsg, channel: msg.channel });
    };
  });

  const renderDrivers = (state = convoy?.state) => {
    if (!state) return;
    roomInput.value = state.room || "";
    const players = state.players || [];
    const ai = state.ai || [];
    const all = [...players, ...ai];
    
    if (!all.length) {
      driversList.innerHTML = '<div style="padding:12px;text-align:center;color:#7897a3;font-size:11px">Sin compañeros en la frecuencia. Pulsa "Unirse" para entrar a una sala.</div>';
      return;
    }

    driversList.innerHTML = all.map(d => {
      const isYou = d.id === state.you;
      const isAi = Boolean(d.ai);
      const icon = d.vehicle === "helicopter" ? "🚁" : d.vehicle === "ship" ? "🚢" : "🚛";
      return `
        <div class="convoy-driver-card ${isYou ? "you" : ""}">
          <div class="convoy-driver-icon">${icon}</div>
          <div class="convoy-driver-meta">
            <b>${d.name || (isAi ? "Compañero IA" : "Conductor")} ${isYou ? "(Tú)" : ""}</b>
            <small>${d.cargo || "En tránsito"} · ${isAi ? "Ruta automatizada" : "Conexión en vivo"}</small>
          </div>
          <div class="convoy-driver-speed">${Math.round(d.speed || 0)} km/h</div>
        </div>
      `;
    }).join("");
  };

  joinBtn.onclick = () => {
    const room = roomInput.value.trim();
    convoy?.join?.(room);
    eventLog?.record?.("operations", "convoy:room_joined", { room });
  };

  convoy?.onChange?.(state => {
    renderDrivers(state);
  });

  panel.querySelector("[data-close]").onclick = () => {
    panel.hidden = true;
  };

  const open = () => {
    panel.hidden = false;
    renderDrivers();
  };

  const close = () => {
    panel.hidden = true;
  };

  return { open, close, panel, radioSystem, renderDrivers };
}

export default { CB_CHANNELS, CB_QUICK_MESSAGES, createConvoyRadioSystem, createConvoyPanel };
