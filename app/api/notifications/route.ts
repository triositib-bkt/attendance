import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET notifications for current user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('notification_recipients')
      .select(`
        id,
        is_read,
        read_at,
        created_at,
        notification:notifications (
          id,
          title,
          message,
          type,
          is_broadcast,
          created_at,
          sender:profiles!notifications_sent_by_fkey (
            full_name,
            email
          )
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format response
    const notifications = data?.map((item: any) => ({
      id: item.notification.id,
      title: item.notification.title,
      message: item.notification.message,
      type: item.notification.type,
      is_broadcast: item.notification.is_broadcast,
      created_at: item.notification.created_at,
      is_read: item.is_read,
      read_at: item.read_at,
      sender: item.notification.sender
    })) || []

    return NextResponse.json({ data: notifications })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST mark notification as read
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { notification_id, mark_all_read } = body

    if (mark_all_read) {
      // Mark all notifications as read
      const { error } = await supabase
        .rpc('mark_all_notifications_read', { p_user_id: session.user.id })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id is required' }, { status: 400 })
    }

    // Mark specific notification as read
    const { error } = await supabase
      .from('notification_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('notification_id', notification_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Notification marked as read' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
