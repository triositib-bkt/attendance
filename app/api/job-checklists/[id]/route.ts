import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// PUT - Complete a job checklist
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await request.json()
  const { notes } = body

  try {
    // Mark job as completed
    const { data, error } = await supabase
      .from('job_checklists')
      .update({
        completed_at: new Date().toISOString(),
        completed_by: session.user.id,
        notes: notes || null,
      })
      .eq('id', id)
      .select(`
        *,
        job_template:job_templates (
          title,
          description
        ),
        office_area:office_areas (
          name,
          location:work_locations (
            name
          )
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Job completed successfully!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Uncomplete a job (admin or employee who completed it)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    // Check if user is admin or the one who completed it
    const { data: checklist } = await supabase
      .from('job_checklists')
      .select('completed_by')
      .eq('id', id)
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only allow uncomplete if admin or the person who completed it
    if (session.user.role !== 'admin' && checklist.completed_by !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as uncompleted
    const { data, error } = await supabase
      .from('job_checklists')
      .update({
        completed_at: null,
        completed_by: null,
        notes: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Job marked as incomplete' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
