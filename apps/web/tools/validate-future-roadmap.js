import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(webRoot, 'public', 'future-features-1000.json'), 'utf8'));
const allowedStatuses = new Set(['implemented', 'scaffolded', 'specified', 'proposed']);
const allowedCompletionStates = new Set(['implemented', 'partial', 'not_implemented']);
const ids = new Set();
const trackedIds = new Set();

if (!Array.isArray(catalog.items) || catalog.items.length !== catalog.total) {
  throw new Error('El total del roadmap no coincide con sus elementos.');
}

for (const item of catalog.items) {
  if (ids.has(item.id)) throw new Error(`ID duplicado: ${item.id}`);
  ids.add(item.id);
  if (!allowedStatuses.has(item.status)) throw new Error(`Estado no valido en ${item.id}`);
  if (!allowedCompletionStates.has(item.completion_state)) throw new Error(`Situacion no valida en ${item.id}`);
  if (/[ÃÂ]/.test(`${item.title} ${item.description} ${item.dependency}`)) {
    throw new Error(`Texto mal codificado en ${item.id}`);
  }
  if (item.status === 'implemented' && (!Array.isArray(item.evidence) || item.evidence.length === 0)) {
    throw new Error(`Funcion implementada sin evidencia: ${item.id}`);
  }
  if (item.status !== 'implemented' && item.evidence?.length) {
    throw new Error(`Evidencia contradictoria en ${item.id}`);
  }
}

for (const state of allowedCompletionStates) {
  const actual = catalog.items.filter((item) => item.completion_state === state).length;
  if (catalog.completion?.[state] !== actual) throw new Error(`Contador incorrecto para ${state}`);
}

for (const status of allowedStatuses) {
  const actual = catalog.items.filter((item) => item.status === status).length;
  if (catalog[status] !== actual) throw new Error(`Contador incorrecto para ${status}`);
}

for (const task of catalog.tracked_tasks || []) {
  if (!task.id || trackedIds.has(task.id)) throw new Error(`Tarea nueva duplicada o sin ID: ${task.id || 'sin-id'}`);
  trackedIds.add(task.id);
  if (!allowedCompletionStates.has(task.status)) throw new Error(`Estado no valido en tarea ${task.id}`);
  if (!Array.isArray(task.products) || !task.products.length) throw new Error(`Productos no definidos en ${task.id}`);
  if (!Array.isArray(task.evidence)) throw new Error(`Evidencia invalida en ${task.id}`);
  if (task.status === 'implemented' && !task.evidence.length) throw new Error(`Tarea implementada sin evidencia: ${task.id}`);
}

console.log(`Roadmap valido: ${catalog.total} funciones; ${catalog.implemented} verificadas con evidencia.`);
