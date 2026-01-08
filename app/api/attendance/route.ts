import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

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

  // Check if location is within allowed areas
  let isWithinAllowedLocation = false
  let nearestLocation = null
  let minDistance = Infinity

  if (locations && locations.length > 0) {
    for (const location of locations) {
      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearestLocation = location
      }
      
      if (distance <= location.radius_meters) {
        isWithinAllowedLocation = true
        break
      }
    }
  }

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
        check_in_location_valid: isWithinAllowedLocation,
        status: 'present'
      })
      .select()
    
    return NextResponse.json({ 
      data, 
      error,
      locationValid: isWithinAllowedLocation,
      distance: minDistance,
      nearestLocation: nearestLocation?.name
    })
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
        check_out_lng: longitude,
        check_out_location_valid: isWithinAllowedLocation
      })
      .eq('id', record.id)
      .select()
    
    return NextResponse.json({ 
      data, 
      error,
      locationValid: isWithinAllowedLocation,
      distance: minDistance,
      nearestLocation: nearestLocation?.name
    })
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
