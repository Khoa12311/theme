const CACHE_NAME = 'chibitheme-cache-v1.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './jszip.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true})
      .then(response => response || fetch(event.request)
        .then(fetchResp => {
          // Optionally: cache fetched files
          if(fetchResp && fetchResp.status===200 && fetchResp.type==='basic'){
            const respClone = fetchResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          }
          return fetchResp;
        })
      )
      .catch(()=>caches.match('./index.html'))
  );
});