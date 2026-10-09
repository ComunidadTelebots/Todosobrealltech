import assert from "node:assert/strict";
import test from "node:test";
import { BIOMES, WILDLIFE_SPECIES, WILDLIFE_BEHAVIORS, evaluateWildlifeHazard } from "./transport-ambient-life.js";

test("los biomas incluyen todas las zonas de las páginas 93 y 94", () => {
  assert.equal(Array.isArray(BIOMES.conifer_forest), true);
  assert.equal(Array.isArray(BIOMES.deciduous_forest), true);
  assert.equal(Array.isArray(BIOMES.high_mountain), true);
  assert.equal(Array.isArray(BIOMES.rocky_slope), true);
  assert.equal(Array.isArray(BIOMES.rural_pasture), true);
  assert.equal(BIOMES.conifer_forest.includes("ciervo_rojo"), true);
  assert.equal(BIOMES.deciduous_forest.includes("corzo"), true);
  assert.equal(BIOMES.high_mountain.includes("cabra_montes"), true);
  assert.equal(BIOMES.rural_pasture.includes("oveja"), true);
});

test("la biblioteca de especies define escalas y alturas fieles a Canva", () => {
  assert.equal(WILDLIFE_SPECIES.ciervo_rojo.heightM, 2.20);
  assert.equal(WILDLIFE_SPECIES.cabra_montes.heightM, 1.70);
  assert.equal(WILDLIFE_SPECIES.lobo.heightM, 1.30);
  assert.equal(WILDLIFE_SPECIES.corzo.heightM, 0.90);
  assert.equal(WILDLIFE_SPECIES.jabali.heightM, 0.80);
  assert.equal(WILDLIFE_SPECIES.zorro.heightM, 0.70);
  assert.equal(WILDLIFE_SPECIES.lince.heightM, 0.60);
  assert.equal(WILDLIFE_SPECIES.marmota.heightM, 0.45);
  assert.equal(WILDLIFE_SPECIES.buho.heightM, 0.40);
});

test("las reglas de comportamiento cubren claxon, luces y amanecer", () => {
  assert.equal(WILDLIFE_BEHAVIORS.dawnDuskActivity, true);
  assert.equal(WILDLIFE_BEHAVIORS.fleeFromHorn, true);
  assert.equal(WILDLIFE_BEHAVIORS.flockBlocksRoad, true);
});

test("evalúa riesgos de fauna en calzada y recomienda respuesta segura", () => {
  const hazard = evaluateWildlifeHazard({ distanceM: 25, species: "oveja", speedKmh: 85, timeOfDay: "dawn", hornUsed: false });
  assert.equal(hazard.warning, true);
  assert.equal(hazard.safeSpeedKmh, 70);
  assert.equal(hazard.ruleOfGold, "VER → PREVER → DECIDIR → ACTUAR");
});
