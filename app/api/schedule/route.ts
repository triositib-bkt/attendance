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

  // Get current day of week and date
  const now = new Date()
  const dayOfWeek = now.getDay()
  const today = now.toISOString().split('T')[0] // YYYY-MM-DD

  // Get today's schedule - use admin client to bypass RLS
  const { data: schedules } = await supabaseAdmin
    .from('employee_schedules')
    .select('*, work_locations:location_id(id, name)')
    .eq('user_id', session.user.id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ data: null, error: null })
  }

  // Filter and prioritize schedules:
  // 1. Date-specific schedules within range
  // 2. Recurring schedules (no dates)
  const dateSpecificSchedules = schedules.filter(s => {
    if (!s.effective_date) return false
    const effectiveDate = new Date(s.effective_date)
    const endDate = s.end_date ? new Date(s.end_date) : null
    const currentDate = new Date(today)
    
    return currentDate >= effectiveDate && (!endDate || currentDate <= endDate)
  })

  const recurringSchedules = schedules.filter(s => !s.effective_date)

  // Return date-specific schedule if exists, otherwise recurring schedule
  const schedule = dateSpecificSchedules.length > 0 
    ? dateSpecificSchedules[0] 
    : recurringSchedules[0]

  return NextResponse.json(
    { data: schedule || null, error: null },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}
