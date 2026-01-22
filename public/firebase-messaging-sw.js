importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCUvKoNm4KZ3xjN6T3zKpAhky-ZeU2osag',
  authDomain: 'triositibattendance.firebaseapp.com',
  projectId: 'triositibattendance',
  storageBucket: 'triositibattendance.firebasestorage.app',
  messagingSenderId: '741789180901',
  appId: '1:741789180901:web:43aafb68d1365d9507050c'
})

const messaging = firebase.messaging()

console.log('🔔 Firebase Messaging Service Worker loaded')

// Activate immediately
self.addEventListener('install', (event) => {
  console.log('🔔 Service worker installing')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('🔔 Service worker activated')
  event.waitUntil(clients.claim())
})

// Handle SKIP_WAITING message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Received background message:', payload)
  
  const notificationTitle = payload.notification?.title || 'New Notification'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'notification-' + Date.now(),
    requireInteraction: false,
    data: payload.data
  }

  console.log('🔔 Showing notification:', notificationTitle, notificationOptions)
  
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag)
  event.notification.close()
  
  // Open the app
  event.waitUntil(
    clients.openWindow('/')
  )
})