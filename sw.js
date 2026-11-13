// Service worker mínimo: permite instalar la app y recibir enlaces compartidos.
// No guarda nada en caché para que siempre se vea la última versión.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
