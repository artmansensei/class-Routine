const CACHE_NAME = 'vu-routine-cache-v1';

// যে ফাইলগুলো অফলাইনে দেখার জন্য সেভ করে রাখতে চান
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './data/routine.json',
    './manifest.json'
];

// 1. Install Service Worker & Cache Files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Fetch Data from Cache when Offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // ক্যাশে থাকলে সেটা দেখাবে, না থাকলে ইন্টারনেট থেকে আনবে
                return response || fetch(event.request);
            })
    );
});