import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { resolveNotificationTarget } from './Utils/NotificationUrl';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);
clientsClaim();

// Keep client-side routes available after a refresh or while offline. API and
// asset requests must never be answered with the application shell.
registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
        denylist: [/^\/api(?:\/|$)/, /\/[^/?]+\.[^/]+$/]
    })
);

self.addEventListener('push', event => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; }
    catch { payload = { description: event.data ? event.data.text() : '' }; }
    const targetUrl = payload.url || payload.link || payload.data?.url || '/';
    const options = {
        body: payload.description || payload.body || '',
        icon: payload.icon || '/favicon.ico', badge: payload.badge || '/favicon.ico',
        tag: payload.tag || undefined,
        renotify: Boolean(payload.renotify && payload.tag),
        data: { ...(payload.data || {}), url: targetUrl },
    };
    event.waitUntil(self.registration.showNotification(payload.title || 'Telegram', options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = resolveNotificationTarget(event.notification.data?.url, self.location.origin);
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
        const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
        if (existing) { existing.navigate(target); return existing.focus(); }
        return clients.openWindow(target);
    }));
});
