const C='haoyouji-v24';
const ASSETS=['./','index.html','style.css?v=24','avatars.js?v=24','app.js?v=24','manifest.webmanifest','assets/brand/tt-transfer.svg','assets/brand/app-icon-180.png','assets/brand/app-icon-192.png','assets/brand/app-icon-512.png','assets/banners/multi-currency.jpg','assets/banners/participants.jpg','assets/banners/borrow.jpg','assets/banners/settlement.jpg','assets/banners/personal-stats.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(C).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==C).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(C).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request))));
