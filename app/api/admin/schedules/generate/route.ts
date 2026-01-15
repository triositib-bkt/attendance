import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { user_id, location_id, start_date, end_date, shift_start, shift_end, overwrite } = body

    if (!user_id || !location_id || !start_date || !end_date || !shift_start || !shift_end) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDateObj = new Date(start_date + 'T00:00:00')
    const endDateObj = new Date(end_date + 'T00:00:00')

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      )
    }

    let created = 0
    let skipped = 0
    const currentDate = new Date(startDateObj)

    // Generate schedules for each day in the range
    while (currentDate <= endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0]
      const dayOfWeek = currentDate.getDay() // 0=Sunday, 1=Monday, etc.

      // Check if schedule already exists for this employee, location, and specific date
      const { data: existingSchedules } = await supabaseAdmin
        .from('employee_schedules')
        .select('id, is_active')
        .eq('user_id', user_id)
        .eq('location_id', location_id)
        .eq('effective_date', dateString)
        .eq('is_active', true)

      // Check if there's an active schedule for this specific date
      const hasActiveSchedule = existingSchedules && existingSchedules.length > 0

      if (hasActiveSchedule && !overwrite) {
        skipped++
      } else if (hasActiveSchedule && overwrite) {
        // Deactivate existing schedules first
        const activeScheduleIds = existingSchedules.filter(s => s.is_active).map(s => s.id)
        
        await supabaseAdmin
          .from('employee_schedules')
          .update({ is_active: false })
          .in('id', activeScheduleIds)

        // Then create new schedule
        const scheduleData = {
          user_id,
          day_of_week: dayOfWeek,
          shift_start,
          shift_end,
          location_id,
          effective_date: dateString,
          end_date: dateString,
          is_active: true
        }
        
        const { error: insertError } = await supabaseAdmin
          .from('employee_schedules')
          .insert(scheduleData)

        if (insertError) {
          skipped++
        } else {
          created++
        }
      } else {
        // Create new schedule
        const scheduleData = {
          user_id,
          day_of_week: dayOfWeek,
          shift_start,
          shift_end,
          location_id,
          effective_date: dateString,
          end_date: dateString,
          is_active: true
        }
        
        const { error: insertError } = await supabaseAdmin
          .from('employee_schedules')
          .insert(scheduleData)

        if (insertError) {
          skipped++
        } else {
          created++
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({ 
      created, 
      skipped,
      message: `Generated ${created} schedule(s). Skipped ${skipped} existing schedule(s).`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
