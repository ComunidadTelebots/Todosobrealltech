const freeze = value => Object.freeze(value);

export const TRANSPORT_STORY_VERSION = "0.1.0";

export const transportStoryCampaign = freeze({
  id: "aurora-legacy",
  title: "El camino de vuelta",
  logline: "Tras años lejos de casa, el jugador restaura Aurora, el viejo camión familiar, y decide si vuelve a ver a sus abuelos o construye primero su propia ruta por Europa.",
  variables: { truckOrigin: null, trustMara: 0, trustIvo: 0, trustNadir: 0, familyBond: 0, independence: 0, evidence: 0, debt: 42000 },
  chapters: [
    {
      id: "prologue",
      title: "La ruta de los abuelos",
      location: "Nova Liria · Taller 17",
      weather: "storm",
      time: "04:38",
      scenes: [
        { id: "rain-establishing", duration: 6, camera: { shot: "aerial", path: "garage-descent", lens: 28 }, audio: { ambience: "rain-heavy", music: "legacy-pulse-01" }, action: "La cámara desciende hasta un taller abierto bajo la tormenta.", caption: "NOVA LIRIA · 04:38" },
        { id: "truck-origin", duration: 12, camera: { shot: "interactive-dolly", target: "truckSelection", lens: 40 }, prompt: "¿Con qué historia quieres empezar?", choices: [
          { id: "aurora", label: "Aurora · clásico familiar", effects: { truckOrigin: "aurora", familyBond: 1, debt: -12000 }, next: "aurora-reveal" },
          { id: "frontier", label: "Frontier 88 · campaña del veterano", effects: { truckOrigin: "frontier", independence: 2, debt: 18000 }, next: "frontier-reveal" }
        ]},
        { id: "aurora-reveal", duration: 7, condition: "choice:aurora", camera: { shot: "dolly", target: "auroraClassic", lens: 40 }, audio: { sfx: ["starter-old", "metal-creak"] }, action: "Aurora despierta con pintura gastada, mecánica sencilla y el cuaderno del abuelo en la guantera." },
        { id: "frontier-reveal", duration: 7, condition: "choice:frontier", camera: { shot: "low-dolly", target: "frontier88", lens: 32 }, audio: { sfx: ["starter-heavy", "diesel-idle", "air-system"] }, action: "Frontier 88 despierta: morro largo, cabina dormitorio, pintura castigada y un motor que todavía exige respeto." },
        { id: "grandmother-call", duration: 12, camera: { shot: "cockpit", cameraPreset: 2, lens: 50 }, speaker: "Abuela Elena", dialogue: "Tu abuelo pregunta cada mañana si hoy se oirá Aurora subiendo la cuesta. Ven con calma; aquí te esperamos.", audio: { voice: "elena-prologue-01", radioFilter: true } },
        { id: "player-choice", duration: 10, camera: { shot: "interactive", cameraPreset: 1 }, prompt: "¿Qué quieres hacer con Aurora?", choices: [
          { id: "family", label: "Ir a ver a los abuelos", effects: { familyBond: 2 }, next: "family-departure" },
          { id: "work", label: "Trabajar durante el camino", effects: { familyBond: 1, independence: 1 }, next: "work-departure" },
          { id: "free", label: "Elegir mi propia ruta", effects: { independence: 2 }, next: "free-departure" }
        ]},
        { id: "family-departure", duration: 8, condition: "choice:family", camera: { shot: "chase", cameraPreset: 3 }, gameplay: { objective: "routeToGrandparents", destination: "Valleverde" }, dialogue: "El navegador marca la casa familiar. La visita pasa a ser la misión principal." },
        { id: "work-departure", duration: 8, condition: "choice:work", camera: { shot: "bumper", cameraPreset: 5 }, gameplay: { objective: "acceptRouteContracts", destination: "Valleverde", flexible: true }, dialogue: "Cada contrato puede acercarte a Valleverde o alejarte unos kilómetros más." },
        { id: "free-departure", duration: 8, condition: "choice:free", camera: { shot: "map", cameraPreset: 9 }, gameplay: { objective: "freeRoam", destination: null }, dialogue: "Europa queda abierta. La llamada de los abuelos seguirá disponible cuando decidas volver." }
      ]
    },
    {
      id: "chapter-1",
      title: "Las rutas rotas",
      acceptsOrigins: ["aurora", "frontier", "aster"],
      missions: [
        { id: "family-truck", title: "Despertar a Aurora", goal: "Reparar el camión familiar y recuperar sus recuerdos de ruta", unlocks: ["Mara", "garage-basic"], climax: "En la guantera aparece el cuaderno de viajes del abuelo." },
        { id: "first-job", title: "Combustible para volver", goal: "Aceptar una entrega local para pagar combustible y reparaciones", branches: ["entrega-urgente", "carga-delicada", "ayudar-conductor"], climax: "Ayudar a otro conductor abre una amistad que reaparecerá más adelante." },
        { id: "mountain-night", title: "La noche de la montaña", goal: "Llevar medicinas y provisiones a Valleverde tras el temporal", unlocks: ["grandparents-home", "regional-contracts"], climax: "Las luces de la casa familiar aparecen al amanecer y los abuelos esperan en la entrada." }
      ],
      finale: { choice: "Quedarse unos días, continuar el antiguo recorrido del abuelo o convertir Valleverde en la primera sede", carriesTo: "chapter-2" }
    },
    {
      id: "chapter-2",
      title: "El cuaderno del abuelo",
      premise: "Cada página del cuaderno señala una persona ayudada, una deuda pendiente y una ruta familiar que el jugador puede reconstruir.",
      systems: ["radio-diegetic", "regional-reputation", "accident-investigation", "living-market"],
      status: "planned"
    }
  ]
});

export const BOX_07A_SPEC = freeze({
  id: "box-07a",
  code: "07-A",
  sealStatus: "Precinto alterado",
  manifest: { sender: "Rutas del Continente", destination: "Puerto Alba / Inírida", declaredContent: "Equipos y documentos", declaredWeightKg: 32.4, guide: "RC-8841", status: "INCOMPLETO" },
  auroraNote: "Si estás leyendo esto, es porque algo salió del camino. Confía en tu criterio. No todas las respuestas vienen en los papeles. - Aurora",
  routePhoto: { location: "Km 117 Deslizamiento", date: "18/04 06:40" },
  customsScan: { density: "Media", material: "Mixto", packages: "1 bulto", anomalies: "No se detectan armas ni materiales peligrosos" },
  hypotheses: [
    { id: "medical", label: "Prototipo médico", icon: "A", items: ["Dispositivo de diagnóstico portátil", "Muestras biológicas estabilizadas", "Requiere cadena de frío", "Valor humanitario alto"], coldChain: true, ethicsBonus: 2 },
    { id: "mechanical", label: "Componentes mecánicos archivados", icon: "B", items: ["Piezas de maquinaria descontinuada", "Valor histórico e industrial", "Requiere manipulación especializada", "Interés de coleccionistas y museos"], coldChain: false, techBonus: 2 },
    { id: "encrypted_logs", label: "Registros logísticos cifrados", icon: "C", items: ["Dispositivos de almacenamiento cifrado", "Contienen rutas, contratos y contactos", "Información sensible", "Alto valor estratégico"], coldChain: false, intelBonus: 2 }
  ]
});

export const PERSISTENT_DECISION_MAP = freeze({
  id: "decision-map-v1",
  origin: "Taller Tormenta (Nova Liria)",
  destination: "Puerto Alba",
  decisions: [
    {
      id: "route_choice",
      step: 1,
      title: "Ruta segura vs Atajo inundado",
      options: [
        { id: "safe_route", label: "Ruta segura", effects: { timeHours: -2, fuelPercent: -10, reputation: 2, allies: 2 }, desc: "Llegas antes, entrega sólida, confían en ti." },
        { id: "flooded_shortcut", label: "Atajo inundado", effects: { timeHours: 3, fuelPercent: 20, reputation: -2, allies: -2, wearTruck: 15 }, desc: "Retrasos por desvíos y daños, más consumo." }
      ]
    },
    {
      id: "family_choice",
      step: 2,
      title: "Visitar a los abuelos vs Continuar entrega",
      options: [
        { id: "visit_grandparents", label: "Visitar a los abuelos", effects: { familyBond: 2, emotionalSupport: true }, desc: "Vínculo familiar más fuerte y apoyo emocional." },
        { id: "continue_delivery", label: "Continuar la entrega", effects: { familyBond: -1, onTimeBonus: 500 }, desc: "Se sienten descartados pero mantienes el cronograma." }
      ]
    },
    {
      id: "customs_box_choice",
      step: 3,
      title: "Declarar la caja 07-A vs Ocultar el precinto",
      options: [
        { id: "declare_box", label: "Declarar la caja", effects: { inspectionScore: 2, fineRisk: 0 }, desc: "Sin problemas en controles aduaneros." },
        { id: "hide_seal", label: "Ocultar el precinto", effects: { inspectionScore: -2, fineRisk: 45, blackMarketVal: 3500 }, desc: "Riesgo alto de revisión profunda y multa." }
      ]
    }
  ]
});

export const WORKSHOP_DIAGNOSTIC_SPEC = freeze({
  id: "workshop-diagnostic-prologue",
  title: "Primer diagnóstico",
  initialState: { temperatureC: 112, oilPressureBar: 1.2, electricFault: "DETECTADA (P0562)", status: "warning" },
  inspections: [
    { id: "hoses", label: "Mangueras", warning: true },
    { id: "belts", label: "Correas", warning: true },
    { id: "leaks", label: "Fugas de aceite", warning: true },
    { id: "connectors", label: "Conectores eléctricos", warning: true }
  ],
  repairChoices: [
    { id: "quick_patch", label: "Reparación temporal", desc: "Solución rápida con bridas/cinta para seguir ruta.", effects: { timeCostMin: 15, moneyCost: 0, reliabilityStars: 2, trustMara: 0 } },
    { id: "replace_part", label: "Reemplazar pieza", desc: "Solución definitiva con bomba nueva.", effects: { timeCostMin: 60, moneyCost: 450, reliabilityStars: 4, trustMara: 0 } },
    { id: "call_mara", label: "Llamar a Mara", desc: "Soporte remoto, diagnóstico asistido y consejo.", effects: { timeCostMin: 35, moneyCost: 180, reliabilityStars: 4, trustMara: 2 } }
  ]
});

export const STORY_TRUCK_ORIGINS = freeze({
  aurora: { id: "aurora", name: "Aurora", era: "classic", focus: ["restoration", "family", "manual-driving"], startingDebt: 30000 },
  frontier: { id: "frontier", name: "Frontier 88", era: "american-used", focus: ["independent-business", "heavy-haul", "survival"], startingDebt: 60000 },
  aster: { id: "aster", name: "Aster Viento", era: "european-modern", focus: ["international-career", "technology", "cooperative"], startingDebt: 0 }
});

export const veteranPrologue = freeze({
  id: "last-paycheck",
  title: "Prólogo del veterano · La última nómina",
  protagonist: { role: "veteran-driver", yearsOnRoad: 27, previousEmployer: "Continental Freight" },
  logline: "Tras veintisiete años al volante, un despido convierte la última nómina en la primera oportunidad de conducir por cuenta propia.",
  opening: {
    location: "Patio industrial · Nova Liria",
    time: "18:12",
    weather: "cold-rain",
    scenes: [
      { id: "final-shift", duration: 8, camera: { shot: "static-wide", lens: 50 }, action: "El veterano aparca el camión de empresa por última vez mientras cierran las puertas del almacén.", audio: { ambience: "industrial-rain", music: "low-guitar-pulse" } },
      { id: "dismissal", duration: 13, camera: { shot: "handheld-medium", target: "protagonist" }, speaker: "Jefe de tráfico", dialogue: "La compañía recorta rutas. Tu liquidación está completa. Entrega las llaves antes de salir." },
      { id: "used-yard", duration: 9, camera: { shot: "tracking-low", target: "frontier88" }, action: "En una campa de segunda mano, el veterano encuentra una tractora americana de morro largo que nadie quiere reparar." },
      { id: "purchase-choice", duration: 12, camera: { shot: "interactive", target: "frontier88" }, prompt: "¿Cuánto arriesgarás para volver a la carretera?", choices: [
        { id: "cash", label: "Comprar al contado", effects: { cash: -42000, debt: 0, truckCondition: 54 } },
        { id: "finance-repair", label: "Financiar y reparar", effects: { cash: -18000, debt: 30000, truckCondition: 76 } },
        { id: "partner", label: "Aceptar un socio", effects: { cash: -9000, partnerShare: 35, truckCondition: 70 } }
      ]},
      { id: "first-start", duration: 9, camera: { shot: "cab-to-exterior", cameraPreset: 2 }, action: "El motor gira con dificultad, expulsa humo y finalmente se estabiliza. Ya no conduce para nadie más.", audio: { sfx: ["starter-heavy", "diesel-catch", "air-release"] } }
    ]
  },
  firstArc: [
    { id: "no-company-card", title: "Sin tarjeta de empresa", goal: "Conseguir licencia, seguro y el primer contrato independiente" },
    { id: "weight-of-years", title: "El peso de los años", goal: "Equilibrar fatiga, salud y plazos sin perder reputación" },
    { id: "own-name", title: "Un nombre en la puerta", goal: "Crear la empresa y decidir qué clase de transportista quieres ser" }
  ]
});

export const europeanPrologue = freeze({
  id: "continental-ladder",
  title: "Prólogo europeo · Kilómetro cero",
  protagonist: { role: "international-employee", experienceYears: 4, employer: "Northway Transit" },
  logline: "Un conductor europeo recibe las llaves de Aster Viento y descubre que la ruta más difícil no cruza fronteras: decide qué futuro construir dentro o fuera de la empresa.",
  opening: {
    location: "Centro logístico de Puerto Alba",
    time: "05:45",
    weather: "dawn-fog",
    scenes: [
      { id: "terminal-awakens", duration: 7, camera: { shot: "crane-wide", lens: 28 }, action: "La terminal despierta entre niebla, luces de muelle y vehículos autónomos de carga." },
      { id: "keys-to-aster", duration: 10, camera: { shot: "walkaround", target: "asterViento", lens: 35 }, speaker: "Jefa de flota", dialogue: "Ruta internacional, entrega delicada y telemetría completa. Demuestra que puedes llevar Aster Viento hasta el norte." },
      { id: "digital-cockpit", duration: 9, camera: { shot: "cockpit", cameraPreset: 2 }, action: "El cuadro digital inicia navegación, asistentes, presión, descanso y estado de carga." },
      { id: "career-choice", duration: 12, camera: { shot: "interactive", target: "companyTablet" }, prompt: "¿Qué futuro quieres construir?", choices: [
        { id: "corporate", label: "Ascender en la empresa", effects: { salary: 1, companyTrust: 2, independence: 0 } },
        { id: "lease", label: "Alquilar Aster Viento", effects: { debt: 24000, independence: 2, companyTrust: 0 } },
        { id: "coop", label: "Crear una cooperativa", effects: { coopTrust: 2, independence: 1, multiplayer: true } }
      ]},
      { id: "european-departure", duration: 8, camera: { shot: "tunnel-to-sunrise", cameraPreset: 3 }, action: "Aster Viento abandona el puerto y entra en la red europea mientras aparece el primer contrato dinámico." }
    ]
  },
  firstArc: [
    { id: "northbound", title: "Rumbo al norte", goal: "Completar una entrega internacional con clima y legislación variables" },
    { id: "human-or-algorithm", title: "Humano o algoritmo", goal: "Decidir cuánto control ceder a la planificación automática" },
    { id: "three-ways-forward", title: "Tres caminos", goal: "Consolidar carrera corporativa, autónoma o cooperativa" }
  ]
});

export const transportStoryOrigins = freeze({
  aurora: { id: "aurora", title: "La ruta de los abuelos", chapter: transportStoryCampaign.chapters[0] },
  frontier: { id: "frontier", title: "La última nómina", chapter: veteranPrologue.opening },
  aster: { id: "aster", title: "Kilómetro cero", chapter: europeanPrologue.opening }
});

export const transportStoryCampaigns = freeze([transportStoryCampaign]);

export function flattenStoryTimeline(campaign = transportStoryCampaign) {
  let cursor = 0;
  return campaign.chapters.flatMap(chapter => (chapter.scenes || []).map(scene => {
    const item = { ...scene, chapterId: chapter.id, start: cursor, end: cursor + scene.duration };
    cursor = item.end;
    return item;
  }));
}

export function createStoryPlayback(campaign = transportStoryCampaign) {
  const timeline = flattenStoryTimeline(campaign);
  let time = 0;
  let playing = false;
  return {
    play() { playing = true; }, pause() { playing = false; }, seek(value) { time = Math.max(0, Number(value) || 0); },
    update(delta) { if (playing) time += Math.max(0, Number(delta) || 0); return this.frame(); },
    frame() { const scene = timeline.find(item => time >= item.start && time < item.end) || timeline.at(-1); return { time, playing, scene, progress: scene ? (time - scene.start) / Math.max(.001, scene.duration) : 0 }; },
    exportManifest() { return JSON.stringify({ version: TRANSPORT_STORY_VERSION, campaign, timeline }, null, 2); }
  };
}

export default transportStoryCampaign;
