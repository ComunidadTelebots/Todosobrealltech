import assert from "node:assert/strict";
import test from "node:test";
import { SPECIAL_OPERATION_TYPES, SPECIAL_CARGOES, calculateEscortRequirement } from "./transport-special-cargo.js";

test("los tipos de operaciones especiales cubren los 6 modos de Canva", () => {
  const ids = SPECIAL_OPERATION_TYPES.map(op => op.id);
  assert.equal(ids.includes("carga_especial"), true);
  assert.equal(ids.includes("emergencia"), true);
  assert.equal(ids.includes("rescate"), true);
  assert.equal(ids.includes("militar"), true);
  assert.equal(ids.includes("humanitaria"), true);
  assert.equal(ids.includes("escolta"), true);
});

test("las cargas especiales incluyen el tanque presurizado industrial de Canva", () => {
  const ids = SPECIAL_CARGOES.map(c => c.id);
  assert.equal(ids.includes("tanque_presurizado"), true);
  const tank = SPECIAL_CARGOES.find(c => c.id === "tanque_presurizado");
  assert.equal(tank.mass, 45000);
  assert.equal(tank.length, 18.4);
  assert.equal(tank.width, 3.5);
  assert.equal(tank.height, 4.1);
  assert.equal(tank.permitHours, 72);
});

test("calcula requisitos de escolta policial o coche piloto según masa y anchura", () => {
  const standard = calculateEscortRequirement({ mass: 24000, width: 2.55 });
  assert.equal(standard.escortRequired, false);

  const oversize = calculateEscortRequirement({ mass: 45000, width: 3.5 });
  assert.equal(oversize.escortRequired, true);
  assert.equal(oversize.pilotCars >= 1, true);
  assert.equal(oversize.maxSpeedKmh <= 60, true);
});
