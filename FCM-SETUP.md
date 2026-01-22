# Firebase Cloud Messaging (FCM) Setup Guide

This guide explains how to integrate Firebase Cloud Messaging for push notifications.

## 1. Firebase Project Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

### Get Firebase Config
1. In Firebase Console, go to Project Settings (gear icon)
2. Under "Your apps", add a Web app
3. Copy the Firebase configuration object

### Enable Cloud Messaging
1. In Firebase Console, go to "Cloud Messaging"
2. Get your Server Key (for backend)
3. Get your Sender ID

## 2. Install Firebase SDK

```bash
npm install firebase firebase-admin
```

## 3. Environment Variables

Add to your `.env.local`:

```env
# Firebase Client Config (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin Config (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 4. Create Firebase Client Configuration

Create `lib/firebase.ts`:

```typescript
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
    
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    })
    
    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
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
```

## 5. Create Firebase Admin Configuration

Create `lib/firebase-admin.ts`:

```typescript
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const messaging = admin.messaging()

export async function sendNotificationToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    tokens,
  }

  try {
    const response = await messaging.sendMulticast(message)
    console.log(\`Successfully sent \${response.successCount} notifications\`)
    console.log(\`Failed to send \${response.failureCount} notifications\`)
    return response
  } catch (error) {
    console.error('Error sending notification:', error)
    throw error
  }
}
```

## 6. Update Admin Notifications API

Update `app/api/admin/notifications/route.ts`:

```typescript
import { messaging } from '@/lib/firebase-admin'

// Replace the mock sendFCMNotification function with:
async function sendFCMNotification(tokens: string[], title: string, message: string) {
  try {
    const payload = {
      notification: {
        title: title,
        body: message,
      },
      tokens: tokens
    }
    
    const response = await messaging.sendMulticast(payload)
    return { 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    }
  } catch (error) {
    console.error('[FCM] Error sending notification:', error)
    return { successCount: 0, failureCount: tokens.length }
  }
}
```

## 7. Create Service Worker for Background Messages

Create `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'your_api_key',
  authDomain: 'your_project.firebaseapp.com',
  projectId: 'your_project_id',
  storageBucket: 'your_project.appspot.com',
  messagingSenderId: 'your_sender_id',
  appId: 'your_app_id'
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
```

## 8. Register FCM Token on Login

Add this to your dashboard component:

```typescript
import { getFCMToken } from '@/lib/firebase'

useEffect(() => {
  // Request notification permission and get token
  const registerFCMToken = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        const token = await getFCMToken()
        
        if (token) {
          // Register token with backend
          await fetch('/api/notifications/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              device_type: 'web',
              device_info: navigator.userAgent
            })
          })
        }
      }
    }
  }

  registerFCMToken()
}, [])
```

## 9. Listen for Foreground Messages

Add to dashboard component:

```typescript
import { onMessageListener } from '@/lib/firebase'

useEffect(() => {
  onMessageListener()
    .then((payload: any) => {
      console.log('Received foreground message:', payload)
      // Show a toast or update UI
      alert(\`\${payload.notification.title}: \${payload.notification.body}\`)
      // Refresh notifications list
      fetchNotifications()
    })
    .catch((err) => console.error('Failed to receive message:', err))
}, [])
```

## 10. Test Notifications

1. Run the database migration: `notification-schema.sql`
2. Go to Admin → Notifications
3. Send a test notification
4. Check the dashboard for received notifications

## Troubleshooting

### Permission Denied
- Check browser notification permissions
- Make sure service worker is registered

### Token Not Received
- Verify Firebase configuration
- Check VAPID key is correct
- Ensure HTTPS (FCM requires secure origin)

### Notifications Not Showing
- Check service worker console for errors
- Verify Firebase project settings
- Test with Firebase Console's "Cloud Messaging" test tool

## Security Notes

1. Never commit Firebase private key to git
2. Use environment variables for all sensitive config
3. Validate tokens on backend before sending notifications
4. Implement rate limiting for notification sends
5. Clean up expired/invalid tokens periodically
