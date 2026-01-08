import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin or manager
  if (!['admin', 'manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { date, userId } = await request.json()

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Get attendance records for the specified date
    let query = supabase
      .from('attendance')
      .select('*')
      .gte('check_in', startOfDay.toISOString())
      .lte('check_in', endOfDay.toISOString())

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: attendanceRecords, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return NextResponse.json({ 
        message: 'No attendance records found for recomputation',
        updated: 0 
      })
    }

    let updatedCount = 0
    const errors: string[] = []

    // Process each attendance record
    for (const record of attendanceRecords) {
      try {
        const checkInDate = new Date(record.check_in)
        const dayOfWeek = checkInDate.getDay()
        const checkInTime = checkInDate.toTimeString().slice(0, 8)
        const recordDate = checkInDate.toISOString().split('T')[0]

        // Get employee schedule for that day
        const { data: schedules } = await supabase
          .from('employee_schedules')
          .select('*')
          .eq('user_id', record.user_id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true)

        let newStatus = 'present'

        if (schedules && schedules.length > 0) {
          // Prioritize date-specific schedules over recurring ones
          const dateSpecificSchedules = schedules.filter(s => {
            if (!s.effective_date) return false
            const effectiveDate = new Date(s.effective_date)
            const endDate = s.end_date ? new Date(s.end_date) : null
            const currentDate = new Date(recordDate)
            
            return currentDate >= effectiveDate && (!endDate || currentDate <= endDate)
          })

          const recurringSchedules = schedules.filter(s => !s.effective_date)
          
          const schedule = dateSpecificSchedules.length > 0 
            ? dateSpecificSchedules[0] 
            : recurringSchedules[0]

          if (schedule) {
            // Check if late (more than 15 minutes after shift start)
            const shiftStart = new Date(`1970-01-01T${schedule.shift_start}`)
            const checkInTimeParsed = new Date(`1970-01-01T${checkInTime}`)
            const lateThreshold = new Date(shiftStart.getTime() + 15 * 60000) // 15 minutes
            
            if (checkInTimeParsed > lateThreshold) {
              newStatus = 'late'
            }
          }
        }

        // Update the attendance record if status changed
        if (newStatus !== record.status) {
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ status: newStatus })
            .eq('id', record.id)

          if (updateError) {
            errors.push(`Failed to update record ${record.id}: ${updateError.message}`)
          } else {
            updatedCount++
          }
        }
      } catch (error: any) {
        errors.push(`Error processing record ${record.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      message: `Recomputation completed. ${updatedCount} records updated.`,
      updated: updatedCount,
      total: attendanceRecords.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Recompute error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
