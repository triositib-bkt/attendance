import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const todayDate = new Date(today)
    const dayOfWeek = todayDate.getDay()
    
    // Debug 1: Check user's schedules
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

    // Debug 2: Get all job checklists for today
    const { data: allChecklists, error: checklistError } = await supabase
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
        )
      `)
      .eq('assigned_date', today)

    // Debug 3: Get all areas for user's locations
    const locationIds = schedules?.map(s => s.location_id) || []
    const { data: areas } = await supabase
      .from('office_areas')
      .select('*')
      .in('location_id', locationIds)

    return NextResponse.json({
      today,
      dayOfWeek,
      userId: session.user.id,
      userName: session.user.name,
      schedules: {
        count: schedules?.length || 0,
        data: schedules
      },
      allChecklists: {
        count: allChecklists?.length || 0,
        data: allChecklists
      },
      userLocationAreas: {
        count: areas?.length || 0,
        data: areas
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
