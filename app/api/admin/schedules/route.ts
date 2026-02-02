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
    
    console.log(`[Schedules API] Filtering for ${year}-${month}: startDate=${startDate}, endDate=${endDate}`)
    
    // Show schedules that are active during the selected month:
    // 1. Schedules that start before or during the month AND (have no end_date OR end after month starts)
    // 2. This ensures we show schedules that were created in previous months but are still active
    query = query.or(`and(effective_date.lte.${endDate},or(end_date.is.null,end_date.gte.${startDate})),and(effective_date.is.null,end_date.is.null)`)
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

  console.log(`[Schedules API] Query returned ${data?.length || 0} schedules`)
  
  // Log first few schedules for debugging
  if (data && data.length > 0) {
    console.log('[Schedules API] Sample schedules:', data.slice(0, 3).map(s => ({
      id: s.id,
      effective_date: s.effective_date,
      end_date: s.end_date,
      shift_start: s.shift_start,
      user: s.profiles?.full_name
    })))
  }

  return NextResponse.json({ data: data || [], error: null })
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

  console.log('[Schedules API POST] Creating schedule:', { user_id, day_of_week, shift_start, shift_end, location_id, effective_date, end_date })

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
    console.error('[Schedules API POST] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[Schedules API POST] Schedule created successfully:', data)
  return NextResponse.json({ data, error: null }, { status: 201 })
}
