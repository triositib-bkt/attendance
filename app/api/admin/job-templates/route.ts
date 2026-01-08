import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET all job templates with area and location details
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('job_templates')
    .select(`
      *,
      office_area:office_areas (
        id,
        name,
        location:work_locations (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ data: null, error }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

// POST create job template
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  
  const { data, error } = await supabase
    .from('job_templates')
    .insert({
      ...body,
      is_active: true,
    })
    .select()

  if (error) {
    return NextResponse.json({ data: null, error }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
