import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const { type, latitude, longitude } = await request.json()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get active work locations
  const { data: locations } = await supabase
    .from('work_locations')
    .select('*')
    .eq('is_active', true)

  // Verify location (optional - can be disabled for testing)
  // if (locations && locations.length > 0) {
  //   const withinRange = locations.some(location => {
  //     const distance = calculateDistance(
  //       latitude,
  //       longitude,
  //       location.latitude,
  //       location.longitude
  //     )
  //     return distance <= location.radius_meters
  //   })
  //
  //   if (!withinRange) {
  //     return NextResponse.json(
  //       { error: 'You are not within the allowed location' },
  //       { status: 400 }
  //     )
  //   }
  // }

  if (type === 'check-in') {
    // Check if already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: existingCheckIn } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('check_in', today.toISOString())
      .is('check_out', null)
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'You have already checked in today' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: session.user.id,
        check_in: new Date().toISOString(),
        check_in_lat: latitude,
        check_in_lng: longitude,
        status: 'present'
      })
      .select()
    
    return NextResponse.json({ data, error })
  } else if (type === 'check-out') {
    // Get today's attendance record without check-out
    const { data: record } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .single()

    if (!record) {
      return NextResponse.json(
        { error: 'No active check-in found' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        check_out_lat: latitude,
        check_out_lng: longitude
      })
      .eq('id', record.id)
      .select()
    
    return NextResponse.json({ data, error })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

// GET current attendance status
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get today's attendance
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('check_in', today.toISOString())
    .order('check_in', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ data, error })
}
