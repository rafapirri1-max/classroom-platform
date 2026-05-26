import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper to check if user is teacher
export async function isTeacher() {
  const user = await getCurrentUser()
  if (!user) return false
  
  const { data } = await supabase
    .from('students')
    .select('role')
    .eq('auth_id', user.id)
    .single()
    
  return data?.role === 'teacher'
}
