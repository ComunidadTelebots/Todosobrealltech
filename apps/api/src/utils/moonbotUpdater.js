import http from 'node:http';

const fail = (message) => Object.assign(new Error(message), { status: 409 });
export function parseReleases(raw = '[]') {
  const rows = JSON.parse(raw); const ids = new Set();
  if (!Array.isArray(rows) || rows.length > 30) throw fail('Catálogo de versiones inválido');
  return rows.map(row => {
    if (!/^[a-z0-9_-]{1,64}$/.test(row.id || '') || ids.has(row.id) || !/^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$/.test(row.image || '')) throw fail('Cada versión requiere un identificador único y una imagen fijada por digest');
    ids.add(row.id); return { id: row.id, image: row.image, label: String(row.label || row.id).slice(0, 100) };
  });
}

// Never runs shell commands or accepts a Docker path/image from the browser.
export function engineRequest(endpoint, method = 'GET', payload, stream = false) {
  return new Promise((resolve, reject) => {
    const socketPath = process.env.MOON_DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');
    const req = http.request({ socketPath, path: endpoint, method, headers: payload ? { 'Content-Type': 'application/json' } : {} }, response => {
      let buffer = ''; let failed = false;
      response.on('data', chunk => {
        buffer += chunk;
        if (buffer.length > 2_000_000) { req.destroy(fail('Respuesta Docker demasiado grande')); return; }
        if (stream) {
          const lines = buffer.split('\n'); buffer = lines.pop();
          for (const line of lines) { try { if (JSON.parse(line).error) failed = true; } catch { failed = true; } }
        }
      });
      response.on('end', () => {
        if (response.statusCode >= 400 || failed) return reject(fail('Docker no pudo completar la operación'));
        try { const result = buffer.trim() ? JSON.parse(buffer) : {}; if (result.error) throw new Error(); resolve(result); }
        catch { reject(fail('Respuesta Docker inválida')); }
      });
    });
    req.setTimeout(stream ? 600000 : 30000, () => req.destroy(fail('Tiempo de espera de Docker agotado')));
    req.on('error', () => reject(fail('No se pudo completar la operación Docker')));
    if (payload) req.write(JSON.stringify(payload));
    req.end();
  });
}

export async function replaceStoppedContainer({ container, image, suffix, engine = engineRequest, phase = async () => {} }) {
  const endpoint = name => `/containers/${encodeURIComponent(name)}`;
  let old = await engine(`${endpoint(container)}/json`);
  if (old.State?.Running || old.State?.Restarting || old.HostConfig?.AutoRemove) throw fail('La actualización requiere una reserva detenida sin AutoRemove');
  // External orchestration and shared namespaces need a dedicated deployment adapter.
  if (old.Config?.Labels?.['com.docker.swarm.service.id'] || ['NetworkMode', 'PidMode', 'IpcMode'].some(key => String(old.HostConfig?.[key] || '').startsWith('container:'))) throw fail('Configuración de contenedor no compatible');
  await phase('downloading');
  await engine(`/images/create?fromImage=${encodeURIComponent(image)}`, 'POST', undefined, true);
  const downloaded = await engine(`/images/${encodeURIComponent(image)}/json`);
  if (!(downloaded.RepoDigests || []).includes(image)) throw fail('El digest descargado no coincide');
  old = await engine(`${endpoint(container)}/json`);
  if (old.State?.Running || old.State?.Restarting) throw fail('La reserva se ha arrancado durante la descarga');
  const backup = `${container}-previous-${suffix}`;
  const config = { ...old.Config, Image: image, HostConfig: { ...old.HostConfig } };
  // Bind each existing volume by its Docker name, including originally anonymous volumes.
  if (Array.isArray(config.HostConfig.Mounts)) config.HostConfig.Mounts = config.HostConfig.Mounts.map(mount => {
    const actual = (old.Mounts || []).find(row => row.Type === 'volume' && row.Destination === mount.Target);
    return mount.Type === 'volume' && actual ? { ...mount, Source: actual.Name } : mount;
  });
  const existingTargets = new Set((config.HostConfig.Binds || []).map(bind => bind.split(':')[1]));
  config.HostConfig.Binds = [...(config.HostConfig.Binds || [])];
  for (const mount of old.Mounts || []) {
    if (mount.Type === 'volume' && !existingTargets.has(mount.Destination) && !(config.HostConfig.Mounts || []).some(row => row.Target === mount.Destination)) {
      config.HostConfig.Binds.push(`${mount.Name}:${mount.Destination}:${mount.RW ? 'rw' : 'ro'}`);
    }
  }
  const networks = Object.entries(old.NetworkSettings?.Networks || {});
  config.NetworkingConfig = { EndpointsConfig: Object.fromEntries(networks.map(([name, settings]) => [name, { Aliases: (settings.Aliases || []).filter(alias => alias !== old.Id?.slice(0, 12)), IPAMConfig: settings.IPAMConfig || undefined }])) };
  await phase('replacing', { backup });
  await engine(`${endpoint(container)}/update`, 'POST', { RestartPolicy: { Name: 'no' } });
  await engine(`${endpoint(container)}/rename?name=${encodeURIComponent(backup)}`, 'POST');
  let createdId;
  try {
    const created = await engine(`/containers/create?name=${encodeURIComponent(container)}`, 'POST', config);
    createdId = created.Id;
    if (!createdId) throw fail('Docker no confirmó el contenedor nuevo');
    const result = await engine(`${endpoint(createdId)}/json`);
    if (result.State?.Running || result.Image !== downloaded.Id) throw fail('No se pudo verificar la reserva actualizada');
    return { backup, image, container };
  } catch {
    // Do not delete on an uncertain create response. Preserve both candidates for recovery.
    if (createdId) {
      const current = await engine(`${endpoint(createdId)}/json`);
      if (current.State?.Running) throw fail(`Recuperación manual necesaria; anterior: ${backup}`);
      await engine(`${endpoint(createdId)}?v=false`, 'DELETE');
    } else {
      // A failed create may still have succeeded; do not overwrite a name in that case.
      try { await engine(`${endpoint(container)}/json`); throw fail(`Recuperación manual necesaria; anterior: ${backup}`); }
      catch (error) { if (error.message.startsWith('Recuperación')) throw error; }
    }
    await engine(`${endpoint(backup)}/rename?name=${encodeURIComponent(container)}`, 'POST');
    await engine(`${endpoint(container)}/update`, 'POST', { RestartPolicy: old.HostConfig.RestartPolicy || { Name: 'no' } });
    throw fail('Actualización fallida; se ha restaurado el nombre del contenedor anterior');
  }
}
