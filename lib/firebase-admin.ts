import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  try {
    // Handle private key - it might be base64 encoded or have escaped newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    
    if (!privateKey) {
      console.error('❌ FIREBASE_PRIVATE_KEY is not set')
    } else {
      // Replace literal \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n')
      
      // If it's base64 encoded, decode it
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        try {
          privateKey = Buffer.from(privateKey, 'base64').toString('utf-8')
        } catch (e) {
          console.warn('⚠️ Private key is not base64 encoded, using as-is')
        }
      }
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    })
    console.log('✅ Firebase Admin initialized successfully')
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message)
    console.error('   Make sure FIREBASE_PRIVATE_KEY is properly formatted')
  }
}

export const messaging = admin.messaging()

export async function sendNotificationToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  console.log(`[sendNotificationToTokens] Sending to ${tokens.length} tokens`)
  console.log('[sendNotificationToTokens] Title:', title)
  console.log('[sendNotificationToTokens] Body:', body)
  
  const message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    tokens,
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    console.log(`✅ Successfully sent ${response.successCount} notifications`)
    console.log(`❌ Failed to send ${response.failureCount} notifications`)
    
    // Log individual failures
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Token ${idx} failed:`, resp.error?.message)
        }
      })
    }
    
    return response
  } catch (error) {
    console.error('❌ Error sending notification:', error)
    throw error
  }
}