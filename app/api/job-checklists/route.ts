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
    // Use local date instead of UTC
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      .toISOString().split('T')[0]
    const todayDate = new Date(today)
    const dayOfWeek = now.getDay() // Use local day of week
    
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

    // Filter schedules for today in application logic for better clarity
    const schedules = allSchedules?.filter(schedule => {
      // Check if schedule is effective today
      if (schedule.effective_date && new Date(schedule.effective_date) > todayDate) {
        return false
      }
      if (schedule.end_date && new Date(schedule.end_date) < todayDate) {
        return false
      }

      // Check if it's a recurring schedule (day_of_week set) or specific date
      if (schedule.day_of_week !== null) {
        // Recurring schedule - check if it matches today's day of week
        return schedule.day_of_week === dayOfWeek
      } else {
        // Specific date schedule - must have both effective_date and end_date
        if (schedule.effective_date && schedule.end_date) {
          return new Date(schedule.effective_date) <= todayDate && 
                 new Date(schedule.end_date) >= todayDate
        }
        return false
      }
    })

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: 'No schedule for today',
        debug: {
          today,
          dayOfWeek,
          totalSchedules: allSchedules?.length || 0
        }
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
        message: 'No areas configured for your location',
        debug: {
          locationIds,
          scheduleCount: schedules.length
        }
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

    return NextResponse.json({ 
      data: checklists || [],
      debug: {
        today,
        dayOfWeek,
        scheduleCount: schedules.length,
        locationIds,
        areaCount: areaIds.length,
        checklistCount: checklists?.length || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
