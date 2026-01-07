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

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  let query = supabase
    .from('attendance')
    .select('*')
    .eq('user_id', session.user.id)
    .order('check_in', { ascending: false })

  if (startDate) {
    query = query.gte('check_in', startDate)
  }

  if (endDate) {
    query = query.lte('check_in', endDate)
  }

  const { data, error } = await query

  return NextResponse.json({ data, error })
}
