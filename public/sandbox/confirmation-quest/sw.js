// Confirmation Quest service worker.
//
// Scope: /sandbox/confirmation-quest/ (registered from the page with that scope). A
// worker cannot control pages above its own folder without a Service-Worker-Allowed
// header, which the site never sends, so no other route on steveminster.com is affected.
//
// Rules:
// - Only same-origin GETs are handled. Supabase (*.supabase.co), Google sign-in and
//   Google Fonts are cross-origin, so they always go straight to the network, uncached.
// - Page loads are network-first and never written to the cache. The one cached copy of
//   the page is fetched at install time from a plain request, so it can never be an
//   auth-redirect response. It is served only when the network is unreachable.
// - Hashed build files (/_astro/*) and this folder's icons and manifest are cached once
//   fetched (their contents never change under the same URL).
// - Caches are named cq-*; activation removes only older cq-* caches, never anyone else's.

const VERSION = 'cq-v1';
const SHELL_URL = '/sandbox/confirmation-quest/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload', redirect: 'error' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cq-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_astro/') ||
    /^\/sandbox\/confirmation-quest\/[^/]+\.(png|svg|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google: never touched

  if (request.mode === 'navigate') {
    // Network-first; nothing from the network is cached here.
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL_URL).then((cached) => cached || Response.error())),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok && response.type === 'basic') cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
  // Anything else on this origin falls through to the network, uncached.
});
