const CACHE_NAME = 'neonhub-v1';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/i18n.js',
    './js/state.js',
    './js/dropzone.js',
    './js/photo.js',
    './js/text.js',
    './js/media.js',
    './js/utils.js',
    './js/pdfTools.js',
    './js/qrGen.js',
    './js/codeTools.js',
    './js/app.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('./index.html')))
    );
});
