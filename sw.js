const CACHE_NAME = 'alshaab-realestate-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/manifest.json',
    '/assets/images/logo.png',
    '/assets/images/hero-bg.jpg',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// باقي كود ملف الـ sw.js كما هو تماماً دون أي تغيير برمي لضمان استقرار التصفح دون إنترنت
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching real estate static assets');
                return cache.addAll(STATIC_ASSETS);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('googleapis.com') || 
        event.request.url.includes('cloudinary.com')) {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) { return cachedResponse; }
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
                    return response;
                });
            })
            .catch(() => {
                if (event.request.mode === 'navigate') { return caches.match('/index.html'); }
                if (event.request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#eee" width="200" height="200"/><text fill="#999" x="50%" y="50%" text-anchor="middle">تحميل المعاينة...</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
    );
});
