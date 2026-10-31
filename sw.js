// 離線快取：第一次開過之後，沒網路也能用。
const CACHE = "gz-v4";
const ASSETS = ["./", "./index.html", "./css/style.css", "./js/app.js", "./js/data.js", "./js/ruby.js", "./js/audio.js", "./js/store.js", "./js/ui.js", "./js/quiz.js", "./js/write.js", "./js/dictation.js", "./js/confetti.js", "./js/match.js", "./fonts/gzkai.woff2", "./js/voice_map.js", "./manifest.webmanifest", "./icons/icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
