import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const WINDOW = 300000;
const RETENTION = 7 * 86400000;
const RULES = {
  denied_open: { threshold: 5, title: 'Accesos reiterados sin permiso', severity: 'warning', explanation: 'Cinco solicitudes de apertura denegadas en cinco minutos. Revisa si la cuenta está usando enlaces antiguos o intentando acceder a otros entornos.' },
  denied_assign: { threshold: 1, title: 'Intento de modificar permisos sin autorización', severity: 'high', explanation: 'Una cuenta autenticada intentó asignar permisos sin disponer de autorización vigente de creador.' },
  sessions: { threshold: 20, title: 'Apertura inusual de sesiones', severity: 'warning', explanation: 'Veinte aperturas de sesión en cinco minutos. Puede ser automatización o un bucle de la interfaz; no demuestra abuso por sí solo.' },
  denied_gate: { threshold: 5, title: 'Uso continuado de un acceso revocado', severity: 'warning', explanation: 'Una sesión firmada y vigente sigue intentando acceder sin permiso. Se cuenta como máximo una petición cada treinta segundos por cuenta y entorno; revisa también pestañas abiertas.' },
  invalid_signature: { threshold: 20, title: 'Firmas de sesión inválidas reiteradas', severity: 'warning', explanation: 'Veinte muestras de cookies inválidas en cinco minutos en el gateway. Es un agregado sin identidad atribuida; no equivale a veinte personas ni a un mismo atacante.' },
  broad_grant: { threshold: 1, title: 'Ampliación de permisos para revisar', severity: 'warning', explanation: 'Se amplió el acceso general o una cuenta recibió tres o más entornos adicionales. La operación estaba autorizada; revisa que su alcance sea el previsto.' },
};
const cleanId = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(value) ? value : null;

// A single API writer, like the environment policy manager. No tokens, IPs, bodies or messages.
export function createPermissionAbuseMonitor({ stateFile, now = () => Date.now(), io = fs } = {}) {
  let state; let healthy = true; let queue = Promise.resolve();
  const serialize = (action) => {
    const next = queue.then(action);
    queue = next.catch(() => {});
    return next;
  };
  async function read() {
    if (state) return;
    try {
      const value = JSON.parse(await io.readFile(stateFile, 'utf8'));
      if (value.version !== 1 || !Array.isArray(value.events) || !Array.isArray(value.alerts)) throw new Error('Invalid audit state');
      state = value;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = { version: 1, events: [], alerts: [] };
    }
  }
  function prune() {
    state.events = state.events.filter((item) => item.at > now() - WINDOW && item.at <= now()).slice(-2000);
    state.alerts = state.alerts.filter((item) => item.lastAt > now() - RETENTION).slice(-200);
  }
  async function save() {
    await io.mkdir(path.dirname(stateFile), { recursive: true });
    await io.writeFile(`${stateFile}.tmp`, JSON.stringify(state), { mode: 0o600 });
    await io.rename(`${stateFile}.tmp`, stateFile);
    healthy = true;
  }
  return {
    record(input) {
      return serialize(async () => {
        try {
          if (!RULES[input.kind]) return false;
          await read(); prune();
          const actor = input.kind === 'invalid_signature' ? null : cleanId(input.actor); const target = cleanId(input.target);
          // Never derive an account from an unsigned cookie. Anonymous samples share one bucket.
          if (!actor && input.kind !== 'invalid_signature') return false;
          const kind = input.kind;
          const cooldown = kind === 'denied_gate' ? 30000 : kind === 'invalid_signature' ? 2000 : 0;
          if (cooldown && state.events.some((item) => item.kind === kind && item.actor === actor && item.target === target && item.at > now() - cooldown)) return true;
          const event = { kind, actor, target, at: now() };
          // Scope and deltas are fixed policy identifiers, never the incoming body.
          if (kind === 'broad_grant') {
            event.scope = cleanId(input.scope);
            event.added = (Array.isArray(input.added) ? input.added : []).map(cleanId).filter(Boolean).slice(0, 24);
          }
          state.events.push(event); prune();
          const count = state.events.filter((item) => item.kind === kind && item.actor === actor).length;
          const rule = RULES[kind];
          if (count >= rule.threshold) {
            let alert = state.alerts.find((item) => item.kind === kind && item.actor === actor && item.lastAt > now() - WINDOW);
            if (!alert) { alert = { id: crypto.randomUUID(), kind, actor, firstAt: now(), status: 'open' }; state.alerts.push(alert); }
            Object.assign(alert, { lastAt: now(), count, status: 'open', target, scope: event.scope, added: event.added });
          }
          prune(); await save(); return true;
        } catch { healthy = false; return false; } // Detection failure must not turn a denial into authorization.
      });
    },
    snapshot() {
      return serialize(async () => {
        try { await read(); prune(); }
        catch { healthy = false; }
        return { available: healthy, retentionDays: 7, windowSeconds: 300, maxAlerts: 200,
          observedSince: state?.events[0]?.at || null,
          rules: Object.entries(RULES).map(([kind, value]) => ({ kind, ...value })),
          alerts: (state?.alerts || []).slice().reverse().map((item) => ({ ...item, ...RULES[item.kind] })),
        };
      });
    },
    review(id, actor, outcome) {
      return serialize(async () => {
        if (!cleanId(actor) || !['expected', 'investigate'].includes(outcome)) throw Object.assign(new Error('Revisión inválida'), { status: 400 });
        let alert; let previous;
        try {
          await read(); prune();
          alert = state.alerts.find((item) => item.id === id);
          if (!alert) throw Object.assign(new Error('Alerta no encontrada'), { status: 404 });
          previous = { ...alert };
          Object.assign(alert, { status: 'reviewed', reviewedBy: actor, reviewedAt: now(), outcome });
          await save(); return { ok: true };
        } catch (error) {
          if (error.status) throw error;
          if (alert && previous) state.alerts[state.alerts.indexOf(alert)] = previous;
          healthy = false;
          throw Object.assign(new Error('No se pudo guardar la revisión'), { status: 503 });
        }
      });
    },
  };
}
