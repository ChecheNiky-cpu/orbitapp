// =============================================
//  ORBIT — Service Worker
//  PWA: cache offline + push notifications
// =============================================

const CACHE_NAME  = 'orbit-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@500;700&display=swap'
];

// ── INSTALL: precachear assets esenciales ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Network first, fallback a cache ──
self.addEventListener('fetch', event => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') return;

  // Requests a Supabase siempre van a red (datos en tiempo real)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en cache si la respuesta es válida
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title   = data.title   ?? 'ORBIT';
  const options = {
    body:    data.body    ?? 'Tienes tareas pendientes.',
    icon:    data.icon    ?? '/icons/icon-192.png',
    badge:   data.badge   ?? '/icons/icon-192.png',
    tag:     data.tag     ?? 'orbit-notification',
    data:    data.url     ?? '/',
    actions: data.actions ?? [
      { action: 'open',    title: 'Abrir ORBIT' },
      { action: 'dismiss', title: 'Descartar'   }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow(event.notification.data ?? '/');
      })
  );
});
