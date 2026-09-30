/* DuitTrack service worker – bikin app bisa dipasang & jalan offline.
   Ganti angka VERSION setiap kali kamu mengubah file app supaya cache diperbarui. */
const VERSION = 'v1.2.1';
const CACHE = 'duittrack-' + VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

// Library CDN yang dipakai app (di-cache supaya grafik & export tetap jalan offline)
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    // CDN dicoba satu-satu; kalau gagal (offline) tidak menggagalkan instalasi
    await Promise.all(CDN.map(url =>
      fetch(url, { mode: 'no-cors' }).then(res => cache.put(url, res)).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('duittrack-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Stale-while-revalidate: tampilkan cache dulu (cepat/offline), update di belakang layar
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { network; return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
