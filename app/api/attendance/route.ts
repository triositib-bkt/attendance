import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const { data: existingCheckIn } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('check_in', todayStart.toISOString())
      .is('check_out', null)
      .single()

    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'You have already checked in today' },
        { status: 400 }
      )
    }

    // Check employee schedule for today
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sunday, 1=Monday, etc.
    const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD

    const { data: schedules } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    let status = 'present'
    let scheduleInfo = null

    if (schedules && schedules.length > 0) {
      // Prioritize date-specific schedules over recurring ones
      const dateSpecificSchedules = schedules.filter(s => {
        if (!s.effective_date) return false
        const effectiveDate = new Date(s.effective_date)
        const endDate = s.end_date ? new Date(s.end_date) : null
        const currentDate = new Date(today)
        
        return currentDate >= effectiveDate && (!endDate || currentDate <= endDate)
      })

      const recurringSchedules = schedules.filter(s => !s.effective_date)
      
      const schedule = dateSpecificSchedules.length > 0 
        ? dateSpecificSchedules[0] 
        : recurringSchedules[0]

      if (schedule) {
        scheduleInfo = {
          shift_start: schedule.shift_start,
          shift_end: schedule.shift_end,
          location_id: schedule.location_id
        }
        
        // Check if late (more than 15 minutes after shift start)
        const shiftStart = new Date(`1970-01-01T${schedule.shift_start}`)
        const checkInTime = new Date(`1970-01-01T${currentTime}`)
        const lateThreshold = new Date(shiftStart.getTime() + 15 * 60000) // 15 minutes
        
        if (checkInTime > lateThreshold) {
          status = 'late'
        }
      }
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: session.user.id,
        check_in: new Date().toISOString(),
        check_in_lat: latitude,
        check_in_lng: longitude,
        check_in_location_valid: isWithinAllowedLocation,
        status
      })
      .select()
    
    return NextResponse.json({ 
      data, 
      error,
      locationValid: isWithinAllowedLocation,
      distance: minDistance,
      nearestLocation: nearestLocation?.name,
      schedule: scheduleInfo,
      status
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

    // Check if checking out early
    let isEarlyCheckout = false
    let scheduleInfo = null
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS
    const today = now.toISOString().split('T')[0]

    const { data: schedules } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    if (schedules && schedules.length > 0) {
      // Prioritize date-specific schedules over recurring ones
      const dateSpecificSchedules = schedules.filter(s => {
        if (!s.effective_date) return false
        const effectiveDate = new Date(s.effective_date)
        const endDate = s.end_date ? new Date(s.end_date) : null
        const currentDate = new Date(today)
        
        return currentDate >= effectiveDate && (!endDate || currentDate <= endDate)
      })

      const recurringSchedules = schedules.filter(s => !s.effective_date)
      
      const schedule = dateSpecificSchedules.length > 0 
        ? dateSpecificSchedules[0] 
        : recurringSchedules[0]

      if (schedule) {
        scheduleInfo = {
          shift_start: schedule.shift_start,
          shift_end: schedule.shift_end,
          location_id: schedule.location_id
        }
        
        // Check if early (more than 15 minutes before shift end)
        const shiftEnd = new Date(`1970-01-01T${schedule.shift_end}`)
        const checkOutTime = new Date(`1970-01-01T${currentTime}`)
        const earlyThreshold = new Date(shiftEnd.getTime() - 15 * 60000) // 15 minutes before
        
        if (checkOutTime < earlyThreshold) {
          isEarlyCheckout = true
        }
      }
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
      nearestLocation: nearestLocation?.name,
      schedule: scheduleInfo,
      isEarlyCheckout
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

  return NextResponse.json(
    { data, error },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}
