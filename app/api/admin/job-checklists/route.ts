import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET all job checklists with filters (admin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const locationId = searchParams.get('location_id')
  const areaId = searchParams.get('area_id')
  const status = searchParams.get('status') // 'completed', 'pending', 'all'

  try {
    let query = supabase
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
          location_id,
          location:work_locations (
            id,
            name
          )
        ),
        completed_by_profile:profiles!job_checklists_completed_by_fkey (
          full_name,
          email
        )
      `)
      .eq('assigned_date', date)

    if (locationId) {
      // Filter by location through office_areas
      const { data: areas } = await supabase
        .from('office_areas')
        .select('id')
        .eq('location_id', locationId)
      
      if (areas && areas.length > 0) {
        const areaIds = areas.map(a => a.id)
        query = query.in('area_id', areaIds)
      }
    }

    if (areaId) {
      query = query.eq('area_id', areaId)
    }

    if (status === 'completed') {
      query = query.not('completed_at', 'is', null)
    } else if (status === 'pending') {
      query = query.is('completed_at', null)
    }

    query = query.order('completed_at', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate stats
    const total = data?.length || 0
    const completed = data?.filter(c => c.completed_at).length || 0
    const pending = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return NextResponse.json({ 
      data: data || [], 
      stats: {
        total,
        completed,
        pending,
        completionRate
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
