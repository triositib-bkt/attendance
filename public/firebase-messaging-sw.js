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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})