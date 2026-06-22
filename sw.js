const CACHE_NAME = "comic-reader-shell-v26";
const APP_SHELL = [
  "./",
  "./index.html",
  "./storie.html",
  "./personaggi.html",
  "./le-perle-di-bud.html",
  "./meanwhile-the-doctor.html",
  "./crediti.html",
  "./app.css?v=11",
  "./app/app-init.js?v=11",
  "./app/app-vignette.js?v=11",
  "./app/app-reader.js?v=11",
  "./app/app-hamburger.js?v=11",
  "./app/app-swipe.js?v=11",
  "./app/app-seasons.js?v=11",
  "./app/app-pwa.js?v=11",
  "./app/app-entertainment.js?v=11",
  "./app/app.js?v=11",
  "./site-menu.js?v=11",
  "./manifest.json?v=11",
  "./icons/icon-192.png?v=11",
  "./icons/icon-512.png?v=11"
];

function isAppShellAsset(pathname) {
  return pathname.endsWith("/") ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/storie.html") ||
    pathname.endsWith("/personaggi.html") ||
    pathname.endsWith("/le-perle-di-bud.html") ||
    pathname.endsWith("/meanwhile-the-doctor.html") ||
    pathname.endsWith("/crediti.html") ||
    pathname.endsWith("/app.css") ||
    pathname.endsWith("/app-init.js") ||
    pathname.endsWith("/app-vignette.js") ||
    pathname.endsWith("/app-reader.js") ||
    pathname.endsWith("/app-hamburger.js") ||
    pathname.endsWith("/app-swipe.js") ||
    pathname.endsWith("/app-seasons.js") ||
    pathname.endsWith("/app-pwa.js") ||
    pathname.endsWith("/app-entertainment.js") ||
    pathname.endsWith("/app.js") ||
    pathname.endsWith("/site-menu.js") ||
    pathname.endsWith("/manifest.json") ||
    pathname.endsWith("/icon-192.png") ||
    pathname.endsWith("/icon-512.png");
}

function isCacheableStaticAsset(pathname) {
  return /\.(?:css|js|json|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname);
}

function isMediaAsset(pathname) {
  return /\.(?:mp4|mp3|wav|ogg|m4a|webm)$/i.test(pathname);
}

async function cacheNetworkResponse(request, response) {
  if(!response || response.status !== 200) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function handleAppShellRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return cacheNetworkResponse(request, networkResponse);
  } catch {
    const cachedResponse = await caches.match(request);
    if(cachedResponse) {
      return cachedResponse;
    }

    if(request.mode === "navigate") {
      return caches.match("./index.html");
    }

    throw new Error("Risorsa shell non disponibile");
  }
}

async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  if(cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  return cacheNetworkResponse(request, networkResponse);
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  for(const asset of APP_SHELL) {
    try {
      const request = new Request(asset, { cache: "no-cache" });
      const response = await fetch(request);

      if(!response.ok) {
        console.warn(`[SW] Precache saltato per ${asset}: HTTP ${response.status}`);
        continue;
      }

      await cache.put(request, response.clone());
    } catch (error) {
      console.warn(`[SW] Precache non riuscito per ${asset}:`, error);
    }
  }
}

self.addEventListener("install", event => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if(requestUrl.origin !== self.location.origin) return;

  if(event.request.headers.has("range")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if(isMediaAsset(requestUrl.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if(event.request.mode === "navigate" || isAppShellAsset(requestUrl.pathname)) {
    event.respondWith(handleAppShellRequest(event.request));
    return;
  }

  if(isCacheableStaticAsset(requestUrl.pathname)) {
    event.respondWith(handleStaticAssetRequest(event.request));
  }
});
