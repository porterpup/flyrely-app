/*
 * FlyRely service worker: web push only.
 *
 * Safety rules (see docs/COPILOT_PUSH.md):
 *  - NO fetch handler and no Cache Storage use. This worker never touches how the app loads, so a deploy can
 *    never be served stale because of it.
 *  - Only `push` and `notificationclick` do anything.
 *  - skipWaiting + clients.claim are safe because there is nothing cached to migrate: a new
 *    version of this file takes over immediately.
 *  - Safe to unregister at any time: navigator.serviceWorker.getRegistrations() then
 *    .unregister(), or DevTools > Application > Service Workers > Unregister. The app keeps
 *    working; only push alerts stop.
 *
 * Payload contract (plan section 4.6): { v, kind, title, body, url, client_flight_id }.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePayload(event) {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== 'object') data = {};
  return {
    kind: typeof data.kind === 'string' ? data.kind : 'test',
    title: typeof data.title === 'string' && data.title ? data.title : 'FlyRely',
    body: typeof data.body === 'string' ? data.body : '',
    url: typeof data.url === 'string' ? data.url : '/',
    flightId: typeof data.client_flight_id === 'string' ? data.client_flight_id : '',
  };
}

self.addEventListener('push', (event) => {
  const p = parsePayload(event);
  event.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // One notification per flight and kind: a repeat replaces instead of stacking.
      tag: p.flightId ? p.flightId + ':' + p.kind : p.kind,
      data: { url: p.url },
    })
  );
});

// Only same-origin paths are followed. Anything else falls back to the home page.
function safeTarget(raw) {
  try {
    const u = new URL(raw, self.location.origin);
    if (u.origin !== self.location.origin) return '/';
    return u.pathname + u.search + u.hash;
  } catch (e) {
    return '/';
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = safeTarget(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          try {
            if ('navigate' in w) await w.navigate(target);
          } catch (e) {
            // navigate can fail on uncontrolled clients; focusing is still useful
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
