// App-shell cache so the demo opens offline after the first visit.
const CACHE = 'whisper-v35';
const SHELL = ['./', 'index.html', 'css/app.css?v=34', 'js/app.js?v=34', 'js/device.js?v=34', 'js/i18n.js', 'js/data.js', 'js/store.js', 'js/avatar.js', 'js/demo-ai.js', 'js/claude.js', 'js/coldopen.js', 'js/voice.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never cache API calls
  // Network first, and revalidate with the server (cheap 304) instead of trusting
  // the 10-minute HTTP cache, so a new deploy shows up on the next visit.
  // The offline cache is only a fallback.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
