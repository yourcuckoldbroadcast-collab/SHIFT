/* Shift Radiologi — service worker (offline-first, tahan-banting)
   - HTML/navigasi: network-first → selalu terbaru saat online, jatuh ke cache saat offline.
   - Aset statis: cache-first → cepat & hemat.
   - Instalasi pakai allSettled: satu aset hilang TIDAK membatalkan SW.
   Naikkan CACHE tiap rilis untuk membersihkan cache lama. */
const CACHE = 'shift-radiologi-v0.7.3';
const CORE  = ['./', './index.html'];
const EXTRA = [
  './styles.css', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable.png',
  './apple-touch-icon.png', './favicon.svg', './favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((u) => c.add(u)));
    await Promise.allSettled(EXTRA.map((u) => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req.url, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const url = new URL(req.url);
        const ok = res && res.status === 200 &&
          (url.origin === location.origin ||
           url.host.includes('fonts.googleapis.com') ||
           url.host.includes('fonts.gstatic.com'));
        if (ok){ const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(()=>{}); }
        return res;
      }).catch(() => hit);
    })
  );
});
