import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Get FCM token
export async function getFCMToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null
    
    // Check if running in secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.warn('FCM requires secure context (HTTPS). Running on HTTP will not work.')
      return null
    }
    
    // Check if VAPID key is configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      console.warn('Firebase VAPID key not configured. Push notifications will not work.')
      return null
    }
    
    // Check if all Firebase config is present
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('Firebase configuration incomplete.')
      return null
    }
    
    // Register service worker first
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        await navigator.serviceWorker.ready
        console.log('✅ Service Worker registered successfully')
      } catch (swError) {
        console.warn('Service worker registration failed:', swError)
        return null
      }
    }
    
    // Small delay to ensure service worker is fully active
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    })
    
    console.log('✅ FCM token obtained successfully')
    return token
  } catch (error: any) {
    // Silently fail - notifications are optional
    console.info('ℹ️ Push notifications unavailable:', error?.code || error?.message)
    return null
  }
}

// Listen for foreground messages
export function onMessageListener() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return
    
    const messaging = getMessaging(app)
    onMessage(messaging, (payload) => {
      resolve(payload)
    })
  })
}