const CACHE_NAME = 'agricache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event: Cache the core UI
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch event: Serve from cache if offline
self.addEventListener('fetch', event => {
  // We only intercept GET requests (the HTML page).
  // POST requests (the AI analysis) bypass this so our offline queue handles them.
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(() => {
        // Fallback if totally offline and not cached
        return caches.match('/index.html');
      })
    );
  }
});