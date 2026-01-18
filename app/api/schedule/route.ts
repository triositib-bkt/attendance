import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use local date - avoid toISOString() which converts to UTC
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`
  const todayDate = new Date(year, now.getMonth(), now.getDate())

  // Helper function to parse dates as local dates (not UTC)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Get all active schedules - use admin client to bypass RLS
  const { data: schedules } = await supabaseAdmin
    .from('employee_schedules')
    .select('*, work_locations:location_id(id, name)')
    .eq('user_id', session.user.id)
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ data: null, error: null })
  }

  // Filter schedules for today - only check date range
  const todaySchedules = schedules.filter(schedule => {
    // Check if today falls within the schedule's date range
    const effectiveOk = !schedule.effective_date || parseLocalDate(schedule.effective_date) <= todayDate
    const endOk = !schedule.end_date || parseLocalDate(schedule.end_date) >= todayDate
    
    return effectiveOk && endOk
  })

  // Return the first matching schedule
  const schedule = todaySchedules.length > 0 ? todaySchedules[0] : null

  return NextResponse.json(
    { data: schedule || null, error: null },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}
