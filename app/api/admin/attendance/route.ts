import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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
  const date = searchParams.get('date')

  let query = supabase
    .from('attendance')
    .select(`
      *,
      profiles (
        full_name,
        employee_id,
        department
      )
    `)
    .order('check_in', { ascending: false })

  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    query = query
      .gte('check_in', startOfDay.toISOString())
      .lte('check_in', endOfDay.toISOString())
  }

  const { data, error } = await query

  return NextResponse.json({ data, error })
}
