/* ============================================================
   Service worker de Immernacht (app instalable).
   - La página (index.html): primero la red, para recibir siempre la versión
     nueva; sin conexión usa la última guardada.
   - Código, imágenes, fuentes y sonidos: primero lo guardado. Los archivos de
     /assets llevan un código en el nombre que cambia en cada versión, así que
     nunca quedan desactualizados. Los sonidos se guardan a medida que suenan.
   - El servidor en línea (otro dominio) no pasa por aquí.
   ============================================================ */
const VERSION = "immernacht-v1";
const RAZAS = ["humanos", "elfos", "enanos", "nomuertos"];
/** Se guardan al instalar: con esto (y el código, que se guarda al abrir) se juega sin conexión. */
const ESENCIALES = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/iconos/icono-192.png",
  "/iconos/icono-512.png",
  ...RAZAS.map((r) => `/fichas/${r}.png`),
  ...RAZAS.map((r) => `/logos/${r}.png`),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ESENCIALES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) if (nombre !== VERSION) await caches.delete(nombre);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Pedidos parciales (algunos navegadores piden el audio por partes): directo a la red.
  if (req.headers.has("range")) return;

  if (req.mode === "navigate") {
    e.respondWith(paginaPrimeroRed(req));
    return;
  }
  // /assets cambia de nombre en cada versión y el audio casi nunca cambia: basta con lo guardado.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/audio/")) {
    e.respondWith(guardadoPrimero(req));
    return;
  }
  // El resto (íconos, fichas, logos) se sirve guardado y se actualiza en segundo plano.
  e.respondWith(guardadoYActualizar(req, e));
});

async function paginaPrimeroRed(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const anterior = await cache.match("/");
      const [nueva, viejaTexto] = await Promise.all([res.clone().text(), anterior?.text()]);
      await cache.put("/", new Response(nueva, { headers: res.headers }));
      // Versión nueva del juego: se borran los archivos de /assets de versiones anteriores
      // (se vuelven a guardar los que sigan en uso la próxima vez que se pidan).
      if (viejaTexto !== undefined && viejaTexto !== nueva) {
        for (const r of await cache.keys()) if (new URL(r.url).pathname.startsWith("/assets/")) await cache.delete(r);
      }
    }
    return res;
  } catch {
    return (await cache.match("/")) ?? Response.error();
  }
}

async function guardadoPrimero(req) {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(req, { ignoreSearch: req.url.includes("/audio/") });
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok && res.status === 200) cache.put(req, res.clone());
  return res;
}

async function guardadoYActualizar(req, e) {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(req);
  const red = fetch(req)
    .then((res) => {
      if (res.ok && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (guardado) {
    e.waitUntil(red);
    return guardado;
  }
  return (await red) ?? Response.error();
}
