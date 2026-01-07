import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// PUT update employee
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  
  // If password is being updated, hash it
  if (body.password) {
    body.password_hash = await bcrypt.hash(body.password, 10)
    delete body.password
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', params.id)
    .select()

  return NextResponse.json({ data, error })
}

// DELETE employee (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft delete - set is_active to false
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', params.id)
    .select()

  return NextResponse.json({ data, error })
}
