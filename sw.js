// Service worker: red primero y sin caché HTTP, para cargar siempre la última versión.
// Solo si no hay conexión se usa la copia guardada.
const CACHE = "me-interesa-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const clave = req.mode === "navigate" ? new URL("./", location.href).href : url.origin + url.pathname;
    try {
      const res = await fetch(new Request(req.url, { cache: "no-store", credentials: "same-origin" }));
      if (res.ok && !url.pathname.endsWith("version.json")) (await caches.open(CACHE)).put(clave, res.clone());
      return res;
    } catch {
      return (await caches.match(clave)) || Response.error();
    }
  })());
});
