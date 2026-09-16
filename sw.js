// v13 — cache busted, no caching to prevent stale JS issues; fixed notification-tap 404 on GitHub Pages subpath
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
// Always fetch fresh from network — no caching
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
});

// A customer's reply to something like an On My Way text should ring the phone even
// when Thrive isn't open at all — this is what makes that possible. The server side
// (edge-function-receive-sms.ts) sends the actual push via Web Push once a reply comes
// in; this just displays it once the browser/OS delivers it here.
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'Thrive', body: e.data ? e.data.text() : 'New message' }; }
  const title = data.title || 'New customer text';
  const options = {
    body: data.body || '',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { path: data.path || '#messages' },
    tag: 'thrive-message', // a second reply while the first notification is still up replaces it instead of stacking
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
// Tapping the notification focuses an already-open Thrive tab if there is one,
// otherwise opens a new one — lands on the Messages screen either way.
//
// The path sent from the server can't know exactly where this is hosted (this app is
// served from a GitHub Pages PROJECT subpath, e.g. https://<user>.github.io/<repo>/ —
// not the domain root), so a server-provided absolute "/#messages" resolves to the
// wrong place and 404s. Resolving against self.registration.scope instead always lands
// on wherever THIS service worker (and therefore this app) actually lives, regardless
// of the exact hosting path.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const path = (e.notification.data && e.notification.data.path) || '#messages';
  const targetUrl = new URL(path, self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) { if ('focus' in c) { c.navigate(targetUrl); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
