import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// This endpoint should be called by a cron job to clean up old notifications
export async function GET(request: Request) {
  try {
    // Verify the request is from a cron job (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the database function to delete notifications older than 2 days
    const { data, error } = await supabase.rpc('cleanup_old_notifications', {
      days_to_keep: 2
    })

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log(`Cleanup completed: ${data} notifications deleted`)
    
    return NextResponse.json({ 
      success: true, 
      deleted_count: data,
      message: `Successfully deleted ${data} notifications older than 2 days`
    })
  } catch (error: any) {
    console.error('Cleanup failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
