import { STORY_TRUCK_ORIGINS, transportStoryOrigins, BOX_07A_SPEC, PERSISTENT_DECISION_MAP, WORKSHOP_DIAGNOSTIC_SPEC } from "./transport-story-campaign.js";

export const STORY_STORAGE_KEY = "moon.transport.story.v1";

const copy = value => JSON.parse(JSON.stringify(value));
const initialState = () => ({ version: 1, origin: null, choices: {}, variables: {}, intro: { sceneId:null, completed:false, skipped:false }, startedAt: null, updatedAt: null });

function mergeEffects(target, effects = {}) {
  for (const [key, value] of Object.entries(effects)) {
    target[key] = typeof value === "number" ? (Number(target[key]) || 0) + value : value;
  }
}

function normalize(raw) {
  const state = raw && typeof raw === "object" ? raw : initialState();
  const origin = STORY_TRUCK_ORIGINS[state.origin] ? state.origin : null;
  return {
    ...initialState(), ...state, origin,
    choices: state.choices && typeof state.choices === "object" ? state.choices : {},
    variables: state.variables && typeof state.variables === "object" ? state.variables : {},
    intro: state.intro && typeof state.intro === "object" ? { sceneId:null, completed:false, skipped:false, ...state.intro } : { sceneId:null, completed:false, skipped:false },
  };
}

export function createStoryRuntime({ storage = globalThis.localStorage ?? null, storageKey = STORY_STORAGE_KEY } = {}) {
  const listeners = new Set();
  let parsed = null;
  try { parsed = JSON.parse(storage?.getItem(storageKey) || "null"); } catch {}
  let state = normalize(parsed);
  const persist = () => { try { storage?.setItem(storageKey, JSON.stringify(state)); } catch {} };
  const emit = (type, detail) => {
    const event = { type, detail: copy(detail), state: copy(state) };
    listeners.forEach(listener => listener(event)); persist(); return event;
  };
  return {
    get snapshot() { return copy(state); },
    get origin() { return state.origin ? copy(STORY_TRUCK_ORIGINS[state.origin]) : null; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    selectOrigin(originId) {
      const origin = STORY_TRUCK_ORIGINS[originId];
      if (!origin) throw new Error("Origen de campaña desconocido");
      state = { ...initialState(), origin: originId, startedAt: Date.now(), updatedAt: Date.now(), variables: { truckOrigin: originId, debt: origin.startingDebt } };
      // Aurora's shared prologue contains an earlier truck picker; selecting the
      // campaign already resolves it, so the panel can continue to the route choice.
      if (originId === "aurora") state.choices["truck-origin"] = "aurora";
      return emit("story:origin_selected", { originId, title: transportStoryOrigins[originId].title, debt: origin.startingDebt });
    },
    choose(sceneId, choiceId) {
      if (!state.origin) throw new Error("Elige primero una campaña");
      const scenes = transportStoryOrigins[state.origin]?.chapter?.scenes || [];
      const scene = scenes.find(item => item.id === sceneId);
      const choice = scene?.choices?.find(item => item.id === choiceId);
      if (!choice) throw new Error("Decisión no disponible para esta campaña");
      state.choices[sceneId] = choiceId;
      mergeEffects(state.variables, choice.effects);
      state.updatedAt = Date.now();
      return emit("story:choice_made", { originId: state.origin, sceneId, choiceId, label: choice.label, effects: choice.effects || {}, next: choice.next || null });
    },
    updateIntro(sceneId) {
      if (!state.origin) throw new Error("Elige primero una campaña");
      state.intro = { sceneId:String(sceneId || ""), completed:false, skipped:false }; state.updatedAt = Date.now();
      return emit("story:intro_scene", { originId:state.origin, sceneId:state.intro.sceneId });
    },
    completeIntro({ skipped = false } = {}) {
      if (!state.origin) throw new Error("Elige primero una campaña");
      state.intro = { ...state.intro, completed:true, skipped:Boolean(skipped) }; state.updatedAt = Date.now();
      return emit(skipped ? "story:intro_skipped" : "story:intro_completed", { originId:state.origin, sceneId:state.intro.sceneId });
    },
    repairTruck(choiceId) {
      const choice = WORKSHOP_DIAGNOSTIC_SPEC.repairChoices.find(c => c.id === choiceId);
      if (!choice) throw new Error("Opción de reparación no válida");
      state.workshopDiagnostic = { choiceId, appliedAt: Date.now(), ...choice.effects };
      mergeEffects(state.variables, choice.effects);
      state.updatedAt = Date.now();
      return emit("story:diagnostic_repaired", { choiceId, label: choice.label, effects: choice.effects });
    },
    selectBoxHypothesis(hypothesisId) {
      const hypothesis = BOX_07A_SPEC.hypotheses.find(h => h.id === hypothesisId);
      if (!hypothesis) throw new Error("Hipótesis de Caja 07-A no válida");
      state.box07a = { hypothesisId, selectedAt: Date.now(), label: hypothesis.label };
      if (hypothesis.ethicsBonus) mergeEffects(state.variables, { ethicsBonus: hypothesis.ethicsBonus });
      if (hypothesis.techBonus) mergeEffects(state.variables, { techBonus: hypothesis.techBonus });
      if (hypothesis.intelBonus) mergeEffects(state.variables, { intelBonus: hypothesis.intelBonus });
      state.updatedAt = Date.now();
      return emit("story:box07a_selected", { hypothesisId, label: hypothesis.label });
    },
    reset() { state = initialState(); return emit("story:reset", {}); },
  };
}

export function createStoryPanel({ runtime, controls, eventLog, introPlayer } = {}) {
  if (!runtime || !globalThis.document) return null;
  const button = document.createElement("button"); button.id = "storyButton"; button.textContent = "Historia"; controls?.append(button);
  const panel = document.createElement("aside"); panel.className = "mission-panel story-panel"; panel.hidden = true; document.body.append(panel);
  
  let currentTab = "campaign";

  const render = () => {
    const state = runtime.snapshot;
    const origin = runtime.origin;
    
    let contentHtml = "";
    if (currentTab === "campaign") {
      if (!state.origin) {
        contentHtml = `<p>Cada campaña conserva sus decisiones y abre una carrera diferente.</p><div class="story-options">${Object.values(STORY_TRUCK_ORIGINS).map(orig => `<button data-origin="${orig.id}"><b>${orig.name}</b><small>${transportStoryOrigins[orig.id].title}</small></button>`).join("")}</div>`;
      } else {
        const chapter = transportStoryOrigins[state.origin].chapter;
        const pending = (chapter.scenes || []).find(scene => scene.choices?.length && !state.choices[scene.id]);
        contentHtml = `${pending ? `<p>${pending.prompt}</p><div class="story-options">${pending.choices.map(choice => `<button data-scene="${pending.id}" data-choice="${choice.id}"><b>${choice.label}</b></button>`).join("")}</div>` : `<p>Prólogo configurado. Tus decisiones quedan activas durante la conducción.</p><ol class="mission-objectives">${Object.entries(state.choices).map(([scene, choice]) => `<li class="done">${scene}: ${choice}</li>`).join("")}</ol>`}<footer><button data-reset>Cambiar campaña</button></footer>`;
      }
    } else if (currentTab === "diagnostic") {
      const diag = WORKSHOP_DIAGNOSTIC_SPEC;
      const applied = state.workshopDiagnostic;
      contentHtml = `
        <div style="background:#06141d;padding:10px;border-radius:10px;border:1px solid #1a424e;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;color:#ff9838;font-size:11px;font-weight:800">
            <span>TEMP: ${diag.initialState.temperatureC} °C</span><span>PRESIÓN: ${diag.initialState.oilPressureBar} bar</span><span>FALLA: ${diag.initialState.electricFault}</span>
          </div>
        </div>
        <p style="font-size:11px;color:#91abb6;margin:4px 0 8px">Inspección de taller:</p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-bottom:10px">
          ${diag.inspections.map(i => `<div style="padding:6px 8px;border-radius:7px;background:#0a1e28;font-size:10px;color:#eaf6f7">⚠️ ${i.label}</div>`).join("")}
        </div>
        ${applied ? `<div style="padding:10px;border-radius:8px;background:#103932;color:#67fadc;font-size:11px">✅ Reparación completada: <b>${applied.choiceId}</b> (${applied.reliabilityStars} estrellas de fiabilidad)</div>` : `
        <p style="font-size:11px;color:#91abb6;margin:4px 0 8px">¿Qué quieres hacer?</p>
        <div class="story-options">
          ${diag.repairChoices.map(c => `<button data-diag-choice="${c.id}"><b>${c.label}</b><small>${c.desc} (${c.effects.timeCostMin} min · ${c.effects.moneyCost} €)</small></button>`).join("")}
        </div>`}
      `;
    } else if (currentTab === "box07a") {
      const box = BOX_07A_SPEC;
      const selected = state.box07a;
      contentHtml = `
        <div style="background:#06141d;padding:10px;border-radius:10px;border:1px solid #ff9d3a44;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;color:#ff9e3b;font-size:11px;font-weight:800">
            <span>CAJA ${box.code}</span><span>${box.sealStatus}</span>
          </div>
          <p style="font-size:10px;color:#cadbe0;margin:6px 0 0"><i>"${box.auroraNote}"</i></p>
        </div>
        ${selected ? `<div style="padding:10px;border-radius:8px;background:#103932;color:#67fadc;font-size:11px">✅ Hipótesis seleccionada: <b>${selected.label}</b></div>` : `
        <p style="font-size:11px;color:#91abb6;margin:4px 0 8px">Tres posibles cargas:</p>
        <div class="story-options">
          ${box.hypotheses.map(h => `<button data-box-hypo="${h.id}"><b>[${h.icon}] ${h.label}</b><small>${h.items.join(" · ")}</small></button>`).join("")}
        </div>`}
      `;
    } else if (currentTab === "decisions") {
      const map = PERSISTENT_DECISION_MAP;
      contentHtml = `
        <p style="font-size:11px;color:#91abb6;margin:0 0 8px">Consecuencias de ruta hacia Puerto Alba:</p>
        <div style="display:grid;gap:8px">
          ${map.decisions.map(d => `
            <div style="padding:8px 10px;border-radius:9px;background:#091e29;border:1px solid #1a3e4c">
              <b style="font-size:11px;color:#55ead9">${d.step}. ${d.title}</b>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
                ${d.options.map(o => `<div style="padding:6px;border-radius:6px;background:#05121a;font-size:9px;color:#b5cbd2"><b>${o.label}</b><br><small style="color:#7898a3">${o.desc}</small></div>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    panel.innerHTML = `
      <header>
        <div><small>RUTAS DEL CONTINENTE · ALFA</small><h3>${currentTab === "campaign" ? "Campaña y Decisiones" : currentTab === "diagnostic" ? "Diagnóstico de Taller" : currentTab === "box07a" ? "Caja 07-A" : "Mapa de Decisiones"}</h3></div>
        <button data-close style="border:0;background:transparent;color:#91abb6;font-size:20px;cursor:pointer">×</button>
      </header>
      <div class="story-tabs" style="display:flex;gap:4px;margin:10px 0 12px;border-bottom:1px solid #1c3c48;padding-bottom:8px">
        <button data-tab="campaign" class="${currentTab === "campaign" ? "on" : ""}" style="flex:1;padding:6px 4px;font-size:10px;border-radius:7px;background:${currentTab === "campaign" ? "#123b36" : "#081a24"};color:${currentTab === "campaign" ? "#55ead9" : "#8aa6b2"};border:1px solid ${currentTab === "campaign" ? "#3ddac7" : "#1c3c48"}">Campaña</button>
        <button data-tab="diagnostic" class="${currentTab === "diagnostic" ? "on" : ""}" style="flex:1;padding:6px 4px;font-size:10px;border-radius:7px;background:${currentTab === "diagnostic" ? "#123b36" : "#081a24"};color:${currentTab === "diagnostic" ? "#55ead9" : "#8aa6b2"};border:1px solid ${currentTab === "diagnostic" ? "#3ddac7" : "#1c3c48"}">Taller</button>
        <button data-tab="box07a" class="${currentTab === "box07a" ? "on" : ""}" style="flex:1;padding:6px 4px;font-size:10px;border-radius:7px;background:${currentTab === "box07a" ? "#123b36" : "#081a24"};color:${currentTab === "box07a" ? "#55ead9" : "#8aa6b2"};border:1px solid ${currentTab === "box07a" ? "#3ddac7" : "#1c3c48"}">Caja 07-A</button>
        <button data-tab="decisions" class="${currentTab === "decisions" ? "on" : ""}" style="flex:1;padding:6px 4px;font-size:10px;border-radius:7px;background:${currentTab === "decisions" ? "#123b36" : "#081a24"};color:${currentTab === "decisions" ? "#55ead9" : "#8aa6b2"};border:1px solid ${currentTab === "decisions" ? "#3ddac7" : "#1c3c48"}">Mapa</button>
      </div>
      ${contentHtml}
    `;

    panel.querySelector("[data-close]").onclick = () => { panel.hidden = true; button.classList.remove("on"); };
    panel.querySelectorAll("[data-tab]").forEach(tabBtn => {
      tabBtn.onclick = () => { currentTab = tabBtn.dataset.tab; render(); };
    });
    panel.querySelectorAll("[data-origin]").forEach(item => {
      item.onclick = () => { runtime.selectOrigin(item.dataset.origin); render(); panel.hidden = true; button.classList.remove("on"); introPlayer?.play(); };
    });
    panel.querySelectorAll("[data-choice]").forEach(item => {
      item.onclick = () => { runtime.choose(item.dataset.scene, item.dataset.choice); render(); };
    });
    panel.querySelectorAll("[data-diag-choice]").forEach(item => {
      item.onclick = () => { runtime.repairTruck(item.dataset.diagChoice); render(); };
    });
    panel.querySelectorAll("[data-box-hypo]").forEach(item => {
      item.onclick = () => { runtime.selectBoxHypothesis(item.dataset.boxHypo); render(); };
    });
    const reset = panel.querySelector("[data-reset]");
    if (reset) reset.onclick = () => { runtime.reset(); render(); };
  };

  const style = document.createElement("style");
  style.textContent = `
    .story-panel{inset:72px auto auto 14px;max-width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 100px);overflow-y:auto}
    .story-options{display:grid;gap:8px}
    .story-options button{text-align:left;border:1px solid #234d5b;border-radius:9px;background:#0a2029;color:#e8f7f9;padding:9px 12px;cursor:pointer}
    .story-options button:hover{border-color:#55ead9;background:#10323a}
    .story-options button b,.story-options button small{display:block}
    .story-options button small{margin-top:3px;color:#8fb0ba;font-size:10px}
  `;
  document.head.append(style);
  
  button.onclick = () => { panel.hidden = !panel.hidden; button.classList.toggle("on", !panel.hidden); render(); };
  runtime.subscribe(event => eventLog?.record("career", event.type, event.detail));
  render();
  return { button, panel, render };
}

export default createStoryRuntime;

