import assert from "node:assert/strict";
import test from "node:test";
import { WAREHOUSE_INVENTORY, LOADING_EQUIPMENT, calculateAxleWeightDistribution, createWarehouseLoadingSystem } from "./transport-warehouse-loading.js";

test("el inventario del almacén coincide con el panel 3 de Canva", () => {
  assert.equal(WAREHOUSE_INVENTORY.alimentos.pallets, 32);
  assert.equal(WAREHOUSE_INVENTORY.electronica.pallets, 18);
  assert.equal(WAREHOUSE_INVENTORY.maquinaria.pallets, 24);
  assert.equal(WAREHOUSE_INVENTORY.textil.pallets, 16);
  assert.equal(WAREHOUSE_INVENTORY.quimico.pallets, 15);
  assert.equal(WAREHOUSE_INVENTORY.otros.pallets, 19);

  const totalPallets = Object.values(WAREHOUSE_INVENTORY).reduce((acc, c) => acc + c.pallets, 0);
  assert.equal(totalPallets, 124);
});

test("las herramientas de carga incluyen carretilla y transpaletas", () => {
  const ids = LOADING_EQUIPMENT.map(e => e.id);
  assert.equal(ids.includes("forklift"), true);
  assert.equal(ids.includes("pallet_jack"), true);
  assert.equal(ids.includes("electric_jack"), true);
});

test("calcula la distribución de peso por eje y avisa de sobrecargas", () => {
  const cargo = [
    { type: "electronica", massKg: 450, positionZ: 2.0 },
    { type: "maquinaria", massKg: 820, positionZ: 6.5 },
    { type: "alimentos", massKg: 380, positionZ: 11.0 }
  ];
  const dist = calculateAxleWeightDistribution(cargo);
  assert.equal(dist.totalPayloadKg, 1650);
  assert.equal(dist.frontAxleKg > 0, true);
  assert.equal(dist.driveAxleKg > 0, true);
  assert.equal(dist.bogieAxlesKg > 0, true);
  assert.equal(dist.balanced, true);
});

test("el sistema de carga permite estibar pallets y aplicar cinchas", () => {
  const wh = createWarehouseLoadingSystem();
  assert.equal(wh.state.loadedPallets.length, 0);

  wh.loadPallet("electronica", { slotIndex: 1 });
  assert.equal(wh.state.loadedPallets.length, 1);
  assert.equal(wh.state.strapsSecured, false);

  wh.secureStraps();
  assert.equal(wh.state.strapsSecured, true);
});
