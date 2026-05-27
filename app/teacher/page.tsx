'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    
    setUser(session.user)
    const prof = await getUserProfile()
    setProfile(prof)
    
    if (prof?.role !== 'teacher') { router.push('/'); return }
    
    const { data: classData } = await supabase
      .from('classes').select('*').eq('teacher_id', prof.id).order('created_at', { ascending: false })
    setClasses(classData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-white transition flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Home
            </a>
            <span className="text-gray-600">|</span>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.email}</span>
            <button onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-900 hover:bg-red-900/30 transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-400">{classes.length}</div>
            <div className="text-gray-400 text-sm mt-1">Active Classes</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400">
              {classes.reduce((acc, c) => acc + (c.student_count || 0), 0)}
            </div>
            <div className="text-gray-400 text-sm mt-1">Total Students</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">
              {classes.reduce((acc, c) => acc + (c.session_count || 0), 0)}
            </div>
            <div className="text-gray-400 text-sm mt-1">Sessions Run</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">My Classes</h2>
            <a href="/teacher/classes/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Class
            </a>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-4">Create your first class to get started.</p>
              <a href="/teacher/classes/create"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                Create First Class
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-900/50 rounded-lg flex items-center justify-center text-2xl">🏫</div>
                    <div>
                      <h3 className="font-semibold">{cls.class_name}</h3>
                      <p className="text-sm text-gray-400">Code: <span className="font-mono text-blue-400">{cls.class_code}</span></p>
                      <p className="text-xs text-gray-500">{cls.subject || 'No subject'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <div className="text-sm font-medium">{cls.student_count || 0} students</div>
                      <div className="text-xs text-gray-500">{cls.session_count || 0} sessions</div>
                    </div>
                    <a href={`/teacher/classes/${cls.id}`}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition text-sm">
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <a href="/teacher/analytics"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold">Analytics</h3>
            <p className="text-sm text-gray-500">View class performance and trends</p>
          </a>
          <a href="/teacher/settings"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition">
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="font-semibold">Settings</h3>
            <p className="text-sm text-gray-500">Manage your account and preferences</p>
          </a>
        </div>
      </main>
    </div>
  )
}
