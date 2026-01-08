import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST - Start a job (set start_time)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('job_checklists')
      .update({
        start_time: new Date().toISOString(),
      })
      .eq('id', params.id)
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
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
