import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin or manager
  if (!['admin', 'manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const userId = searchParams.get('userId')

  const startDate = startOfMonth(new Date(month + '-01'))
  const endDate = endOfMonth(new Date(month + '-01'))

  // Get all active employees (or specific employee if userId is provided)
  let employeesQuery = supabase
    .from('profiles')
    .select('id, full_name, employee_id, department')
    .eq('is_active', true)
  
  if (userId) {
    employeesQuery = employeesQuery.eq('id', userId)
  }
  
  const { data: employees } = await employeesQuery

  // Get attendance records for the month (filtered by userId if provided)
  let attendanceQuery = supabase
    .from('attendance')
    .select('*')
    .gte('check_in', startDate.toISOString())
    .lte('check_in', endDate.toISOString())
  
  if (userId) {
    attendanceQuery = attendanceQuery.eq('user_id', userId)
  }
  
  const { data: attendance } = await attendanceQuery

  // Get attendance with user details for detailed view
  let detailedAttendanceQuery = supabase
    .from('attendance')
    .select(`
      *,
      profiles:user_id (
        full_name,
        employee_id,
        department
      )
    `)
    .gte('check_in', startDate.toISOString())
    .lte('check_in', endDate.toISOString())
    .order('check_in', { ascending: false })
  
  if (userId) {
    detailedAttendanceQuery = detailedAttendanceQuery.eq('user_id', userId)
  }
  
  const { data: detailedAttendance } = await detailedAttendanceQuery

  // Calculate statistics
  const employeeStats = employees?.map(emp => {
    const empAttendance = attendance?.filter(a => a.user_id === emp.id) || []
    const totalHours = empAttendance.reduce((sum, record) => {
      if (record.check_out) {
        const hours = (new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60)
        return sum + hours
      }
      return sum
    }, 0)

    return {
      ...emp,
      days_present: empAttendance.length,
      total_hours: Math.round(totalHours * 10) / 10,
      avg_hours: empAttendance.length > 0 ? Math.round(totalHours / empAttendance.length * 10) / 10 : 0
    }
  })

  const totalEmployees = employees?.length || 0
  const totalAttendance = attendance?.length || 0
  const workingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const avgAttendance = totalEmployees > 0 ? Math.round((totalAttendance / (totalEmployees * workingDays)) * 100) : 0

  const totalHours = employeeStats?.reduce((sum, emp) => sum + emp.total_hours, 0) || 0

  return NextResponse.json({
    data: {
      totalEmployees,
      avgAttendance,
      totalHours: Math.round(totalHours * 10) / 10,
      employees: employeeStats,
      attendanceRecords: detailedAttendance
    }
  })
}
