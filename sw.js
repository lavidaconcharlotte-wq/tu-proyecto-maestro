// Tu Proyecto Maestro · service worker mínimo (permite instalar la app)
self.addEventListener("install",function(e){ self.skipWaiting(); });
self.addEventListener("activate",function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch",function(e){ /* siempre en línea: la red decide */ });
