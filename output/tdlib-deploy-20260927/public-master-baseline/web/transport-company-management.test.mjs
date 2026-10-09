import assert from "node:assert/strict";
import test from "node:test";
import { DRIVER_CANDIDATES, TALENT_TREE, COMPANY_WAREHOUSES, createCompanySystem } from "./transport-company-management.js";

test("los candidatos a conductor incluyen las licencias y datos de Canva", () => {
  assert.equal(DRIVER_CANDIDATES.length >= 3, true);
  const diego = DRIVER_CANDIDATES.find(d => d.name === "Diego Ramírez");
  assert.notEqual(diego, null);
  assert.equal(diego.licenses.includes("C+E"), true);
  assert.equal(diego.licenses.includes("CAP"), true);
});

test("el árbol de talento cubre las 7 especialidades de Canva", () => {
  const ids = Object.keys(TALENT_TREE);
  assert.equal(ids.includes("eficiencia"), true);
  assert.equal(ids.includes("fragil"), true);
  assert.equal(ids.includes("larga_distancia"), true);
  assert.equal(ids.includes("adr_peligrosas"), true);
  assert.equal(ids.includes("nocturna"), true);
  assert.equal(ids.includes("liderazgo"), true);
  assert.equal(ids.includes("mecanica"), true);
});

test("las sedes y almacenes cubren las 6 ciudades europeas de Canva", () => {
  const cities = COMPANY_WAREHOUSES.map(w => w.city);
  assert.equal(cities.includes("Madrid"), true);
  assert.equal(cities.includes("Barcelona"), true);
  assert.equal(cities.includes("Zaragoza"), true);
  assert.equal(cities.includes("Lisboa"), true);
  assert.equal(cities.includes("Milán"), true);
  assert.equal(cities.includes("Berlín"), true);
});

test("el sistema de empresa calcula balance financiero, contrata y asigna seguridad", () => {
  const company = createCompanySystem({ initialBalance: 24870450 });
  assert.equal(company.state.balance, 24870450);

  company.hireDriver("diego_ramirez");
  assert.equal(company.state.hiredDrivers.length, 1);

  company.upgradeTalent("eficiencia");
  assert.equal(company.state.talentLevels.eficiencia, 1);

  company.setSecurityTier("cctv_ai");
  assert.equal(company.state.securityTier, "cctv_ai");
});
