// Minimal Service Worker for PWA compliance
const CACHE_NAME = 'pit-stop-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We don't necessarily need to cache everything for it to be installable
      // but a fetch listener is required.
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
