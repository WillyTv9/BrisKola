// BrisKola service worker: cache-first, tutto locale.
// Cambia VERSION a ogni release per forzare l'aggiornamento della cache.
const VERSION = "briskola-v3"
const SCOPE = self.registration.scope

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      // Pagina + manifest, poi si impara il resto (js/css/img) alla prima visita.
      await cache.addAll([SCOPE, SCOPE + "manifest.webmanifest", SCOPE + "icon-192.png", SCOPE + "apple-icon.png"])
      // Precarica i file statici elencati nella pagina.
      try {
        const html = await (await fetch(SCOPE, { cache: "reload" })).text()
        const urls = new Set()
        for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const u = new URL(m[1], SCOPE)
          if (u.origin === self.location.origin && /\.(js|css|woff2?|png|svg)$/.test(u.pathname)) urls.add(u.href)
        }
        await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})))
        await Promise.all(
          ["luna", "corvo", "rosa", "volpe", "spada", "coppa", "bastone", "stella"].map((a) =>
            cache.add(SCOPE + "avatars/" + a + ".png").catch(() => {}),
          ),
        )
      } catch {}
      self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION)
      const hit = await cache.match(req, { ignoreSearch: true })
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      } catch {
        if (req.mode === "navigate") return (await cache.match(SCOPE)) || Response.error()
        return Response.error()
      }
    })(),
  )
})
