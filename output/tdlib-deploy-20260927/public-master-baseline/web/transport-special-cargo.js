/**
 * Módulo de Operaciones Especiales, Cargas Sobredimensionadas y Escolta (Canal Alfa).
 * Basado en las especificaciones de la página 023 (Panel 8) de Canva.
 */

export const SPECIAL_OPERATION_TYPES = Object.freeze([
  { id: "carga_especial", label: "Carga Especial",  icon: "⚙️", desc: "Transporte pesado con góndola modular y coche piloto." },
  { id: "emergencia",     label: "Emergencia",      icon: "🚨", desc: "Generadores de alta tensión y suministros críticos." },
  { id: "rescate",        label: "Rescate",         icon: "🏗️", desc: "Recuperación pesada de vehículos accidentados." },
  { id: "militar",        label: "Militar",         icon: "🛡️", desc: "Equipamiento logístico de defensa con permiso restringido." },
  { id: "humanitaria",    label: "Humanitaria",     icon: "🕊️", desc: "Hospitales de campaña y víveres en zonas de catástrofe." },
  { id: "escolta",        label: "Escolta",         icon: "🚔", desc: "Conducción de coche piloto con panel luminoso V-21." }
]);

export const SPECIAL_CARGOES = Object.freeze([
  { id: "tanque_presurizado", name: "Tanque presurizado industrial", mass: 45000, width: 3.5, height: 4.1, length: 18.4, permitHours: 72, reward: 18759, reputation: 250, color: 0xb4bec5 },
  { id: "reactor",            name: "Cámara industrial",            mass: 52000, width: 6.2, height: 6.5, length: 12.0, permitHours: 72, reward: 148000, reputation: 350, color: 0x9e3832 },
  { id: "transformer",        name: "Transformador energético",     mass: 68000, width: 5.4, height: 5.2, length: 9.0,  permitHours: 48, reward: 172000, reputation: 400, color: 0x38594d },
  { id: "excavator",          name: "Excavadora minera",            mass: 47000, width: 5.8, height: 5.5, length: 11.0, permitHours: 72, reward: 136000, reputation: 300, color: 0xd39a28 },
  { id: "turbine",            name: "Turbina eólica",               mass: 39000, width: 5.7, height: 5.8, length: 10.0, permitHours: 96, reward: 129000, reputation: 280, color: 0xd9e1e3 },
  { id: "generator",          name: "Generador de emergencia",      mass: 74000, width: 5.1, height: 5.3, length: 8.5,  permitHours: 36, reward: 191000, reputation: 450, color: 0x315b72 }
]);

export function calculateEscortRequirement({ mass = 20000, width = 2.55, height = 4.0, length = 16.5 } = {}) {
  const isOversize = width > 3.0 || height > 4.2 || length > 18.0 || mass > 40000;
  const isExtreme = width > 4.5 || mass > 65000;

  if (!isOversize) {
    return {
      escortRequired: false,
      pilotCars: 0,
      policeEscort: false,
      maxSpeedKmh: 90,
      nightDrivingOnly: false,
      recommendation: "Transporte estándar sin escolta obligatoria."
    };
  }

  const pilotCars = isExtreme ? 2 : 1;
  const policeEscort = mass > 60000 || width > 5.0;
  const maxSpeedKmh = isExtreme ? 45 : 60;

  return {
    escortRequired: true,
    pilotCars,
    policeEscort,
    maxSpeedKmh,
    nightDrivingOnly: width > 4.0,
    recommendation: `Requiere ${pilotCars} coche(s) piloto con panel V-21${policeEscort ? " y escolta policial" : ""}. Velocidad máx: ${maxSpeedKmh} km/h.`
  };
}

export function createSpecialTransport({ THREE: T, scene, vehicle, qualityLevel = 2 } = {}) {
  const root = new T.Group();
  root.name = "special_transport_load";
  if (vehicle) vehicle.add(root);
  const escorts = new T.Group();
  escorts.name = "pilot_escort_convoy";
  if (scene) scene.add(escorts);

  const mat = (color, roughness = .55, metalness = .22) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const add = (parent, geometry, material, position, name) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent, size, color, position, name) => add(parent, new T.BoxGeometry(...size), mat(color), position, name);
  const cylinder = (parent, radius, length, color, position, rotation = [0, 0, 0], name = "cylinder") => {
    const mesh = add(parent, new T.CylinderGeometry(radius, radius, length, qualityLevel > 1 ? 32 : 16), mat(color, .42, .38), position, name);
    mesh.rotation.set(...rotation);
    return mesh;
  };

  const stages = ["Preparar hidráulica", "Bajar cuello desmontable", "Cargar maquinaria", "Instalar cadenas", "Equilibrar ejes", "Inspección completada"];
  let active = null, amberPhase = 0, stage = 0;

  const clear = () => {
    while (root.children.length) {
      const object = root.children.pop();
      object.traverse?.(node => {
        node.geometry?.dispose?.();
        node.material?.dispose?.();
      });
    }
  };

  const modularTrailer = cargo => {
    const deck = box(root, [cargo.width + .45, .36, cargo.length + 2.6], 0x263b49, [0, 1.58, 4.5], "hydraulic_modular_platform");
    deck.material = new T.MeshPhysicalMaterial({ color: 0x263b49, roughness: .64, metalness: .48, clearcoat: .18 });
    for (let x = -cargo.width / 2 + .42; x < cargo.width / 2; x += .58) {
      box(root, [.48, .045, cargo.length + 2.15], 0x795636, [x, 1.79, 4.5], "weathered_timber_deck");
    }
    const neck = new T.Group();
    neck.name = "detachable_hydraulic_neck";
    box(neck, [cargo.width * .72, .38, 2.7], 0x263b49, [0, 1.55, -3.25], "gooseneck_frame");
    root.add(neck);
    root.userData.neck = neck;
  };

  const buildCargo = cargo => {
    clear();
    modularTrailer(cargo);
    if (cargo.id === "tanque_presurizado") {
      cylinder(root, cargo.width * .46, cargo.length * .75, cargo.color, [0, 3.8, 4.5], [Math.PI / 2, 0, 0], "pressurized_industrial_tank");
      for (const z of [1.5, 4.5, 7.5]) {
        cylinder(root, cargo.width * .50, .24, 0x48525a, [0, 3.8, z], [Math.PI / 2, 0, 0], "tank_retaining_cradle");
      }
    } else if (cargo.id === "reactor") {
      cylinder(root, cargo.width * .45, cargo.height * .72, cargo.color, [0, 4.35, 4.5], [0, 0, Math.PI / 2], "industrial_pressure_chamber");
    } else {
      box(root, [cargo.width * .75, cargo.height * .65, cargo.length * .7], cargo.color, [0, 3.5, 4.5], "special_heavy_body");
    }
    active = cargo;
  };

  return {
    get state() {
      return {
        activeCargo: active,
        stage,
        stageLabel: stages[stage] || "En ruta",
        escortRequirements: active ? calculateEscortRequirement(active) : null
      };
    },
    selectCargo(cargoId) {
      const found = SPECIAL_CARGOES.find(c => c.id === cargoId) || SPECIAL_CARGOES[0];
      buildCargo(found);
      return found;
    },
    advanceStage() {
      if (stage < stages.length - 1) stage++;
      return stages[stage];
    },
    update(time, dt) {
      amberPhase += dt * 8;
      root.traverse(o => {
        if (o.userData.beacon) {
          o.material.color.setHex(Math.floor(amberPhase) % 2 === 0 ? 0xffaa00 : 0x442200);
        }
      });
    },
    clear,
    root,
    escorts
  };
}

export default { SPECIAL_OPERATION_TYPES, SPECIAL_CARGOES, calculateEscortRequirement, createSpecialTransport };
