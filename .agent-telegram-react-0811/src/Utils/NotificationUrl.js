/**
 * Resolve notification destinations without allowing push payloads to turn
 * the service worker into an arbitrary external-link launcher.
 */
export function resolveNotificationTarget(value, origin) {
    try {
        const base = new URL(origin);
        const target = new URL(String(value || '/'), base);
        if (target.origin !== base.origin) return `${base.origin}/`;
        if (!['http:', 'https:'].includes(target.protocol)) return `${base.origin}/`;
        target.username = '';
        target.password = '';
        return target.href;
    } catch {
        return `${String(origin || '').replace(/\/$/, '')}/`;
    }
}
