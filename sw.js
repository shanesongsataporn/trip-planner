const VERSION = 'v1';
const CACHE = 'trip-planner-' + VERSION;

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Network first — always try to get fresh content
  e.respondWith(
    fetch(e.request).then(function(response) {
      // Clone and cache the fresh response
      var clone = response.clone();
      caches.open(CACHE).then(function(cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function() {
      // Offline fallback — serve from cache
      return caches.match(e.request);
    })
  );
});
