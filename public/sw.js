/**
 * Service Worker - Almanik PMS v2
 * DEV2-01: PWA Service Worker Implementation
 *
 * Strategies:
 * - Static assets: Cache First (fast loading)
 * - API GET requests: Network First with cache fallback (fresh data, offline support)
 * - API POST/PUT/DELETE: Network only (mutations must go to server)
 */

const CACHE_VERSION = 'v7';
const STATIC_CACHE = `almanik-static-${CACHE_VERSION}`;
const API_CACHE = `almanik-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/reservations.html',
    '/analytics.html',
    '/staff.html',
    '/tasks.html',
    '/cashbox.html',
    '/reports-advanced.html',
    '/ical-sync.html',
    '/pos.html',
    '/executive-dashboard.html',
    '/reviews-dashboard.html',
    '/review.html',
    '/whatsapp-chat.html',
    '/manifest.json',
    '/js/reservations.js',
    '/js/analytics.js',
    '/js/feedback.js',
    '/js/ical-sync.js',
    '/js/staff.js',
    '/js/tasks.js',
    '/js/cashbox.js',
    '/js/reports-advanced.js',
    '/js/notifications.js',
    '/js/pos.js',
    '/js/executive-dashboard.js',
    '/js/reviews-dashboard.js',
    '/js/whatsapp-chat.js',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    // External CDN resources
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// API endpoints that can be cached for offline reading
const CACHEABLE_API_PATTERNS = [
    '/api/beds',
    '/api/guests',
    '/api/analytics',
    '/api/staff',
    '/api/products',
    '/api/tasks',
    '/api/reservations'
];

// Install Event - Pre-cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker v2...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.filter(url => {
                    // Skip external URLs that might fail
                    if (url.startsWith('http')) {
                        return fetch(url, { mode: 'no-cors' })
                            .then(() => true)
                            .catch(() => {
                                console.warn(`[SW] Could not cache external: ${url}`);
                                return false;
                            });
                    }
                    return true;
                }));
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate Event - Cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker v2...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch Event - Handle requests with appropriate strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (mutations must go to server)
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!request.url.startsWith('http')) {
        return;
    }

    // API requests: Network First with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // External CDN requests: Cache First
    if (!url.origin.includes(self.location.origin)) {
        event.respondWith(handleCdnRequest(request));
        return;
    }

    // Static assets: Cache First with network fallback
    event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with Network First strategy
 * - Try network first for fresh data
 * - Fall back to cache if offline
 * - Cache successful responses for offline use
 */
async function handleApiRequest(request) {
    const url = new URL(request.url);

    // Check if this API endpoint should be cached
    const shouldCache = CACHEABLE_API_PATTERNS.some(pattern =>
        url.pathname.startsWith(pattern)
    );

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful GET responses
        if (networkResponse.ok && shouldCache) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        console.log('[SW] Network failed for API, trying cache:', url.pathname);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            console.log('[SW] Serving cached API response:', url.pathname);
            return cachedResponse;
        }

        // Return offline JSON response
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'Sin conexion. Los datos mostrados pueden estar desactualizados.',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Handle static assets with Cache First strategy
 * - Serve from cache if available (fast)
 * - Fetch from network and update cache if not
 */
async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Return cached response immediately
        // Also update cache in background (stale-while-revalidate)
        updateCacheInBackground(request);
        return cachedResponse;
    }

    // Not in cache, fetch from network
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        throw error;
    }
}

/**
 * Handle CDN requests with Cache First strategy
 */
async function handleCdnRequest(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request, { mode: 'cors' });

        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('[SW] Could not fetch CDN resource:', request.url);
        throw error;
    }
}

/**
 * Update cache in background (stale-while-revalidate pattern)
 */
function updateCacheInBackground(request) {
    fetch(request)
        .then((response) => {
            if (response.ok) {
                caches.open(STATIC_CACHE)
                    .then((cache) => cache.put(request, response));
            }
        })
        .catch(() => {
            // Ignore network errors during background update
        });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }
});

// Background sync for offline mutations (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reservations') {
        console.log('[SW] Background sync: reservations');
        // TODO: Implement background sync for offline reservations
    }
});

// ============================================================
// PUSH NOTIFICATIONS (DEV2-03)
// ============================================================

/**
 * Handle incoming push notifications
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {
        title: 'Almanik PMS',
        body: 'Nueva notificacion',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'default',
        data: { url: '/' }
    };

    try {
        if (event.data) {
            const payload = event.data.json();
            data = { ...data, ...payload };
        }
    } catch (error) {
        console.error('[SW] Error parsing push data:', error);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        tag: data.tag || 'almanik-notification',
        renotify: true,
        requireInteraction: data.requireInteraction || false,
        vibrate: [200, 100, 200],
        data: data.data || { url: '/' },
        actions: data.actions || [
            { action: 'open', title: 'Abrir' },
            { action: 'dismiss', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Get URL from notification data
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there's already a window open
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        // Navigate existing window to the URL
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

/**
 * Handle notification close
 */
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
    // Could track analytics here if needed
});

console.log('[SW] Service Worker script loaded');
