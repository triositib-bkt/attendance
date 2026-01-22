import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
    console.log('✅ Firebase Admin initialized successfully')
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
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