// v12 — cache busted, no caching to prevent stale JS issues; added push notifications
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
    data: { url: data.url || '/' },
    tag: 'thrive-message', // a second reply while the first notification is still up replaces it instead of stacking
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
// Tapping the notification focuses an already-open Thrive tab if there is one,
// otherwise opens a new one — lands on the Messages screen either way.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

