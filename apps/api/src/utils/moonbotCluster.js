import crypto from 'node:crypto';
import { parseReleases, replaceStoppedContainer } from './moonbotUpdater.js';
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

export function createMoonbotCluster({ nodes, docker = dockerRequest, fetcher = fetch, stateFile, token = '', wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 15, adminKey = '', releases = [], replaceContainer = replaceStoppedContainer }) {
  let busy = false;
  let state = null;
  let interrupted = false;
  async function read() {
    if (state) return state;
    try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw failure('No se puede leer el estado del clúster', 503); state = { active: nodes[0]?.id || null, events: [] }; }
    interrupted = state.job?.status === 'running';
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
    return { image: data.Config?.Image || null, running: data.State?.Running === true, status: data.State?.Status || 'unknown', health: data.State?.Health?.Status || null, restarting: data.State?.Restarting === true,
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
    if (saved.paused) throw failure('El tráfico del clúster está pausado', 503);
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
    const active = saved.paused ? null : saved.active || (running.length === 1 ? running[0].id : null);
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
    const traffic = await Promise.all(rows.filter(row => row.running).map(async row => {
      try { return { node: row.id, ...await botRequest(row.id) }; }
      catch { return { node: row.id, ok: false, error: 'Control por bot no disponible; comprueba versión, clave y MOON_NODE_ID' }; }
    }));
    const peerLatency = await Promise.all(rows.filter(row => row.running).map(async row => {
      try {
        const node = nodes.find(item => item.id === row.id);
        if (!adminKey) throw new Error();
        const response = await fetcher(`${node.url}/api/internal/peer-latency`, { headers: { 'X-Moon-Admin-Key': adminKey }, redirect: 'error', signal: AbortSignal.timeout(3000) });
        const payload = await response.json();
        if (!response.ok || payload.ok !== true || payload.node !== row.id || !Array.isArray(payload.rows)) throw new Error();
        return { source: row.id, configured: payload.configured === true, refreshing: payload.refreshing === true,
          rows: payload.rows.slice(0, 12).filter(item => item.target !== row.id && nodes.some(peer => peer.id === item.target)).map(item => ({ target: item.target, ok: item.ok === true,
            ms: typeof item.ms === 'number' && Number.isFinite(item.ms) && item.ms >= 0 ? item.ms : null,
            at: typeof item.at === 'number' && Number.isFinite(item.at) ? item.at : null })) };
      } catch { return { source: row.id, error: 'Medición entre nodos no disponible', rows: [] }; }
    }));
    return { peerLatency, paused: saved.paused === true, job: saved.job || null, interrupted, releases, traffic,
      ok: true, configured: nodes.length > 0, active, busy, nodes: rows, balancer, balancerError, operations, resources, telemetryErrors,
      api: apiTraffic.snapshot(), events: saved.events, observedAt: new Date().toISOString() };
  }
  async function switchTo({ from, to, actor }) {
    if (interrupted) throw failure('Operación interrumpida; requiere revisar el estado persistido');
    if (busy) throw failure('Ya hay una conmutación en curso');
    const source = nodes.find((node) => node.id === from);
    const target = nodes.find((node) => node.id === to);
    if (!source || !target || source === target) throw failure('Selecciona dos nodos configurados diferentes', 400);
    busy = true;
    let targetAttempted = false;
    let sourceStopped = false;
    try {
      const saved = await read();
      if (interrupted) throw failure('Operación interrumpida; revisa el estado persistido');
      if (saved.paused) throw failure('Reanuda el clúster antes de conmutar');
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
  async function botRequest(id, body) {
    const node = nodes.find(row => row.id === id);
    if (!node || !adminKey) throw failure('Nodo o clave interna no configurados');
    const response = await fetcher(`${node.url}/api/internal/traffic`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(6000),
      headers: { 'X-Moon-Admin-Key': adminKey, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok || payload.node !== id || !Array.isArray(payload.bots) || payload.bots.length > 200) throw failure('El nodo no confirmó el estado del bot');
    return { ok: true, bots: payload.bots.filter(row => /^[a-f0-9]{12}$/.test(row.id)).slice(0, 200).map(row => ({
      id: row.id, name: String(row.name || row.id).slice(0, 100), paused: row.paused === true,
      controllable: row.controllable === true, revision: row.revision, offset: row.offset, inflight: row.inflight,
    })) };
  }
  async function isolatedBot(id, destination) {
    for (const node of nodes) {
      const status = await inspect(node);
      if (status.restarting) throw failure('Otro nodo está reiniciando; no se puede confirmar la exclusividad');
      if (!status.running) continue;
      const bot = (await botRequest(node.id)).bots.find(row => row.id === id);
      if (bot && node.id !== destination && (!bot.paused || bot.inflight !== 0)) throw failure('Otro nodo aún admite tráfico de este bot');
    }
  }
  async function drain(node, bot) {
    await botRequest(node, { id: bot.id, action: 'pause', revision: bot.revision });
    for (let index = 0; index < 120; index++) {
      const current = (await botRequest(node)).bots.find(row => row.id === bot.id);
      if (current?.paused && current.inflight === 0) return current;
      await wait(1000);
    }
    throw failure('Pausa solicitada, pero quedan peticiones en curso. No se activó el destino');
  }
  async function startJob(input) {
    await read();
    if (busy || interrupted) throw failure('Hay una operación pendiente o interrumpida');
    if (!['pause-container', 'resume-container', 'start-worker', 'update', 'pause-bot', 'resume-bot', 'transfer-bot'].includes(input.action)) throw failure('Acción inválida', 400);
    const source = nodes.find(row => row.id === input.node);
    if (!source) throw failure('Nodo no configurado', 400);
    const release = releases.find(row => row.id === input.release);
    if (input.action === 'update' && !release) throw failure('Versión no autorizada', 400);
    const job = { id: crypto.randomUUID(), status: 'running', step: 'checking', action: input.action,
      node: source.id, actor: input.actor, at: new Date().toISOString() };
    busy = true;
    try { await save({ ...await read(), job }); }
    catch (error) { busy = false; throw error; }
    const phase = async (step, details = {}) => { Object.assign(job, { step, ...details }); await save({ ...await read(), job: { ...job } }); };
    const run = async () => {
      try {
        if (input.action === 'update') {
          if ((await read()).active === source.id && !(await read()).paused) throw failure('Deriva o pausa el Docker activo antes de actualizarlo');
          const result = await replaceContainer({ container: source.container, image: release.image, suffix: job.id.slice(0, 8), phase });
          await phase('prepared', { backup: result.backup, release: release.id });
        } else if (input.action === 'start-worker') {
          const details = await docker(source.container);
          const env = details.Config?.Env || [];
          if (!env.includes('MOON_TRAFFIC_CONTROL_ENABLED=true') || !env.includes(`MOON_NODE_ID=${source.id}`) || !env.includes('MOON_TRAFFIC_BOOT_PAUSED=true') || !env.includes('MOON_TRAFFIC_DEFAULT_PAUSED=true') || env.some(value => /^TDLIB_API_(ID|HASH)=.+/.test(value))) throw failure('La reserva requiere MOON_NODE_ID, pausa al arrancar y TDLib desactivado para trabajar por bot');
          if (details.State?.Running) throw failure('El nodo ya está arrancado');
          await phase('starting-paused');
          try {
            await docker(source.container, 'start', 'POST');
            await ready(source);
            if ((await botRequest(source.id)).bots.some(bot => !bot.paused || bot.inflight !== 0)) throw failure('La reserva no confirmó la pausa inicial');
          } catch (error) { await docker(source.container, 'stop?t=30', 'POST'); throw error; }
        } else if (input.action === 'pause-container') {
          await phase('stopping');
          // Persist routing pause first; never fall back to another URL while stopped.
          const saved = await read();
          if (saved.active === source.id) await save({ ...saved, paused: true });
          await docker(source.container, 'stop?t=30', 'POST');
          const stopped = await inspect(source);
          if (stopped.running || stopped.restarting) throw failure('Docker no confirmó la parada');
        } else if (input.action === 'resume-container') {
          for (const node of nodes) { const current = await inspect(node); if (node !== source && (current.running || current.restarting)) throw failure('Hay otro Docker activo; utiliza la conmutación'); }
          await phase('starting');
          await docker(source.container, 'start', 'POST');
          try { await ready(source); } catch (error) { await docker(source.container, 'stop?t=30', 'POST'); throw error; }
          await save({ ...await read(), paused: false, active: source.id });
        } else {
          const bot = (await botRequest(source.id)).bots.find(row => row.id === input.bot);
          if (!bot?.controllable) throw failure('Bot no disponible para control individual; usa el control del Docker para TDLib');
          if (input.action === 'pause-bot') { await phase('draining'); await drain(source.id, bot); }
          if (input.action === 'resume-bot') {
            await isolatedBot(bot.id, source.id);
            await botRequest(source.id, { id: bot.id, action: 'resume', revision: bot.revision });
          }
          if (input.action === 'transfer-bot') {
            if (source.id === input.to) throw failure('Selecciona otro nodo');
            const target = (await botRequest(input.to)).bots.find(row => row.id === bot.id);
            if (!target?.controllable || !target.paused || target.inflight !== 0) throw failure('El destino debe tener el mismo bot configurado, pausado y sin peticiones');
            await phase('draining', { to: input.to });
            const checkpoint = await drain(source.id, bot);
            await isolatedBot(bot.id, input.to);
            await phase('activating');
            await botRequest(input.to, { id: bot.id, action: 'resume', revision: target.revision, offset: checkpoint.offset });
            // On ambiguous failure the source stays paused: no automatic double activation.
          }
        }
        job.status = 'completed'; job.step = 'completed';
      } catch (error) { job.status = 'failed'; job.error = error.message; }
      finally {
        try {
          await save({ ...await read(), job: { ...job, finishedAt: new Date().toISOString() } });
          await event(job.status === 'completed' ? 'operation_completed' : 'operation_failed', source.id, input.to || source.id, input.actor);
        } catch { interrupted = true; }
        busy = false;
      }
    };
    setTimeout(() => { run().catch(() => { interrupted = true; busy = false; }); }, 0);
    return { ok: true, job: { ...job } };
  }
  return { snapshot, switchTo, activeUrl, startJob };

}

let singleton;
export function moonbotCluster() {
  if (!singleton) singleton = createMoonbotCluster({ nodes: parseNodes(process.env.MOON_CLUSTER_NODES), token: process.env.MOON_BALANCER_TOKEN, adminKey: process.env.MOON_ADMIN_API_KEY, releases: parseReleases(process.env.MOON_CLUSTER_RELEASES),
    stateFile: process.env.MOON_CLUSTER_STATE_FILE || path.resolve('data/moonbot-cluster.json') });
  return singleton;
}
