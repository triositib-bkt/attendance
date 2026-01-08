import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST create office area
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { location_id, name, description } = body

  if (!location_id || !name) {
    return NextResponse.json(
      { error: 'location_id and name are required' }, 
      { status: 400 }
    )
  }
  
  const { data, error } = await supabase
    .from('office_areas')
    .insert({
      location_id,
      name,
      description: description || null,
      is_active: true,
    })
    .select()

  if (error) {
    return NextResponse.json({ data: null, error }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
