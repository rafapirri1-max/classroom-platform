'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ensureStudentProfile, getUserProfile } from '@/lib/supabase'

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkRoleAndRedirect()
      }
    })
  }, [router])

  async function checkRoleAndRedirect() {
    const profile = await getUserProfile({ ensureIfMissing: true, role: 'teacher' })
    if (profile?.role === 'teacher') {
      router.push('/teacher')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      })
      
      if (signUpError) { 
        setError(signUpError.message)
        setLoading(false)
        return
      }
      
      if (!data.user) {
        setError('Signup failed - no user created')
        setLoading(false)
        return
      }

      const { profile, error: profileError } = await ensureStudentProfile({
        authId: data.user.id,
        email: data.user.email ?? email,
        name: name || email.split('@')[0],
        role: 'teacher',
      })

      if (profileError || !profile) {
        setError(
          profileError
            ? `Account created but profile setup failed: ${profileError}`
            : 'Account created but profile setup failed. Please sign in to try again.'
        )
        setLoading(false)
        return
      }

      setLoading(false)
      router.push('/teacher')
      
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (signInError) { 
        setError(signInError.message)
        setLoading(false)
        return
      }
      
      if (!data.user) {
        setError('Login failed - no user found')
        setLoading(false)
        return
      }

      const profile = await getUserProfile({ ensureIfMissing: true, role: 'teacher' })

      if (!profile) {
        setError('Signed in but your teacher profile could not be loaded. Please try again.')
        setLoading(false)
        await supabase.auth.signOut()
        return
      }

      if (profile.role === 'teacher') {
        setLoading(false)
        router.push('/teacher')
      } else {
        setError('This account is not registered as a teacher.')
        setLoading(false)
        await supabase.auth.signOut()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏫</div>
          <h1 className="text-2xl font-bold text-white">Teacher Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Professional tools for educators</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-gray-300 text-sm mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          )}
          <div>
            <label className="block text-gray-300 text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition">
            {loading ? 'Loading...' : isSignup ? 'Create Teacher Account' : 'Sign In as Teacher'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400 text-sm">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignup(!isSignup); setError('') }}
            className="text-blue-400 hover:text-blue-300 underline">{isSignup ? 'Sign in' : 'Sign up'}</button>
        </p>

        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-400">Student login →</a>
        </div>
      </div>
    </div>
  )
}
