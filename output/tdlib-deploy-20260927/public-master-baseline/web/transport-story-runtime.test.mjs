import assert from "node:assert/strict";
import test from "node:test";
import { createStoryRuntime } from "./transport-story-runtime.js";

const memory = () => { const data = new Map(); return { getItem:key => data.get(key) ?? null, setItem:(key,value) => data.set(key,value) }; };

test("selecciona una campaña y conserva sus variables iniciales", () => {
  const runtime = createStoryRuntime({ storage:memory() });
  runtime.selectOrigin("aurora");
  assert.equal(runtime.snapshot.origin, "aurora");
  assert.equal(runtime.snapshot.variables.debt, 30000);
});

test("aplica y persiste una decisión del prólogo", () => {
  const storage = memory();
  const runtime = createStoryRuntime({ storage });
  runtime.selectOrigin("aurora");
  runtime.choose("player-choice", "family");
  assert.equal(runtime.snapshot.choices["player-choice"], "family");
  assert.equal(runtime.snapshot.variables.familyBond, 2);
  assert.equal(createStoryRuntime({ storage }).snapshot.choices["player-choice"], "family");
});

test("rechaza decisiones ajenas a la campaña elegida", () => {
  const runtime = createStoryRuntime({ storage:memory() });
  runtime.selectOrigin("aster");
  assert.throws(() => runtime.choose("player-choice", "family"), /Decisión no disponible/);
});

test("aplica y persiste el primer diagnóstico de taller", () => {
  const storage = memory();
  const runtime = createStoryRuntime({ storage });
  runtime.repairTruck("call_mara");
  assert.equal(runtime.snapshot.workshopDiagnostic.choiceId, "call_mara");
  assert.equal(runtime.snapshot.variables.trustMara, 2);
  assert.equal(runtime.snapshot.variables.moneyCost, 180);
});

test("selecciona y persiste la hipótesis de la Caja 07-A", () => {
  const storage = memory();
  const runtime = createStoryRuntime({ storage });
  runtime.selectBoxHypothesis("medical");
  assert.equal(runtime.snapshot.box07a.hypothesisId, "medical");
  assert.equal(runtime.snapshot.variables.ethicsBonus, 2);
});
