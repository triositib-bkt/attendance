import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Helper function to generate checklists for a specific location
async function generateForLocation(targetDate: string, locationId: string): Promise<number> {
  // Get all areas for this location
  const { data: areas, error: areasError } = await supabase
    .from('office_areas')
    .select('id')
    .eq('location_id', locationId)
  
  if (areasError || !areas || areas.length === 0) {
    return 0
  }
  
  const areaIds = areas.map(a => a.id)
  const date = new Date(targetDate)
  const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday
  const dayOfMonth = date.getDate()
  
  let totalInserted = 0
  
  // Get active job templates for these areas
  let query = supabase
    .from('job_templates')
    .select('id, area_id, frequency, day_of_week, day_of_month')
    .in('area_id', areaIds)
    .eq('is_active', true)
  
  const { data: templates, error: templatesError } = await query
  
  if (templatesError || !templates) {
    return 0
  }
  
  // Filter templates by frequency and schedule
  const templatesToGenerate = templates.filter(t => {
    if (t.frequency === 'daily') return true
    if (t.frequency === 'weekly' && t.day_of_week === dayOfWeek) return true
    if (t.frequency === 'monthly' && t.day_of_month === dayOfMonth) return true
    return false
  })
  
  // Insert checklists for matching templates
  for (const template of templatesToGenerate) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('job_checklists')
      .select('id')
      .eq('job_template_id', template.id)
      .eq('assigned_date', targetDate)
      .single()
    
    if (!existing) {
      const { error: insertError } = await supabase
        .from('job_checklists')
        .insert({
          job_template_id: template.id,
          area_id: template.area_id,
          assigned_date: targetDate
        })
      
      if (!insertError) {
        totalInserted++
      }
    }
  }
  
  return totalInserted
}

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
    const { startDate, endDate, location_id } = body

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
      
      if (location_id && location_id !== 'all') {
        // Generate for specific location
        const createdCount = await generateForLocation(dateString, location_id)
        totalCreated += createdCount
        
        // Count existing for this location
        const { data: areas } = await supabase
          .from('office_areas')
          .select('id')
          .eq('location_id', location_id)
        
        if (areas && areas.length > 0) {
          const areaIds = areas.map(a => a.id)
          const { count } = await supabase
            .from('job_checklists')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_date', dateString)
            .in('area_id', areaIds)
          totalSkipped += (count || 0) - createdCount
        }
      } else {
        // Generate for all locations using the RPC function
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
