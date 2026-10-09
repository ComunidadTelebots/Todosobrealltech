/**
 * Módulo de Almacén, Carga Manual y Reparto de Masas por Eje (Canal Alfa).
 * Basado fielmente en el Panel 3 de la página 023 de Canva.
 */

export const WAREHOUSE_INVENTORY = Object.freeze({
  alimentos:   { id: "alimentos",   label: "Alimentos",   pallets: 32, massKg: 380, tempControlled: true, icon: "🍎", desc: "Perecederos y lácteos" },
  electronica: { id: "electronica", label: "Electrónica", pallets: 18, massKg: 450, tempControlled: false, icon: "📱", desc: "Componentes y pantallas" },
  maquinaria:  { id: "maquinaria",  label: "Maquinaria",  pallets: 24, massKg: 820, tempControlled: false, icon: "⚙️", desc: "Repuestos y motores" },
  textil:      { id: "textil",      label: "Textil",      pallets: 16, massKg: 260, tempControlled: false, icon: "👕", desc: "Prendas y calzado" },
  quimico:     { id: "quimico",     label: "Químico",     pallets: 15, massKg: 520, tempControlled: false, icon: "🧪", desc: "Productos ADR clase 3" },
  otros:       { id: "otros",       label: "Otros",       pallets: 19, massKg: 340, tempControlled: false, icon: "📦", desc: "Carga seca general" }
});

export const LOADING_EQUIPMENT = Object.freeze([
  { id: "forklift",      name: "Carretilla elevadora", capacityKg: 2500, liftHeightM: 3.2, speedMps: 3.5, icon: "🚜" },
  { id: "pallet_jack",   name: "Transpaleta manual",   capacityKg: 1200, liftHeightM: 0.2, speedMps: 1.2, icon: "🛒" },
  { id: "electric_jack", name: "Transpaleta eléctrica", capacityKg: 1800, liftHeightM: 0.3, speedMps: 2.2, icon: "⚡" }
]);

export function calculateAxleWeightDistribution(cargoList = [], {
  tareTractorFrontKg = 4800,
  tareTractorDriveKg = 3200,
  tareTrailerBogieKg = 6000,
  trailerLengthM = 13.6,
  kingpinOffsetM = 1.2,
  bogieCenterOffsetM = 9.8
} = {}) {
  const totalPayloadKg = cargoList.reduce((acc, c) => acc + (Number(c.massKg) || 0), 0);
  
  let momentSum = 0;
  cargoList.forEach(c => {
    const z = Math.max(0, Math.min(trailerLengthM, Number(c.positionZ) || trailerLengthM / 2));
    momentSum += (Number(c.massKg) || 0) * z;
  });

  const centerOfGravityZ = totalPayloadKg > 0 ? momentSum / totalPayloadKg : trailerLengthM / 2;

  // Reparto estático entre 5ª rueda (kingpin) y bogie del remolque
  const span = bogieCenterOffsetM - kingpinOffsetM;
  const bogieRatio = Math.max(0, Math.min(1, (centerOfGravityZ - kingpinOffsetM) / span));
  const kingpinPayloadKg = totalPayloadKg * (1 - bogieRatio);
  const bogiePayloadKg = totalPayloadKg * bogieRatio;

  // Reparto del kingpin en la tractora: 35% eje directriz, 65% eje motriz
  const frontAxleKg = Math.round(tareTractorFrontKg + kingpinPayloadKg * 0.35);
  const driveAxleKg = Math.round(tareTractorDriveKg + kingpinPayloadKg * 0.65);
  const bogieAxlesKg = Math.round(tareTrailerBogieKg + bogiePayloadKg);
  const totalWeightKg = frontAxleKg + driveAxleKg + bogieAxlesKg;

  const maxFrontKg = 7500;
  const maxDriveKg = 11500;
  const maxBogieKg = 24000;
  const maxTotalKg = 40000;

  const frontOver = frontAxleKg > maxFrontKg;
  const driveOver = driveAxleKg > maxDriveKg;
  const bogieOver = bogieAxlesKg > maxBogieKg;
  const totalOver = totalWeightKg > maxTotalKg;

  const balanced = !frontOver && !driveOver && !bogieOver && !totalOver;

  return {
    totalPayloadKg,
    totalWeightKg,
    centerOfGravityZ: Number(centerOfGravityZ.toFixed(2)),
    frontAxleKg,
    driveAxleKg,
    bogieAxlesKg,
    maxFrontKg,
    maxDriveKg,
    maxBogieKg,
    maxTotalKg,
    balanced,
    overload: frontOver || driveOver || bogieOver || totalOver,
    alerts: [
      ...(frontOver ? ["Sobrecarga en eje directriz delantero"] : []),
      ...(driveOver ? ["Sobrecarga en eje motriz"] : []),
      ...(bogieOver ? ["Sobrecarga en grupo de ejes del semirremolque"] : []),
      ...(totalOver ? ["Masa Máxima Autorizada (40 t) superada"] : [])
    ]
  };
}

export function createWarehouseLoadingSystem({ trailerCapacity = 33 } = {}) {
  const state = {
    loadedPallets: [],
    activeTool: "forklift",
    strapsSecured: false,
    updatedAt: Date.now()
  };

  const listeners = new Set();
  const emit = () => {
    state.updatedAt = Date.now();
    const snap = {
      ...state,
      distribution: calculateAxleWeightDistribution(state.loadedPallets)
    };
    listeners.forEach(fn => {
      try { fn(snap); } catch {}
    });
    return snap;
  };

  const loadPallet = (typeId, { slotIndex = state.loadedPallets.length + 1, massKg = null } = {}) => {
    const item = WAREHOUSE_INVENTORY[typeId] || WAREHOUSE_INVENTORY.otros;
    if (state.loadedPallets.length >= trailerCapacity) {
      throw new Error("Semirremolque completo (máximo 33 europallets)");
    }
    const pallet = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: item.id,
      label: item.label,
      icon: item.icon,
      massKg: massKg || item.massKg,
      slotIndex,
      positionZ: (slotIndex / trailerCapacity) * 13.6,
      loadedAt: Date.now()
    };
    state.loadedPallets.push(pallet);
    state.strapsSecured = false;
    return emit();
  };

  const unloadPallet = palletId => {
    state.loadedPallets = state.loadedPallets.filter(p => p.id !== palletId);
    state.strapsSecured = false;
    return emit();
  };

  const selectTool = toolId => {
    const tool = LOADING_EQUIPMENT.find(t => t.id === toolId);
    if (tool) state.activeTool = tool.id;
    return emit();
  };

  const secureStraps = () => {
    state.strapsSecured = true;
    return emit();
  };

  return {
    get state() {
      return {
        ...state,
        distribution: calculateAxleWeightDistribution(state.loadedPallets)
      };
    },
    loadPallet,
    unloadPallet,
    selectTool,
    secureStraps,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

export default { WAREHOUSE_INVENTORY, LOADING_EQUIPMENT, calculateAxleWeightDistribution, createWarehouseLoadingSystem };
