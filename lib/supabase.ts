import { createClient as createSupabaseClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export function createClient() {
  return supabase
}

export type StudentProfile = {
  id: string
  auth_id: string
  email: string
  name: string
  role: string
  [key: string]: unknown
}

export type EnsureProfileResult = {
  profile: StudentProfile | null
  error?: string
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(options?: {
  ensureIfMissing?: boolean
  role?: 'student' | 'teacher'
}): Promise<StudentProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getUserProfile lookup failed:', error.code, error.message)
    return null
  }

  if (data) return data as StudentProfile

  if (!options?.ensureIfMissing) return null

  const { profile, error: ensureError } = await ensureStudentProfile({
    authId: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.full_name as string) || undefined,
    role: options.role ?? 'student',
  })

  if (ensureError) {
    console.error('getUserProfile ensure failed:', ensureError)
    return null
  }

  return profile
}

/** Find or create exactly one students row per auth_id (link by email if needed). */
export async function ensureStudentProfile(options: {
  authId: string
  email: string
  name?: string
  role?: 'student' | 'teacher'
}): Promise<EnsureProfileResult> {
  const { authId, email, name, role = 'student' } = options
  const displayName = name?.trim() || email.split('@')[0] || 'Student'

  const { data: byAuth, error: authLookupError } = await supabase
    .from('students')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()

  if (authLookupError) {
    return { profile: null, error: authLookupError.message }
  }
  if (byAuth) return { profile: byAuth as StudentProfile }

  if (email) {
    const { data: byEmail, error: emailLookupError } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (emailLookupError) {
      return { profile: null, error: emailLookupError.message }
    }

    if (byEmail) {
      if (byEmail.auth_id && byEmail.auth_id !== authId) {
        return {
          profile: null,
          error: 'This email is already linked to a different account.',
        }
      }

      const { data: linked, error: linkError } = await supabase
        .from('students')
        .update({ auth_id: authId })
        .eq('id', byEmail.id)
        .select()
        .maybeSingle()

      if (linkError) {
        return { profile: null, error: linkError.message }
      }
      if (linked) return { profile: linked as StudentProfile }
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('students')
    .insert({
      auth_id: authId,
      email,
      name: displayName,
      role,
    })
    .select()
    .maybeSingle()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle()
      if (existing) return { profile: existing as StudentProfile }
    }
    return { profile: null, error: insertError.message }
  }

  if (!inserted) {
    return { profile: null, error: 'Profile was not created.' }
  }

  return { profile: inserted as StudentProfile }
}

export async function isTeacher() {
  const profile = await getUserProfile()
  return profile?.role === 'teacher'
}
