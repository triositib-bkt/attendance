import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  return NextResponse.json({
    session,
    hasSession: !!session,
    user: session?.user || null,
    role: session?.user?.role || null,
  })
}
