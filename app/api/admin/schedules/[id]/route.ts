import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { shift_start, shift_end, location_id, effective_date, end_date } = body

  if (!shift_start || !shift_end) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Validate date range if provided
  if (effective_date && end_date && new Date(effective_date) > new Date(end_date)) {
    return NextResponse.json(
      { error: 'Effective date must be before end date' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('employee_schedules')
    .update({
      shift_start,
      shift_end,
      location_id: location_id !== undefined ? location_id : undefined,
      effective_date: effective_date !== undefined ? effective_date : undefined,
      end_date: end_date !== undefined ? end_date : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()

  return NextResponse.json({ data, error })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('employee_schedules')
    .delete()
    .eq('id', params.id)

  return NextResponse.json({ data, error })
}
