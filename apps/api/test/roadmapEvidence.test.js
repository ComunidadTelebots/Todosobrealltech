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

  const trackedIds = new Set();
  for (const task of roadmap.tracked_tasks || []) {
    assert.equal(trackedIds.has(task.id), false, `ID de tarea duplicado: ${task.id}`);
    trackedIds.add(task.id);
    assert.equal(ids.has(task.id), false, `ID compartido entre catálogo y tarea: ${task.id}`);
    if (task.status !== 'implemented') continue;
    assert.ok(Array.isArray(task.evidence) && task.evidence.length, `${task.id} no tiene evidencia`);
    for (const evidence of task.evidence) {
      assert.equal(String(evidence).includes('..'), false, `${task.id}: ruta insegura`);
      if (!String(evidence).startsWith('apps/')) continue;
      assert.equal(fs.existsSync(path.join(root, evidence)), true, `${task.id}: falta ${evidence}`);
    }
  }
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

test('lote runtime sin ejecución real permanece parcial', () => {
  const roadmap = read('apps/web/public/future-features-1000.json');
  const byId = new Map(roadmap.items.map((item) => [item.id, item]));
  const auditedIds = [];
  for (let number = 5042; number <= 5159; number += 3) {
    auditedIds.push(`future-${String(number).padStart(4, '0')}`);
  }
  assert.equal(auditedIds.length, 40);
  for (const id of auditedIds) {
    const item = byId.get(id);
    assert.ok(item, `${id} no existe`);
    assert.equal(item.status, 'scaffolded', `${id} no puede figurar como implementada mientras su runtime devuelve executed=false`);
    assert.equal(item.completion_state, 'partial');
    assert.ok(item.evidence?.some((entry) => String(entry).includes('manifest.py')), `${id} no conserva evidencia del manifiesto auditado`);
  }
});
