import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createApiTraffic } from '../src/utils/apiTraffic.js';
import { projectOperations, projectResources } from '../src/utils/moonbotTelemetry.js';
import express from 'express';

test('counts HTTP classes and expires recent windows without losing totals', () => {
  let time = 120000;
  const traffic = createApiTraffic(() => time);
  traffic.record({ status: 200, durationMs: 15, family: 'moonbot-admin' });
  traffic.record({ status: 429, durationMs: 50, family: 'moonbot-admin' });
  traffic.record({ status: 503, durationMs: 500, family: 'auth' });
  const snapshot = traffic.snapshot();
  assert.equal(snapshot.last60s.requests, 3);
  assert.equal(snapshot.last60s.errors4xx, 1);
  assert.equal(snapshot.last60s.errors5xx, 1);
  assert.equal(snapshot.last60s.limited, 1);
  assert.equal(snapshot.last60s.p95Ms, 500);
  time += 61000;
  assert.equal(traffic.snapshot().last60s.requests, 0);
  assert.equal(traffic.snapshot().total.requests, 3);
  time += 3600000;
  assert.equal(traffic.snapshot().history.length, 60);
  assert.ok(traffic.snapshot().history.every((row) => row.requests === 0));
});
test('counts finish/close once and never retains raw paths or credentials', () => {
  const traffic = createApiTraffic();
  const response = new EventEmitter();
  response.statusCode = 200;
  response.writableFinished = true;
  traffic.middleware({ path: '/SECRET_TOKEN/private?password=secret' }, response, () => {});
  assert.equal(traffic.snapshot().inflight, 1);
  response.emit('finish'); response.emit('close');
  const snapshot = traffic.snapshot();
  assert.equal(snapshot.inflight, 0);
  assert.equal(snapshot.total.requests, 1);
  assert.equal(snapshot.routes[0].family, 'other');
  assert.ok(!JSON.stringify(snapshot).includes('SECRET'));
});
test('tracks aborted connections without fabricating an HTTP status', () => {
  const traffic = createApiTraffic();
  const response = new EventEmitter();
  traffic.middleware({ path: '/auth' }, response, () => {});
  response.emit('close');
  assert.equal(traffic.snapshot().total.aborted, 1);
  assert.equal(traffic.snapshot().total.errors5xx, 0);
});
test('telemetry projections reject incompatible contracts and remove sensitive fields', () => {
  assert.throws(() => projectOperations({ ok: true }));
  const ops = projectOperations({ ok: true, schema: 1, total: { received: 42, token: 'SECRET' }, last60s: { received: 'bad' }, logs: ['PRIVATE'] });
  assert.equal(ops.total.received, 42);
  assert.equal(ops.last60s.received, null);
  assert.ok(!JSON.stringify(ops).includes('SECRET'));
  const resources = projectResources({ ok: true, cpu: 12, ram: Infinity, logs: ['PRIVATE'], telemetry: ['SECRET'] });
  assert.equal(resources.cpu, 12);
  assert.equal(resources.ram, null);
  assert.ok(!JSON.stringify(resources).includes('PRIVATE'));
});

test('observes real HTTP responses through Express', async (t) => {
  const traffic = createApiTraffic();
  const app = express();
  app.use(traffic.middleware);
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/bots', (req, res) => res.sendStatus(429));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  assert.equal((await fetch(`${origin}/bots`)).status, 429);
  const snapshot = traffic.snapshot();
  assert.equal(snapshot.total.requests, 2);
  assert.equal(snapshot.total.limited, 1);
  assert.equal(snapshot.inflight, 0);
});


test('per-bot projection accepts only anonymous ids and numeric counters', () => {
  const result = projectOperations({ ok: true, schema: 1, total: {}, last60s: {}, bots: [
    { id: 'aabbccddeeff', token: 'SECRET', last60s: { calls: 2, received: -1, text: 'PRIVATE' } },
    { id: 'SECRET', last60s: { calls: 10 } },
  ] });
  assert.equal(result.bots.length, 1);
  assert.equal(result.bots[0].last60s.calls, 2);
  assert.equal(result.bots[0].last60s.received, null);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
