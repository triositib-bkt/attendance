import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { photoData, jobId, type } = await request.json()

    if (!photoData || !jobId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert base64 to buffer
    const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Create unique filename
    const fileName = `${jobId}_${type}_${Date.now()}.jpg`
    
    // Upload to Supabase storage using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('checklist-photos')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('checklist-photos')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
