import assert from "node:assert/strict";
import test from "node:test";
import { DASHBOARD_BUTTONS, calculateRpmFromSpeed, createVehicleDashboardSystem } from "./transport-vehicle-dashboard.js";

test("los botones del tablero de cabina incluyen todas las funciones de Canva", () => {
  const ids = DASHBOARD_BUTTONS.map(b => b.id);
  assert.equal(ids.includes("engine"), true);
  assert.equal(ids.includes("lights"), true);
  assert.equal(ids.includes("hazards"), true);
  assert.equal(ids.includes("wipers"), true);
  assert.equal(ids.includes("parking_brake"), true);
  assert.equal(ids.includes("retarder"), true);
  assert.equal(ids.includes("horn"), true);
  assert.equal(ids.includes("map"), true);
});

test("calcula las revoluciones por minuto (RPM) según marcha y velocidad", () => {
  const idle = calculateRpmFromSpeed(0, 1);
  assert.equal(idle, 650);

  const running = calculateRpmFromSpeed(78, 8);
  assert.equal(running >= 1100 && running <= 1600, true);
});

test("el sistema de dashboard gestiona estados y emite eventos de cabina", () => {
  const dash = createVehicleDashboardSystem();
  assert.equal(dash.state.engineRunning, false);

  dash.toggleButton("engine");
  assert.equal(dash.state.engineRunning, true);

  dash.toggleButton("lights");
  assert.equal(dash.state.lightsOn, true);

  dash.setGear("D");
  assert.equal(dash.state.gear, "D");
});
