// public/sw.js
// MENFP Prep — Service Worker
// Strategies:
//   • App shell      → cache-first (fast boot, works offline)
//   • Static data    → stale-while-revalidate (Sciences Sociales JSON, etc.)
//   • Webhook calls  → network-first with 3s timeout, fallback message
//   • Navigations    → network-first, fallback to /offline.html
// Plus: push notification display + daily "mission" reminder click routing.

const VERSION = "menfp-v1.0.0";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE  = `${VERSION}-data`;
const RUNTIME     = `${VERSION}-runtime`;

// App shell — critical assets pre-cached on install.
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
];

// Static data files that power the offline Sciences Sociales timeline.
// Listed explicitly so we can pre-warm them on install.
const PRECACHE_DATA = [
  "/data/presidents.json",
  "/data/pastExams.json",
  "/data/trapQuestions.json",
];

/* ---------------------------- INSTALL ---------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll(SHELL_ASSETS);

      const data = await caches.open(DATA_CACHE);
      // Silent — don't fail install if a data file is missing
      await Promise.allSettled(
        PRECACHE_DATA.map((url) =>
          fetch(url).then((res) => res.ok && data.put(url, res.clone()))
        )
      );

      self.skipWaiting();
    })()
  );
});

/* ---------------------------- ACTIVATE ---------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* ---------------------------- FETCH ---------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. Navigation requests → network-first, offline.html fallback
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(RUNTIME);
          cache.put(req, net.clone());
          return net;
        } catch {
          return (
            (await caches.match(req)) ||
            (await caches.match("/offline.html")) ||
            new Response("Offline", { status: 503 })
          );
        }
      })()
    );
    return;
  }

  // 2. Sciences Sociales & other static data → stale-while-revalidate
  if (url.pathname.startsWith("/data/")) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // 3. Webhook / API calls → network-first with fallback JSON
  if (url.hostname.includes("hook.make.com") || url.hostname.includes("n8n")) {
    event.respondWith(networkFirstWithFallback(req));
    return;
  }

  // 4. Static assets (JS, CSS, fonts, images) → cache-first
  if (
    req.destination === "script" ||
    req.destination === "style" ||
    req.destination === "font" ||
    req.destination === "image"
  ) {
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const net = await fetch(req);
    if (net.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, net.clone());
    }
    return net;
  } catch {
    return cached || new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("", { status: 504 });
}

async function networkFirstWithFallback(req) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const net = await fetch(req, { signal: controller.signal });
    clearTimeout(timeout);
    return net;
  } catch {
    return new Response(
      JSON.stringify({
        error: "offline",
        message: "Pa gen koneksyon. Solisyon kache ap chaje.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

/* ---------------------- PUSH NOTIFICATIONS ---------------------- */
self.addEventListener("push", (event) => {
  let payload = {
    title: "Pwofesè ou ap tann ou 📚",
    body: "Misyon jou a pare. 15 minit = 1 pa pi pre egzamen an.",
    url: "/",
    tag: "daily-mission",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: payload.tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: payload.url || "/", timestamp: Date.now() },
    actions: [
      { action: "open",    title: "Kòmanse kounye a" },
      { action: "dismiss", title: "Pita" },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

/* ---------------------- NOTIFICATION CLICK ---------------------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if we already have one
      for (const client of allClients) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

/* ---------------------- BACKGROUND SYNC (optional) ---------------------- */
// Retries any queued webhook calls when the device comes back online.
self.addEventListener("sync", (event) => {
  if (event.tag === "retry-webhooks") {
    event.waitUntil(retryQueuedWebhooks());
  }
});

async function retryQueuedWebhooks() {
  // Hook this up to IndexedDB later — for MVP it's a stub.
  // The idea: students on spotty Haitian mobile networks queue Scan & Solve
  // requests locally, and we flush them when they reconnect.
  return Promise.resolve();
}

/* ---------------------- MESSAGE CHANNEL ---------------------- */
// Lets the app tell the SW to skip waiting after an update.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
