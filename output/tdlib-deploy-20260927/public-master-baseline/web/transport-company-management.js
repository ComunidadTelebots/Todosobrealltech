/**
 * Módulo de Empresa, Talento, Almacenes y Seguridad (Canal Alfa).
 * Basado fielmente en la página 025 de Canva.
 */

export const DRIVER_CANDIDATES = Object.freeze([
  {
    id: "diego_ramirez",
    name: "Diego Ramírez",
    rating: 4.6,
    salaryMonth: 2600,
    licenses: ["C+E", "CAP"],
    experienceYears: 7,
    fatigaLevel: "Baja (94% descanso)",
    preferredRoutes: "Nacional, Larga distancia"
  },
  {
    id: "laura_mendez",
    name: "Laura Méndez",
    rating: 4.8,
    salaryMonth: 2950,
    licenses: ["C+E", "CAP", "ADR"],
    experienceYears: 9,
    fatigaLevel: "Muy baja (98% descanso)",
    preferredRoutes: "Internacional, Mercancías Peligrosas"
  },
  {
    id: "ivan_lopez",
    name: "Iván López",
    rating: 4.3,
    salaryMonth: 2450,
    licenses: ["C", "CAP"],
    experienceYears: 5,
    fatigaLevel: "Media (88% descanso)",
    preferredRoutes: "Regional, Nacional"
  }
]);

export const TALENT_TREE = Object.freeze({
  eficiencia:      { name: "Eficiencia Diésel",    maxLevel: 5, desc: "Reduce el consumo de combustible hasta un 20%." },
  fragil:          { name: "Mercancía Frágil",     maxLevel: 5, desc: "Bonus económico en mercancía de precisión (+30%)." },
  larga_distancia: { name: "Larga Distancia",      maxLevel: 5, desc: "Habilita contratos internacionales de más de 2.000 km." },
  adr_peligrosas:  { name: "ADR / Peligrosas",     maxLevel: 5, desc: "Autorización para cisternas inflamables y químicos." },
  nocturna:        { name: "Conducción Nocturna",  maxLevel: 5, desc: "Bonus de entrega exprés nocturna (+25%)." },
  liderazgo:       { name: "Liderazgo de Convoy",  maxLevel: 5, desc: "Aumenta la experiencia de todos los miembros del convoy (+15%)." },
  mecanica:        { name: "Mecánica Preventiva",  maxLevel: 5, desc: "Reduce el desgaste de neumáticos, frenos y aceite (-25%)." }
});

export const COMPANY_WAREHOUSES = Object.freeze([
  { id: "madrid",    city: "Madrid",    country: "ESP", role: "Sede Central",     inventoryVal: 8450000, docks: "14/20", staff: 48, risk: "Bajo" },
  { id: "barcelona", city: "Barcelona", country: "ESP", role: "Almacén Logístico", inventoryVal: 6120000, docks: "10/16", staff: 36, risk: "Moderado" },
  { id: "zaragoza",  city: "Zaragoza",  country: "ESP", role: "Hub Intermodal",    inventoryVal: 3250000, docks: "6/10",  staff: 22, risk: "Bajo" },
  { id: "lisboa",    city: "Lisboa",    country: "PRT", role: "Almacén Atlántico", inventoryVal: 4580000, docks: "8/12",  staff: 28, risk: "Moderado" },
  { id: "milan",     city: "Milán",     country: "ITA", role: "Hub Industrial",    inventoryVal: 5710000, docks: "9/14",  staff: 31, risk: "Alto" },
  { id: "berlin",    city: "Berlín",    country: "DEU", role: "Hub Continental",   inventoryVal: 6750000, docks: "12/18", staff: 34, risk: "Bajo" }
]);

export const SECURITY_PROVIDERS = Object.freeze([
  { id: "integral_24",       name: "Seguridad Integral 24", patrolInterval: "Cada 2 h",  guards: 2, respTimeMin: 15, maxRangeKm: 50,  costMonth: 2100 },
  { id: "proteccion_global", name: "Protección Global",     patrolInterval: "Cada 1 h",  guards: 3, respTimeMin: 10, maxRangeKm: 100, costMonth: 3250 },
  { id: "vigilant",          name: "Vigilant Services",     patrolInterval: "Cada 30 m", guards: 4, respTimeMin: 7,  maxRangeKm: 150, costMonth: 4200 },
  { id: "guardian_elite",    name: "Guardian Elite",        patrolInterval: "Cada 20 m", guards: 5, respTimeMin: 5,  maxRangeKm: 200, costMonth: 5500 }
]);

export function createCompanySystem({ initialBalance = 24870450 } = {}) {
  const state = {
    balance: initialBalance,
    monthlyIncome: 1236050,
    hiredDrivers: [],
    talentLevels: {
      eficiencia: 0,
      fragil: 0,
      larga_distancia: 0,
      adr_peligrosas: 0,
      nocturna: 0,
      liderazgo: 0,
      mecanica: 0
    },
    securityTier: "basic",
    activeSecurityProvider: "integral_24",
    securityIncidents: [
      { id: "inc-1", time: "08:15", type: "Robo de mercancía", detail: "Electrónica · 12 pallets en Almacén Barcelona", status: "En investigación", evidence: ["cctv_1.jpg", "cctv_2.jpg"] },
      { id: "inc-2", time: "04:40", type: "Intrusión frustrada", detail: "Acceso perimetral detectado en Almacén Barcelona", status: "Frustrado", evidence: ["perimetral.jpg"] }
    ]
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
    hireDriver(driverId) {
      const driver = DRIVER_CANDIDATES.find(d => d.id === driverId);
      if (driver && !state.hiredDrivers.some(d => d.id === driverId)) {
        state.hiredDrivers.push(driver);
        state.balance -= driver.salaryMonth;
        return emit();
      }
      return state;
    },
    upgradeTalent(talentKey) {
      if (state.talentLevels[talentKey] !== undefined && state.talentLevels[talentKey] < 5) {
        state.talentLevels[talentKey]++;
        return emit();
      }
      return state;
    },
    setSecurityTier(tier) {
      state.securityTier = tier;
      return emit();
    },
    selectSecurityProvider(providerId) {
      const p = SECURITY_PROVIDERS.find(s => s.id === providerId);
      if (p) {
        state.activeSecurityProvider = p.id;
        state.balance -= p.costMonth;
        return emit();
      }
      return state;
    },
    dispatchPolice(incidentId) {
      const inc = state.securityIncidents.find(i => i.id === incidentId);
      if (inc) {
        inc.status = "Policía Despachada";
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

export default { DRIVER_CANDIDATES, TALENT_TREE, COMPANY_WAREHOUSES, SECURITY_PROVIDERS, createCompanySystem };
