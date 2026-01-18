import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET job checklists for current employee based on today's schedule
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use local date - avoid toISOString() which converts to UTC
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    const dayOfWeek = now.getDay()
    
    // Create a date object for comparison
    const todayDate = new Date(year, now.getMonth(), now.getDate())
    
    // Get all employee's active schedules
    const { data: allSchedules, error: scheduleError } = await supabase
      .from('employee_schedules')
      .select(`
        *,
        work_location:work_locations (
          id,
          name,
          office_areas (
            id,
            name
          )
        )
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 })
    }

    console.log('=== Schedule Check ===')
    console.log('Today:', today)
    console.log('Day of Week:', dayOfWeek)
    console.log('Total schedules found:', allSchedules?.length || 0)

    // Helper function to parse dates as local dates (not UTC)
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    // Filter schedules for today - only check date range, not day of week
    const schedules = allSchedules?.filter(schedule => {
      // Check if today falls within the schedule's date range
      const effectiveOk = !schedule.effective_date || parseLocalDate(schedule.effective_date) <= todayDate
      const endOk = !schedule.end_date || parseLocalDate(schedule.end_date) >= todayDate
      
      const matched = effectiveOk && endOk
      
      // Only log matched schedules
      if (matched) {
        console.log(`✓ Matched Schedule ${schedule.id}:`, {
          effective_date: schedule.effective_date,
          end_date: schedule.end_date,
          location_id: schedule.location_id,
          location_name: schedule.work_location?.name
        })
      }
      
      return matched
    })

    console.log('Matched schedules:', schedules?.length || 0)

    // Add detailed debug for why schedules didn't match
    const scheduleDebug = allSchedules?.map(s => {
      const effectiveOk = !s.effective_date || parseLocalDate(s.effective_date) <= todayDate
      const endOk = !s.end_date || parseLocalDate(s.end_date) >= todayDate
      const dayMatch = s.day_of_week === dayOfWeek
      
      return {
        id: s.id,
        day_of_week: s.day_of_week,
        effective_date: s.effective_date,
        end_date: s.end_date,
        location_id: s.location_id,
        effectiveOk,
        endOk,
        dayMatch,
        matched: effectiveOk && endOk && dayMatch
      }
    })

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: 'No schedule for today'
      })
    }

    // Get location IDs from schedules
    const locationIds = schedules.map(s => s.location_id)

    // Get all area IDs for these locations
    const { data: areas, error: areasError } = await supabase
      .from('office_areas')
      .select('id')
      .in('location_id', locationIds)
      .eq('is_active', true)

    if (areasError) {
      return NextResponse.json({ error: areasError.message }, { status: 500 })
    }

    const areaIds = areas?.map(a => a.id) || []

    if (areaIds.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: 'No areas configured for your location'
      })
    }

    // Get job checklists for these areas for today
    const { data: checklists, error: checklistError } = await supabase
      .from('job_checklists')
      .select(`
        *,
        job_template:job_templates (
          id,
          title,
          description,
          frequency
        ),
        office_area:office_areas (
          id,
          name,
          duration_minutes,
          location:work_locations (
            id,
            name
          )
        ),
        completed_by_profile:profiles!job_checklists_completed_by_fkey (
          full_name
        )
      `)
      .in('area_id', areaIds)
      .eq('assigned_date', today)
      .order('completed_at', { ascending: false, nullsFirst: false })

    if (checklistError) {
      return NextResponse.json({ error: checklistError.message }, { status: 500 })
    }

    return NextResponse.json({ data: checklists || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
