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

// Log missing config in production for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const missingVars = []
  if (!firebaseConfig.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY')
  if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.appId) missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID')
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing Firebase config:', missingVars.join(', '))
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Get FCM token
export async function getFCMToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null
    
    // Check if FCM is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_FCM === 'false') {
      console.info('ℹ️ FCM disabled via configuration')
      return null
    }
    
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
        // Unregister any existing service workers that might conflict
        const existingRegistrations = await navigator.serviceWorker.getRegistrations()
        const oldServiceWorker = existingRegistrations.find(reg => 
          reg.active?.scriptURL.includes('service-worker.js') && 
          !reg.active?.scriptURL.includes('firebase-messaging-sw.js')
        )
        if (oldServiceWorker) {
          await oldServiceWorker.unregister()
          console.log('✅ Old service worker unregistered')
          // Wait for unregister to complete
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        let registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        
        console.log('🔄 Service worker registered, waiting for activation...')
        
        // Wait for the specific registration to be active
        if (registration.installing) {
          await new Promise(resolve => {
            registration.installing!.addEventListener('statechange', function() {
              if (this.state === 'activated') {
                resolve(undefined)
              }
            })
          })
        } else if (registration.waiting) {
          // If there's a waiting worker, activate it
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Make sure we have the latest registration
        registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || registration
        
        if (!registration.active) {
          console.warn('Service worker not activated yet, waiting...')
          await navigator.serviceWorker.ready
          registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || registration
        }
        
        if (!registration.active) {
          console.error('Service worker failed to activate')
          return null
        }
        
        console.log('✅ Service Worker active:', registration.active.scriptURL)
        
        // Verify registration has pushManager
        if (!registration.pushManager) {
          console.warn('Service worker registration missing pushManager')
          return null
        }
        
        console.log('✅ PushManager verified')
        
        // Additional wait to ensure everything is fully initialized
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Now get messaging - it should pick up the active service worker
        const messaging = getMessaging(app)
        
        // Get token with explicit service worker registration
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        })
        
        console.log('✅ FCM token obtained successfully')
        return token
        
      } catch (swError: any) {
        console.error('Service worker error:', swError.message || swError)
        return null
      }
    } else {
      console.warn('Service workers not supported')
      return null
    }
  } catch (error: any) {
    // Silently fail - notifications are optional
    console.info('ℹ️ Push notifications unavailable:', error?.code || error?.message)
    return null
  }
}

// Listen for foreground messages
export function onMessageListener() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser context'))
      return
    }
    
    // Check if FCM is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_FCM === 'false') {
      reject(new Error('FCM disabled via configuration'))
      return
    }
    
    // Check if Firebase config is complete
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      reject(new Error('Firebase configuration incomplete'))
      return
    }
    
    try {
      const messaging = getMessaging(app)
      onMessage(messaging, (payload) => {
        resolve(payload)
      })
    } catch (error) {
      reject(error)
    }
  })
}

// Check FCM status and configuration
export async function checkFCMStatus(): Promise<{
  supported: boolean
  configured: boolean
  permission: NotificationPermission | null
  token: string | null
  errors: string[]
}> {
  const errors: string[] = []
  
  if (typeof window === 'undefined') {
    return { supported: false, configured: false, permission: null, token: null, errors: ['Not in browser context'] }
  }
  
  // Check if FCM is enabled
  if (process.env.NEXT_PUBLIC_ENABLE_FCM === 'false') {
    return { 
      supported: false, 
      configured: false, 
      permission: null, 
      token: null, 
      errors: ['FCM disabled via NEXT_PUBLIC_ENABLE_FCM=false'] 
    }
  }
  
  // Check browser support
  if (!('Notification' in window)) {
    errors.push('Browser does not support notifications')
    return { supported: false, configured: false, permission: null, token: null, errors }
  }
  
  // Check secure context
  if (!window.isSecureContext) {
    errors.push('Not in secure context (HTTPS required)')
  }
  
  // Check Firebase config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    errors.push('Firebase config incomplete (missing apiKey or projectId)')
  }
  
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    errors.push('VAPID key not configured')
  }
  
  // Check service worker
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const fcmSW = registrations.find(reg => reg.active?.scriptURL.includes('firebase-messaging-sw'))
      if (!fcmSW) {
        errors.push('FCM service worker not registered')
      }
    } catch (e) {
      errors.push('Could not check service worker status')
    }
  } else {
    errors.push('Service workers not supported')
  }
  
  const permission = Notification.permission
  const configured = errors.length === 0
  const supported = 'Notification' in window
  
  let token: string | null = null
  if (configured && permission === 'granted') {
    token = await getFCMToken()
  }
  
  return { supported, configured, permission, token, errors }
}

// Log FCM status to console (for debugging)
export async function logFCMStatus() {
  const status = await checkFCMStatus()
  
  console.group('🔔 FCM Status Check')
  console.log('Browser Support:', status.supported ? '✅' : '❌')
  console.log('Configured:', status.configured ? '✅' : '❌')
  console.log('Permission:', status.permission)
  console.log('Token:', status.token ? `✅ ${status.token.substring(0, 20)}...` : '❌ No token')
  
  if (status.errors.length > 0) {
    console.group('❌ Issues:')
    status.errors.forEach(err => console.log('  -', err))
    console.groupEnd()
  } else {
    console.log('✅ FCM fully operational')
  }
  
  console.groupEnd()
  
  return status
}