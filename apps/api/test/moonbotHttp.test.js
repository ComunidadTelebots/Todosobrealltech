import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { moonbotHttp, createJsonTransport, createServiceLookup } from '../src/utils/moonbotHttp.js';
async function server(t, handler) {
  const app = http.createServer(handler);
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => { app.closeAllConnections(); app.close(); });
  return `http://127.0.0.1:${app.address().port}`;
}
test('Moonbot JSON transport preserves method, body, status and headers', async t => {
  const url = await server(t, (req, res) => {
    assert.equal(req.method, 'POST');
    let body = ''; req.on('data', chunk => body += chunk);
    req.on('end', () => { res.writeHead(201, {'Content-Type':'application/json'}); res.end(body); });
  });
  const result = await moonbotHttp(url, { method:'POST', body:'{"ok":true}' });
  assert.equal(result.status, 201); assert.deepEqual(await result.json(), {ok:true});
});
test('deadline aborts responses that send headers then stall', async t => {
  const url = await server(t, (req, res) => { res.writeHead(200); res.flushHeaders(); });
  await assert.rejects(moonbotHttp(url, { signal: AbortSignal.timeout(50) }));
});
test('empty 204 responses remain valid', async t => {
  const url = await server(t, (req, res) => { res.writeHead(204); res.end(); });
  assert.equal((await moonbotHttp(url)).status, 204);
});

test('a saturated service cannot block another service transport', async t => {
  let arrived = 0, ready;
  const full = new Promise(resolve => { ready = resolve; });
  const url = await server(t, (req, res) => {
    if (req.url === '/slow') { if (++arrived === 16) ready(); }
    else { res.writeHead(200); res.end('{}'); }
  });
  const stop = new AbortController();
  const busy = createJsonTransport();
  const independent = createJsonTransport();
  const tasks = Array.from({length:16}, () => busy(url+'/slow', {signal:stop.signal}).catch(() => {}));
  try {
    await full;
    const result = await independent(url+'/fast', {signal:AbortSignal.timeout(1000)});
    assert.equal(result.status,200);
  } finally { stop.abort(); await Promise.all(tasks); }
});

test('Docker lookup returns the all-address format without blocking getaddrinfo', async () => {
  const lookup = createServiceLookup({ resolve4: (name, cb) => { assert.equal(name,'moonbot'); cb(null,['172.20.0.2']); } });
  const result = await new Promise((resolve,reject) => lookup('moonbot',{all:true},(e,value) => e ? reject(e) : resolve(value)));
  assert.deepEqual(result,[{address:'172.20.0.2',family:4}]);
});
test('Docker lookup exposes resolution failures instead of retaining requests', async () => {
  const lookup = createServiceLookup({ resolve4: (_name,cb) => cb(new Error('DNS unavailable')) });
  await assert.rejects(new Promise((resolve,reject) => lookup('moonbot',{},(e,value) => e ? reject(e) : resolve(value))),/DNS unavailable/);
});
