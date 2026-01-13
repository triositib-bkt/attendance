import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { eachDayOfInterval, format } from 'date-fns'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin or manager
  if (!['admin', 'manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const locationId = searchParams.get('locationId')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
  }

  if (!locationId) {
    return NextResponse.json({ error: 'Location is required' }, { status: 400 })
  }

  try {
    // Get the specific location with its areas and templates
    const { data: locations, error: locationsError } = await supabase
      .from('work_locations')
      .select(`
        id,
        name,
        office_areas (
          id,
          name
        )
      `)
      .eq('id', locationId)
      .order('name')

    if (locationsError) throw locationsError

    // Get all job templates for the areas in this location
    const areaIds = locations?.[0]?.office_areas?.map(a => a.id) || []
    
    const { data: templates, error: templatesError } = await supabase
      .from('job_templates')
      .select('id, title, area_id')
      .in('area_id', areaIds)
      .eq('is_active', true)

    if (templatesError) throw templatesError

    // Get all job checklists in the date range
    const { data: checklists, error: checklistsError } = await supabase
      .from('job_checklists')
      .select(`
        id,
        job_template_id,
        area_id,
        assigned_date,
        completed_at,
        completed_by,
        profiles:completed_by (
          full_name,
          employee_id
        )
      `)
      .gte('assigned_date', startDate)
      .lte('assigned_date', endDate)
      .in('area_id', areaIds)

    if (checklistsError) throw checklistsError

    // Generate date range
    const days = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate)
    })

    // Transform data into the report structure
    const reportData = locations?.map(location => {
      const areas = location.office_areas?.map(area => {
        const templatesForArea = templates?.filter(t => t.area_id === area.id) || []
        
        const checklistsForArea = templatesForArea.map(template => {
          const completions = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const checklist = checklists?.find(
              c => c.job_template_id === template.id && 
                   c.area_id === area.id && 
                   c.assigned_date === dateStr
            )

            const profile = Array.isArray(checklist?.profiles) ? checklist?.profiles[0] : checklist?.profiles

            return {
              date: dateStr,
              completed: !!checklist?.completed_at,
              completed_at: checklist?.completed_at || null,
              completed_by_name: profile?.full_name || null,
              completed_by_employee_id: profile?.employee_id || null
            }
          })

          return {
            checklist_id: template.id,
            template_name: template.title,
            area_name: area.name,
            completions
          }
        })

        return {
          area_id: area.id,
          area_name: area.name,
          checklists: checklistsForArea
        }
      }) || []

      return {
        location_id: location.id,
        location_name: location.name,
        areas: areas.filter(a => a.checklists.length > 0) // Only include areas with checklists
      }
    }) || []

    // Filter out locations with no areas that have checklists
    const filteredData = reportData.filter(loc => loc.areas.length > 0)

    return NextResponse.json({ data: filteredData })
  } catch (error) {
    console.error('Error fetching checklist report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist report' },
      { status: 500 }
    )
  }
}
