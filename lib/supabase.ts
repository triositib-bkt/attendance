import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables are not set')
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey)
}
