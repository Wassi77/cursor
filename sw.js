const CACHE_VERSION = 'v9';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/pdfs.js',
  '/tabs.js',
  '/supabase-config.js',
  '/firebase-config.js',
  '/vendor/pdf.min.js',
  '/vendor/pdf.worker.min.js',
  '/vendor/fonts/inter-400.woff2',
  '/vendor/fonts/inter-500.woff2',
  '/vendor/fonts/inter-600.woff2',
  '/vendor/fonts/inter-700.woff2',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isRangeRequest(request) {
  return request.headers.has('Range');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isRangeRequest(event.request)) return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    const host = url.hostname;
    const isApi =
      host === 'firestore.googleapis.com' ||
      host === 'identitytoolkit.googleapis.com' ||
      host === 'securetoken.googleapis.com' ||
      host === 'www.googleapis.com' ||
      host === 'firebasestorage.googleapis.com' ||
      host.endsWith('.supabase.co') ||
      host.endsWith('.supabase.com') ||
      host === 'cdn.jsdelivr.net' ||
      host === 'www.gstatic.com';

    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.com') || host === 'firebasestorage.googleapis.com') {
      event.respondWith(cacheFirst(event.request));
      return;
    }

    if (isApi) {
      event.respondWith(networkFirst(event.request));
      return;
    }
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  const path = url.pathname;
  const isAppShell =
    PRECACHE_URLS.includes(path) ||
    path.startsWith('/vendor/') ||
    path === '/manifest.json' ||
    path === '/sw.js';

  if (isAppShell) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response && response.ok) {
        caches.open(RUNTIME).then((cache) => cache.put(request, response));
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    throw e;
  }
}

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await caches.match(fallbackPath);
      if (fallback) return fallback;
    }
    throw e;
  }
}
