import assert from "node:assert/strict";
import test from "node:test";
import { CANVA_TEXTURE_PRESETS, createCanvaTextureAtlas } from "./transport-canva-textures.js";

test("los presets de textura incluyen los assets de las páginas de Canva", () => {
  const ids = Object.keys(CANVA_TEXTURE_PRESETS);
  assert.equal(ids.includes("box07a_manifest"), true);
  assert.equal(ids.includes("diagnostic_tablet"), true);
  assert.equal(ids.includes("wildlife_protection_sign"), true);
  assert.equal(ids.includes("special_v21_banner"), true);
  assert.equal(ids.includes("dash_check_engine"), true);
});

test("crea el atlas procedural de texturas basado en Canva con resolución configurada", () => {
  const atlas = createCanvaTextureAtlas({ width: 512, height: 512 });
  assert.notEqual(atlas, null);
  assert.equal(typeof atlas.getTexture, "function");

  const manifest = atlas.getTexture("box07a_manifest");
  assert.notEqual(manifest, null);
  assert.equal(manifest.name, "canva_box07a_manifest");
});
