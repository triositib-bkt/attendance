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
    const response = await messaging.sendEachForMulticast(message)
    console.log(`Successfully sent ${response.successCount} notifications`)
    console.log(`Failed to send ${response.failureCount} notifications`)
    return response
  } catch (error) {
    console.error('Error sending notification:', error)
    throw error
  }
}