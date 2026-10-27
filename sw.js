'use strict';
// Minimal offline cache: precache the app shell, serve cache first, refresh in the background.
const CACHE = 'active-projects-v3';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'logic.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Offline with no cached copy: pages get the cached app shell, anything else a 503.
function offlineFallback(c, request) {
  const unavailable = () => new Response('Offline and not cached.', {
    status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' }
  });
  if (request.mode !== 'navigate') return unavailable();
  return c.match('index.html').then((page) => page || unavailable());
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => hit || offlineFallback(c, e.request));
    return hit || net;
  })));
});
