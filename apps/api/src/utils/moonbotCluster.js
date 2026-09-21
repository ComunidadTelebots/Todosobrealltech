import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { apiTraffic } from './apiTraffic.js';
import { projectOperations, projectResources } from './moonbotTelemetry.js';

const failure = (message, status = 409) => Object.assign(new Error(message), { status });

export function parseNodes(raw = '[]') {
  let nodes;
  try { nodes = JSON.parse(raw); }
  catch { throw failure('MOON_CLUSTER_NODES debe ser una lista JSON válida', 503); }
  if (!Array.isArray(nodes) || nodes.length > 12) throw failure('Configuración de nodos inválida', 503);
  const ids = new Set();
  const containers = new Set();
  return nodes.map(({ id, container, url }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id || '') || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(container || '') || ids.has(id) || containers.has(container)) {
      throw failure('Identificadores de nodos inválidos o duplicados', 503);
    }
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw failure('Cada nodo necesita un origen HTTP sin credenciales', 503);
    }
    ids.add(id); containers.add(container);
    return { id, container, url: parsed.origin };
  });
}

// Only fixed container endpoints are called; no shell or browser-supplied URLs.
export function dockerRequest(container, action = 'json', method = 'GET') {
  return new Promise((resolve, reject) => {
    const socketPath = process.env.MOON_DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');
    const req = http.request({ socketPath, path: `/containers/${encodeURIComponent(container)}/${action}`, method }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; if (body.length > 2_000_000) req.destroy(failure('Respuesta Docker demasiado grande', 502)); });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(failure(`Docker HTTP ${res.statusCode}`, 502));
        try { resolve(body ? JSON.parse(body) : {}); } catch { reject(failure('Respuesta Docker inválida', 502)); }
      });
    });
    req.setTimeout(25000, () => req.destroy(failure('Docker no responde', 504)));
    req.on('error', () => reject(failure('No se puede conectar con Docker', 503)));
    req.end();
  });
}

export function createMoonbotCluster({ nodes, docker = dockerRequest, fetcher = fetch, stateFile, token = '', wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 15 }) {
  let busy = false;
  let state = null;
  async function read() {
    if (state) return state;
    try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw failure('No se puede leer el estado del clúster', 503); state = { active: nodes[0]?.id || null, events: [] }; }
    return state;
  }
  async function save(next) {
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(`${stateFile}.tmp`, JSON.stringify(next), { mode: 0o600 });
    await fs.rename(`${stateFile}.tmp`, stateFile);
    state = next;
  }
  async function event(status, from, to, actor) {
    const previous = await read();
    await save({ ...previous, events: [{ at: new Date().toISOString(), status, from, to, actor }, ...previous.events].slice(0, 100) });
  }
  async function inspect(node) {
    const data = await docker(node.container);
    return { running: data.State?.Running === true, status: data.State?.Status || 'unknown', health: data.State?.Health?.Status || null, restarting: data.State?.Restarting === true,
      restarts: data.RestartCount ?? null, oomKilled: data.State?.OOMKilled === true,
      limits: { memoryBytes: data.HostConfig?.Memory || null, cpus: data.HostConfig?.NanoCpus ? data.HostConfig.NanoCpus / 1e9 : data.HostConfig?.CpuQuota > 0 && data.HostConfig?.CpuPeriod > 0 ? data.HostConfig.CpuQuota / data.HostConfig.CpuPeriod : null, pids: data.HostConfig?.PidsLimit > 0 ? data.HostConfig.PidsLimit : null } };
  }
  async function health(node) {
    try {
      const response = await fetcher(`${node.url}/health`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
      const data = await response.json();
      return response.ok && data.ok === true;
    } catch { return false; }
  }
  async function ready(node) {
    for (let index = 0; index < attempts; index++) {
      const current = await inspect(node);
      if (current.running && !current.restarting && current.health !== 'unhealthy' && await health(node)) return;
      await wait(1000);
    }
    throw failure('El contenedor no superó la comprobación de salud', 502);
  }
  async function activeUrl(fallback) {
    const saved = await read();
    return nodes.find((node) => node.id === saved.active)?.url || fallback;
  }
  async function snapshot() {
    const saved = await read();
    const rows = await Promise.all(nodes.map(async (node) => {
      try {
        const current = await inspect(node);
        const healthy = current.running && await health(node);
        return { id: node.id, container: node.container, ...current, healthy };
      } catch (error) { return { id: node.id, container: node.container, status: 'unavailable', healthy: false, error: error.message }; }
    }));
    const running = rows.filter((node) => node.running);
    const active = saved.active || (running.length === 1 ? running[0].id : null);
    const node = nodes.find((item) => item.id === active);
    let balancer = null;
    let balancerError = '';
    let operations = null;
    let resources = null;
    const telemetryErrors = [];
    const telemetryTask = (async () => {
    if (token && node) {
      await Promise.all([
        ['/api/telemetry/operations', projectOperations, (value) => { operations = value; }, 'Telegram: instala la instrumentación de telemetría en Moonbot o comprueba su JWT.'],
        ['/api/status', projectResources, (value) => { resources = value; }, 'No se han podido consultar los recursos de Moonbot.'],
      ].map(async ([endpoint, project, assign, message]) => {
        try {
          const response = await fetcher(`${node.url}${endpoint}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000), redirect: 'error' });
          if (!response.ok) throw new Error();
          assign(project(await response.json()));
        } catch { telemetryErrors.push(message); }
      }));
    } else telemetryErrors.push('Configura un nodo y MOON_BALANCER_TOKEN para leer Telegram y los recursos.');
    })();
    const balancerTask = (async () => {
    if (!token) balancerError = 'Falta MOON_BALANCER_TOKEN para consultar el balanceador de aprendizaje.';
    else if (node) {
      try {
        const response = await fetcher(`${node.url}/api/ia/load_balancer`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000), redirect: 'error' });
        const data = await response.json();
        if (!response.ok || data.ok !== true || !data.state || !data.stats) throw new Error();
        // Project only the fields consumed by the web, never forward arbitrary upstream data.
        balancer = { active: data.state.active === true, workers: data.state.workers, processed_sources: data.state.processed_sources, started: data.state.started,
          plan: data.state.last_plan || {}, words: data.stats.words, rate: data.stats.rate, progress: data.stats.billion_progress };
      } catch { balancerError = 'Moonbot no devuelve telemetría válida del balanceador.'; }
    }
    })();
    await Promise.all([telemetryTask, balancerTask]);
    return { ok: true, configured: nodes.length > 0, active, busy, nodes: rows, balancer, balancerError, operations, resources, telemetryErrors,
      api: apiTraffic.snapshot(), events: saved.events, observedAt: new Date().toISOString() };
  }
  async function switchTo({ from, to, actor }) {
    if (busy) throw failure('Ya hay una conmutación en curso');
    const source = nodes.find((node) => node.id === from);
    const target = nodes.find((node) => node.id === to);
    if (!source || !target || source === target) throw failure('Selecciona dos nodos configurados diferentes', 400);
    busy = true;
    let targetAttempted = false;
    let sourceStopped = false;
    try {
      const saved = await read();
      if (saved.active && saved.active !== from) throw failure('El nodo activo cambió; actualiza el panel');
      for (const node of nodes) {
        const current = await inspect(node);
        if (node !== source && (current.running || current.restarting)) throw failure('Hay otro contenedor en ejecución; resuelve el conflicto antes de conmutar');
      }
      await event('started', from, to, actor);
      await docker(source.container, 'stop?t=15', 'POST');
      const stopped = await inspect(source);
      if (stopped.running || stopped.restarting) throw failure('No se pudo confirmar la parada del origen');
      sourceStopped = true;
      targetAttempted = true;
      await docker(target.container, 'start', 'POST');
      await ready(target);
      await save({ ...await read(), active: to });
      await event('completed', from, to, actor);
      return { ok: true, active: to };
    } catch (error) {
      let status = 'failed';
      if (sourceStopped) {
        try {
          if (targetAttempted) await docker(target.container, 'stop?t=15', 'POST');
          const stopped = await inspect(target);
          if (stopped.running || stopped.restarting) throw new Error('Destino aún activo');
          await docker(source.container, 'start', 'POST');
          await ready(source);
          await save({ ...await read(), active: from });
          status = 'rolled_back';
        } catch { status = 'recovery_required'; }
      }
      await event(status, from, to, actor);
      throw failure(`${error.message}. ${status === 'rolled_back' ? 'Se ha restaurado el origen.' : status === 'recovery_required' ? 'Es necesaria recuperación manual; revisa ambos contenedores.' : 'Revisa el estado antes de reintentar.'}`, error.status || 502);
    } finally { busy = false; }
  }
  return { snapshot, switchTo, activeUrl };
}

let singleton;
export function moonbotCluster() {
  if (!singleton) singleton = createMoonbotCluster({ nodes: parseNodes(process.env.MOON_CLUSTER_NODES), token: process.env.MOON_BALANCER_TOKEN,
    stateFile: process.env.MOON_CLUSTER_STATE_FILE || path.resolve('data/moonbot-cluster.json') });
  return singleton;
}
