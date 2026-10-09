import assert from "node:assert/strict";
import test from "node:test";
import { TRUCK_TIRES_SPEC, COMPONENT_WEAR_SPEC, createMaintenanceSystem } from "./transport-maintenance-diagnostics.js";

test("los neumáticos individuales tienen la presión y profundidad de banda de Canva", () => {
  assert.equal(TRUCK_TIRES_SPEC.length, 6);
  const frontLeft = TRUCK_TIRES_SPEC.find(t => t.id === "front_left");
  assert.equal(frontLeft.pressureBar, 8.2);
  assert.equal(frontLeft.treadDepthMm, 7.6);
});

test("los componentes de desgaste incluyen vida útil en km de Canva", () => {
  assert.equal(COMPONENT_WEAR_SPEC.length >= 6, true);
  const brakeDiscs = COMPONENT_WEAR_SPEC.find(c => c.id === "brake_discs");
  assert.equal(brakeDiscs.wearPercent, 65);
  assert.equal(brakeDiscs.remainingKm, 18500);
});

test("el sistema de mantenimiento calcula el estado general y despacha taller móvil", () => {
  const maint = createMaintenanceSystem();
  assert.equal(maint.state.overallHealthPercent, 82);

  const van = maint.dispatchMobileWorkshop({ routeName: "Ruta 45, Km 128", technicianName: "Carlos Méndez" });
  assert.equal(van.status, "EN CAMINO");
  assert.equal(van.etaMinutes, 45);
  assert.equal(maint.state.mobileWorkshopActive, true);
});
