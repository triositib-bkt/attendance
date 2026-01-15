import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST generate job checklists for a date or date range
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { startDate, endDate } = body

    const start = startDate || new Date().toISOString().split('T')[0]
    const end = endDate || start

    // Validate dates
    if (new Date(start) > new Date(end)) {
      return NextResponse.json({ error: 'Start date must be before or equal to end date' }, { status: 400 })
    }

    let totalCreated = 0
    let totalSkipped = 0
    const currentDate = new Date(start)
    const endDateObj = new Date(end)

    // Generate checklists for each date in the range
    while (currentDate <= endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .rpc('generate_daily_checklists', { target_date: dateString })

      if (error) {
        console.error(`Error generating for ${dateString}:`, error)
      } else {
        totalCreated += data || 0
        // Count skipped by checking existing checklists
        const { count } = await supabase
          .from('job_checklists')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_date', dateString)
        totalSkipped += (count || 0) - (data || 0)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({ 
      totalCreated, 
      skipped: Math.max(0, totalSkipped),
      error: null 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
