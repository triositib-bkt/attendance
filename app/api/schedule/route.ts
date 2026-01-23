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

  console.log('📅 Today (local):', today)
  console.log('📅 User ID:', session.user.id)

  // Helper function to normalize date strings (handles both YYYY-MM-DD and ISO formats)
  const normalizeDate = (dateStr: string) => {
    // Extract just the date part (YYYY-MM-DD) from ISO string or keep as is
    return dateStr.split('T')[0]
  }

  // Get all active schedules - use admin client to bypass RLS
  const { data: schedules } = await supabaseAdmin
    .from('employee_schedules')
    .select('*, work_locations:location_id(id, name)')
    .eq('user_id', session.user.id)
    .eq('is_active', true)

  console.log('📋 Total schedules found:', schedules?.length || 0)

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ data: null, error: null })
  }

  // Filter schedules for today
  const todaySchedules = schedules.filter(schedule => {
    const effectiveDateStr = schedule.effective_date ? normalizeDate(schedule.effective_date) : null
    const endDateStr = schedule.end_date ? normalizeDate(schedule.end_date) : null
    
    console.log(`   Schedule: ${effectiveDateStr} to ${endDateStr}, Day: ${schedule.day_of_week}, Shift: ${schedule.shift_start}-${schedule.shift_end}`)
    
    // Check if today falls within the schedule's date range
    const effectiveOk = !effectiveDateStr || effectiveDateStr <= today
    const endOk = !endDateStr || endDateStr >= today
    
    const matches = effectiveOk && endOk
    console.log(`   ${matches ? '✅' : '❌'} Match: effective=${effectiveOk}, end=${endOk}`)
    
    return matches
  })

  console.log('✅ Matching schedules:', todaySchedules.length)

  // Return the first matching schedule
  const schedule = todaySchedules.length > 0 ? todaySchedules[0] : null

  if (schedule) {
    console.log('📌 Selected schedule:', {
      date: normalizeDate(schedule.effective_date || ''),
      shift: `${schedule.shift_start}-${schedule.shift_end}`,
      location: schedule.work_locations?.name
    })
  }

  return NextResponse.json(
    { data: schedule || null, error: null },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}
