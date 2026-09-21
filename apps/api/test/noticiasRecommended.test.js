import test from 'node:test';
import assert from 'node:assert/strict';
import { RECOMMENDED_ITEMS, RECOMMENDED_SLOTS } from '../src/routes/noticias-recommended.js';

test('NoticiasWeb3 lego slots are unique and backed by content', () => {
  const ids = RECOMMENDED_SLOTS.map((slot) => slot.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const slot of ids) assert.ok(RECOMMENDED_ITEMS.some((item) => item.slots.includes(slot)), `${slot} has content`);
});

test('recommended lego entries use safe local or HTTPS destinations', () => {
  for (const item of RECOMMENDED_ITEMS) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(item.url.startsWith('/') || item.url.startsWith('https://'));
    assert.ok(item.slots.every((slot) => RECOMMENDED_SLOTS.some((entry) => entry.id === slot)));
  }
});
