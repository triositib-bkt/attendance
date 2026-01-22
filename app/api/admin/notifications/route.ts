import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Helper function to send FCM notification
async function sendFCMNotification(tokens: string[], title: string, message: string) {
  // Check if FCM is enabled and configured
  if (process.env.NEXT_PUBLIC_ENABLE_FCM !== 'true') {
    console.log('[FCM] Disabled via config, skipping push notification')
    return { successCount: 0, failureCount: 0 }
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('[FCM] Firebase Admin credentials not configured, skipping push notification')
    console.warn('[FCM] Missing:', {
      projectId: !process.env.FIREBASE_PROJECT_ID,
      clientEmail: !process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !process.env.FIREBASE_PRIVATE_KEY
    })
    return { successCount: 0, failureCount: 0 }
  }

  console.log(`[FCM] Attempting to send to ${tokens.length} devices`)
  
  try {
    const { sendNotificationToTokens } = await import('@/lib/firebase-admin')
    const response = await sendNotificationToTokens(tokens, title, message)
    console.log(`[FCM] Result: ${response.successCount} success, ${response.failureCount} failed`)
    return { successCount: response.successCount, failureCount: response.failureCount }
  } catch (error: any) {
    console.error('[FCM] Error sending notification:', error.message)
    return { successCount: 0, failureCount: tokens.length }
  }
}

// GET all notifications (admin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin' && session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!notifications_sent_by_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST send notification (admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin' && session.user.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, message, type, is_broadcast, recipient_ids } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    if (!is_broadcast && (!recipient_ids || recipient_ids.length === 0)) {
      return NextResponse.json({ error: 'Recipients are required for non-broadcast notifications' }, { status: 400 })
    }

    // Create notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type: type || 'info',
        sent_by: session.user.id,
        is_broadcast: is_broadcast || false
      })
      .select()
      .single()

    if (notificationError) {
      return NextResponse.json({ error: notificationError.message }, { status: 500 })
    }

    // Determine recipients
    let userIds: string[] = []
    
    if (is_broadcast) {
      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 })
      }

      userIds = users?.map(u => u.id) || []
    } else {
      userIds = recipient_ids
    }

    // Create notification recipients
    const recipients = userIds.map(userId => ({
      notification_id: notification.id,
      user_id: userId,
      is_read: false
    }))

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipients)

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 500 })
    }

    // Get FCM tokens for recipients
    const { data: fcmTokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (!tokensError && fcmTokens && fcmTokens.length > 0) {
      const tokens = fcmTokens.map(t => t.token)
      await sendFCMNotification(tokens, title, message)
    }

    return NextResponse.json({ 
      success: true, 
      notification,
      recipients_count: userIds.length,
      fcm_sent: fcmTokens?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
