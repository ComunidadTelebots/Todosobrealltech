import assert from "node:assert/strict";
import test from "node:test";
import { TRANSPORT_INTERFACE_CARDS as cards, TRANSPORT_INTERFACE_SECTIONS as sections } from "./transport-ui-shell.js";

test("Canva ecosystem exposes the 12 interface panels from page 022", () => {
  const expectedIds = ["home", "world", "drive", "garage", "contracts", "cargo", "air", "ports", "workshop", "convoy", "weather", "system"];
  assert.deepEqual(sections.map(x => x.id), expectedIds);
  for (const section of sections) {
    assert.ok(cards.filter(x => x.section === section.id).length >= 4, `Section ${section.id} has enough cards`);
  }
});

test("cards are unique, actionable, and mapped to simulator DOM targets", () => {
  const keys = cards.map(x => `${x.section}:${x.title}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const card of cards) {
    assert.ok(card.close || card.target, `Card ${card.title} has a target`);
  }
});
