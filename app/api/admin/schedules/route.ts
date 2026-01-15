import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const locationId = searchParams.get('location_id')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  let query = supabaseAdmin
    .from('employee_schedules')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        employee_id,
        department
      ),
      work_locations:location_id (
        id,
        name
      )
    `)
    .eq('is_active', true)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  // Filter by year and month if provided
  if (year && month) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`
    
    query = query.or(`and(effective_date.gte.${startDate},effective_date.lte.${endDate}),and(effective_date.is.null,end_date.is.null)`)
  }

  query = query
    .order('effective_date', { ascending: false, nullsFirst: false })
    .order('user_id')
    .order('day_of_week')

  const { data, error } = await query

  if (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Fetched schedules:', data?.length || 0)
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
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
  const { user_id, day_of_week, shift_start, shift_end, location_id, effective_date, end_date } = body

  if (!user_id || day_of_week === undefined || !shift_start || !shift_end) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Validate day_of_week is between 0-6
  if (day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json(
      { error: 'Invalid day_of_week. Must be 0-6 (Sunday-Saturday)' },
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
    .insert({
      user_id,
      day_of_week,
      shift_start,
      shift_end,
      location_id: location_id || null,
      effective_date: effective_date || null,
      end_date: end_date || null,
      is_active: true
    })
    .select()

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
