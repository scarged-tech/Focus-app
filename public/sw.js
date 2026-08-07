// Service worker mínimo: cachea el shell de la app para que abra
// más rápido y no quede en blanco con conexión intermitente.
// No cachea datos de Supabase (esos siempre van a la red).
const CACHE_NAME = "focus-shell-v1";
const SHELL_URLS = ["/", "/manifest.json", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Solo intercepta GET de nuestro propio origen; todo lo demás (API, Supabase) va directo a red.
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("/")))
  );
});
