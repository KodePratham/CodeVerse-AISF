import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Don't throw during build - allow graceful degradation
const isConfigured = supabaseUrl && supabaseAnonKey

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

// For server-side operations
export const createServerSupabaseClient = () => {
  if (!isConfigured) {
    console.warn('Supabase not configured - environment variables missing')
    return null
  }
  
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing, using anon key')
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Database types
export interface User {
  id: string
  clerk_user_id: string
  email: string
  username: string | null
  profile_image_url: string | null
  created_at: string
  updated_at: string
}
