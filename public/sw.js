const CACHE_NAME = "stock-hub-v1";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon.png",
  "/icons/icon-192x192.png",
  "/icons/icon-maskable-192x192.png",
];

// Install — pre-cache minimal (le shell Next.js est haché, pas pré-cachable)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first pour tout, fallback cache si hors-ligne
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API / external: network-first, cache fallback (hors-ligne)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Ne cache pas les réponses d'erreur ou opaques
          if (!res || res.status !== 200 || res.type === "opaque") return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigation & assets: network-first avec fallback cache.
  // (Évite les pages HTML obsolètes après déploiement — l'ancien cache-first
  //  servait du JS/HTML périmé jusqu'à expiration du cache.)
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
