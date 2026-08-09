import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));

test('roadmap 6000 no marca completadas sin evidencia local declarada', () => {
  const roadmap = read('apps/web/public/future-features-1000.json');
  const ids = new Set();
  for (const item of roadmap.items) {
    assert.equal(ids.has(item.id), false, `ID duplicado: ${item.id}`);
    ids.add(item.id);
    if (item.status !== 'implemented') continue;
    assert.ok(Array.isArray(item.evidence) && item.evidence.length, `${item.id} no tiene evidencia`);
    for (const evidence of item.evidence.filter((value) => String(value).startsWith('apps/'))) {
      assert.equal(fs.existsSync(path.join(root, evidence)), true, `${item.id}: falta ${evidence}`);
    }
  }
  assert.equal(roadmap.implemented, roadmap.items.filter((item) => item.status === 'implemented').length);
});

test('roadmap Telegram React tiene IDs únicos, resumen coherente y evidencia no vacía', () => {
  const roadmap = read('apps/web/public/telegram-react-roadmap.json');
  assert.equal(new Set(roadmap.items.map((item) => item.id)).size, roadmap.items.length);
  for (const item of roadmap.items.filter((entry) => entry.status === 'implemented')) {
    assert.ok(item.evidence?.length, `${item.id} no tiene evidencia`);
    for (const evidence of item.evidence) assert.equal(String(evidence).includes('..'), false, `${item.id}: ruta insegura`);
  }
  assert.match(String(roadmap.version), /^\d+\.\d+\.\d+/);
  assert.equal(String(roadmap.version).split(/\s/)[0], String(roadmap.releases?.[0]?.version || ''));
  for (const status of ['implemented', 'partial', 'pending']) {
    assert.equal(roadmap.summary[status], roadmap.items.filter((item) => item.status === status).length);
  }
});
