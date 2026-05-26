'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // Supabase automatically handles the URL hash with tokens
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth error:', error)
        router.push('/login')
        return
      }

      if (session?.user) {
        // Check if user exists in our students table
        const { data: existing } = await supabase
          .from('students')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (!existing) {
          // New user — create record
          await supabase.from('students').insert({
            auth_id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
            role: 'student'
          })
        }

        // Redirect based on role
        const { data: userData } = await supabase
          .from('students')
          .select('role')
          .eq('auth_id', session.user.id)
          .single()

        if (userData?.role === 'teacher') {
          router.push('/teacher')
        } else {
          router.push('/')
        }
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Signing you in...</p>
      </div>
    </div>
  )
}
