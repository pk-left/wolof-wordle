// Service worker: keeps a copy of the site on the phone so it opens with no data.
// Answers from the saved copy straight away and refreshes it in the background.
// The suggestion API is never cached.
const CACHE = "wolof-wordle-v2";
const FILES = [
  "/", "/dictionary/", "/data/words.js?v=1", "/data/dict.js?v=1",
  "/assets/site.css?v=2", "/assets/site.js?v=1", "/assets/theme.js",
  "/assets/fonts/bricolage-grotesque-400.woff2", "/assets/fonts/bricolage-grotesque-800.woff2",
  "/assets/fonts/old-standard-tt-400.woff2", "/assets/fonts/old-standard-tt-400i.woff2", "/assets/fonts/old-standard-tt-700.woff2",
  "/assets/art/cubist.webp", "/assets/art/blueperiod.webp",
  "/icon.svg", "/icon-192.png", "/manifest.webmanifest",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/review")) return;
  // pages are cached without their ?q=... so a dictionary search link works offline
  const key = e.request.mode === "navigate" ? new Request(url.origin + url.pathname) : e.request;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(key);
    const fresh = fetch(e.request).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => saved || (e.request.mode === "navigate" ? cache.match("/") : Response.error()));
    return saved || fresh;
  }));
});
