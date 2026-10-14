// Reforge offline support: keeps the app's own files on the phone so it opens and works without signal.
// Your data (Supabase) is never cached here; sets logged offline wait in the app's own queue instead.
const CACHE = 'reforge-v2'
const SHELL = ['/', '/theme.js', '/manifest.webmanifest', '/icon-192.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
  }
  return response
}

// Pages: always try for the newest version, fall back to the saved one with no signal
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put('/', response.clone())
    }
    return response
  } catch {
    return (await caches.match('/')) ?? Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request))
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    // Built files (fonts included) have a fingerprint in their name, so a saved copy is always the right one
    event.respondWith(cacheFirst(request))
  } else if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
  // Everything else (including all Supabase requests) goes straight to the network
})
