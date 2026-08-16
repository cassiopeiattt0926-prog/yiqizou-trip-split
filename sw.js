const CACHE_NAME = "haoyouji-v29";
const APP_FILES = [
  "./",
  "index.html?v=29",
  "style.css?v=29",
  "avatars.js?v=29",
  "rate-policy.js?v=29",
  "app.js?v=29",
  "manifest.webmanifest?v=29",
  "assets/brand/tt-transfer.svg",
  "assets/brand/app-icon-180.png",
  "assets/brand/app-icon-192.png",
  "assets/brand/app-icon-512.png",
  "assets/banners/multi-currency.jpg",
  "assets/banners/participants.jpg",
  "assets/banners/borrow.jpg",
  "assets/banners/settlement.jpg",
  "assets/banners/personal-stats.jpg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
