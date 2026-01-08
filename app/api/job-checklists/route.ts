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
    const today = new Date().toISOString().split('T')[0]
    const todayDate = new Date(today)
    const dayOfWeek = todayDate.getDay()
    
    // Get employee's schedule for today (check both date-specific and recurring schedules)
    const { data: schedules, error: scheduleError } = await supabase
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
      .or(`and(day_of_week.eq.${dayOfWeek},or(effective_date.is.null,and(effective_date.lte.${today},or(end_date.is.null,end_date.gte.${today})))),and(day_of_week.is.null,effective_date.lte.${today},end_date.gte.${today})`)

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ data: [], message: 'No schedule for today' })
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
      return NextResponse.json({ data: [], message: 'No areas configured for your location' })
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
