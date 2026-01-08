import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET all employees
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  if (!['admin', 'manager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: employees, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Fetched employees:', employees?.length || 0)
  return NextResponse.json({ data: employees, error: null })
}

// POST create employee
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, role, department, position, employee_id, phone } = body

  try {
    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Create profile with hashed password using admin client
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        email,
        full_name,
        role,
        department,
        position,
        employee_id,
        phone,
        password_hash,
      })
      .select()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log('Employee created:', profileData)
    return NextResponse.json({ data: profileData, error: null })
  } catch (error) {
    console.error('Employee creation failed:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
