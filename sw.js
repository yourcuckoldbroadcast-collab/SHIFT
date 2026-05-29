/* Shift Radiologi — service worker (offline-first, cache app shell) */
const CACHE = 'shift-radiologi-v0.1.0';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Navigasi & shell: cache-first lalu jaringan.
   Font Google (gstatic/googleapis): simpan salinan agar tetap muncul offline. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const url = new URL(req.url);
        const cacheable = url.origin === location.origin ||
                          url.host.includes('fonts.googleapis.com') ||
                          url.host.includes('fonts.gstatic.com');
        if (cacheable && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
