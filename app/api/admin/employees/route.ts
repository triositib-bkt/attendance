import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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

  const { data: employees, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: employees, error })
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

    // Create profile with hashed password
    const { data: profileData, error: profileError } = await supabase
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
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ data: profileData, error: null })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
