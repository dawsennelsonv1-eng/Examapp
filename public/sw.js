// public/sw.js — v24
// Goal: make the app load OFFLINE without trapping users on stale builds.
//
// Strategy:
//  - Navigations (HTML): NETWORK-FIRST, fall back to cached shell when offline.
//    (Network-first means a fresh deploy is picked up immediately when online —
//     this avoids the "stuck on old version" PWA cache pain.)
//  - Static assets (js/css/img): STALE-WHILE-REVALIDATE.
//  - API calls: never cached here (the app caches lessons in localStorage itself).
//  - On activate: delete old caches and take control immediately.
//
// Bump CACHE_VERSION on each release to retire old caches.

const CACHE_VERSION = "laureat-v24";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API or cross-origin (LLM, Supabase, etc.)
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) return;

  // Navigations → network-first, fall back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
