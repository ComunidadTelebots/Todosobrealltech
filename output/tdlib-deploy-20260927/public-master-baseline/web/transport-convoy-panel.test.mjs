import assert from "node:assert/strict";
import test from "node:test";
import { CB_CHANNELS, CB_QUICK_MESSAGES, createConvoyRadioSystem } from "./transport-convoy-panel.js";

test("canales de radio CB definidos con frecuencias reales", () => {
  assert.equal(CB_CHANNELS.length >= 3, true);
  assert.equal(CB_CHANNELS.find(c => c.channel === 19)?.label.includes("Carretera"), true);
  assert.equal(CB_CHANNELS.find(c => c.channel === 9)?.label.includes("Emergencias"), true);
});

test("mensajes rápidos de radio CB cubren maniobras de convoy", () => {
  assert.equal(CB_QUICK_MESSAGES.length >= 4, true);
  const ids = CB_QUICK_MESSAGES.map(m => m.id);
  assert.equal(ids.includes("overtaking"), true);
  assert.equal(ids.includes("hazard_ahead"), true);
  assert.equal(ids.includes("fuel_stop"), true);
});

test("el sistema de radio emite y registra mensajes en el canal activo", () => {
  const radio = createConvoyRadioSystem();
  assert.equal(radio.currentChannel.channel, 19);

  let received = null;
  radio.onMessage(msg => { received = msg; });

  radio.broadcast("hazard_ahead", { senderName: "Aster 01" });
  assert.notEqual(received, null);
  assert.equal(received.channel, 19);
  assert.equal(received.text.includes("Atasco"), true);
  assert.equal(received.sender, "Aster 01");

  radio.setChannel(9);
  assert.equal(radio.currentChannel.channel, 9);
});
