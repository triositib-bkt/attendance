// Update this version number when you deploy new changes
const CACHE_VERSION = 'v' + Date.now()
const CACHE_NAME = 'attendance-system-' + CACHE_VERSION
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Cache installation failed:', error)
      })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Fetch resources - Network First strategy for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip caching for API routes (they need fresh data)
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request))
  }

  // Network First strategy for HTML pages to get updates immediately
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request)
        })
    )
    return
  }

  // Cache First strategy for assets (CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Update cache in background
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache)
              })
            }
          }).catch(() => {})
          
          return response
        }

        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })

            return response
          }
        )
      })
      .catch(() => {
        return caches.match('/dashboard')
      })
  )
})

// Clean up old caches and notify clients about updates
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            message: 'New version available!'
          })
        })
      })
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
})

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
