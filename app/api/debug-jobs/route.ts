import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Debug endpoint to check job checklist data
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const todayDate = new Date(today)
    const dayOfWeek = todayDate.getDay()
    
    // 1. Check employee schedules for today (both date-specific and recurring)
    const { data: schedules, error: scheduleError } = await supabase
      .from('employee_schedules')
      .select(`
        *,
        work_location:work_locations (
          id,
          name,
          office_areas (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)

    // 2. Get all job templates
    const { data: templates, error: templatesError } = await supabase
      .from('job_templates')
      .select(`
        *,
        office_area:office_areas (
          id,
          name,
          location_id,
          is_active,
          work_location:work_locations (
            id,
            name
          )
        )
      `)
      .eq('is_active', true)

    // 3. Get all job checklists for today
    const { data: checklists, error: checklistsError } = await supabase
      .from('job_checklists')
      .select(`
        *,
        job_template:job_templates (
          title,
          frequency
        ),
        office_area:office_areas (
          name,
          location_id
        )
      `)
      .eq('assigned_date', today)

    // 4. Get all locations with areas
    const { data: locations, error: locationsError } = await supabase
      .from('work_locations')
      .select(`
        id,
        name,
        office_areas (
          id,
          name,
          is_active
        )
      `)

    return NextResponse.json({ 
      debug: {
        today,
        dayOfWeek,
        userId: session.user.id,
        userEmail: session.user.email,
      },
      schedules: schedules || [],
      schedulesNote: 'Fetching all active schedules for the user. Filter by day_of_week or date range manually.',
      templates: templates || [],
      checklists: checklists || [],
      locations: locations || [],
      errors: {
        scheduleError: scheduleError?.message,
        templatesError: templatesError?.message,
        checklistsError: checklistsError?.message,
        locationsError: locationsError?.message,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
