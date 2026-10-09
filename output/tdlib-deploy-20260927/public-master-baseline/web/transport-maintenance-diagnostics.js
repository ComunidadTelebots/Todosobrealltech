/**
 * Módulo de Ingeniería, Mantenimiento y Despiece de Componentes (Canal Alfa).
 * Basado fielmente en la página 027 de Canva.
 */

export const TRUCK_TIRES_SPEC = Object.freeze([
  { id: "front_left",      label: "Del. Izq.",       pressureBar: 8.2, treadDepthMm: 7.6, status: "OK" },
  { id: "front_right",     label: "Del. Der.",       pressureBar: 8.1, treadDepthMm: 7.4, status: "OK" },
  { id: "rear_left_ext",   label: "Tras. Izq. Ext.", pressureBar: 8.0, treadDepthMm: 6.8, status: "OK" },
  { id: "rear_left_int",   label: "Tras. Izq. Int.", pressureBar: 7.8, treadDepthMm: 6.5, status: "OK" },
  { id: "rear_right_int",  label: "Tras. Der. Int.", pressureBar: 8.0, treadDepthMm: 6.7, status: "OK" },
  { id: "rear_right_ext",  label: "Tras. Der. Ext.", pressureBar: 7.8, treadDepthMm: 6.3, status: "Revisar" }
]);

export const COMPONENT_WEAR_SPEC = Object.freeze([
  { id: "brake_discs", label: "Discos de freno",       wearPercent: 65, remainingKm: 18500, status: "OK" },
  { id: "brake_pads",  label: "Pastillas de freno",    wearPercent: 60, remainingKm: 15000, status: "Revisar" },
  { id: "clutch",      label: "Embrague",              wearPercent: 48, remainingKm: 32000, status: "OK" },
  { id: "belts",       label: "Correa de accesorios",  wearPercent: 70, remainingKm: 12000, status: "Revisar" },
  { id: "filters",     label: "Filtros (aire/aceite)", wearPercent: 30, remainingKm: 8000,  status: "Pronto" },
  { id: "injectors",   label: "Inyectores / Bujías",   wearPercent: 25, remainingKm: 35000, status: "OK" }
]);

export function createMaintenanceSystem({ initialOdometerKm = 128540, initialEngineHours = 3482 } = {}) {
  const state = {
    odometerKm: initialOdometerKm,
    engineHours: initialEngineHours,
    avgFuelConsumptionL100: 28.4,
    overallHealthPercent: 82,
    systems: {
      motorTransmission: 85,
      brakesSuspension: 78,
      electricalSystem: 90,
      tires: 72,
      chassisStructure: 88,
      fluidsFilters: 80
    },
    liveTelemetry: {
      engineTempC: 92,
      transmissionTempC: 87,
      oilPressureBar: 4.2,
      coolantLevelPercent: 76,
      systemVoltageV: 27.4
    },
    mobileWorkshopActive: false,
    mobileWorkshop: null
  };

  const listeners = new Set();
  const emit = () => {
    const snap = JSON.parse(JSON.stringify(state));
    listeners.forEach(fn => {
      try { fn(snap); } catch {}
    });
    return snap;
  };

  return {
    get state() {
      return JSON.parse(JSON.stringify(state));
    },
    dispatchMobileWorkshop({ routeName = "Ruta 45, Km 128", technicianName = "Carlos Méndez", etaMinutes = 45 } = {}) {
      state.mobileWorkshopActive = true;
      state.mobileWorkshop = {
        technician: technicianName,
        location: routeName,
        etaMinutes,
        status: "EN CAMINO",
        dispatchedAt: Date.now()
      };
      return emit().mobileWorkshop;
    },
    replaceComponent(componentId) {
      if (state.systems[componentId] !== undefined) {
        state.systems[componentId] = 100;
        const vals = Object.values(state.systems);
        state.overallHealthPercent = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        return emit();
      }
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

export default { TRUCK_TIRES_SPEC, COMPONENT_WEAR_SPEC, createMaintenanceSystem };
