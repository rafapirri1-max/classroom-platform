'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function TeacherAnalytics() {
  const [profile, setProfile] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [allSessions, setAllSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const prof = await getUserProfile()
    if (!prof || prof.role !== 'teacher') { router.push('/login'); return }
    setProfile(prof)
    const { data: classData } = await supabase.from('classes').select('*').eq('teacher_id', prof.id)
    setClasses(classData || [])
    const classCodes = (classData || []).map(c => c.class_code)
    if (classCodes.length > 0) {
      const { data: sess } = await supabase.from('game_sessions').select('*').in('room_code', classCodes).order('created_at', { ascending: false })
      setAllSessions(sess || [])
    }
    setLoading(false)
  }

  const totalStudents = classes.reduce((acc, c) => acc + (c.student_count || 0), 0)
  const avgAccuracy = allSessions.length > 0 ? Math.round(allSessions.reduce((acc, s) => acc + (s.accuracy_percent || 0), 0) / allSessions.length) : 0

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/teacher')}
              className="text-gray-400 hover:text-white transition flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-600">|</span>
            <h1 className="text-xl font-bold">Analytics Overview</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-400">{classes.length}</div>
            <div className="text-gray-400 text-sm">Classes</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400">{totalStudents}</div>
            <div className="text-gray-400 text-sm">Students</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">{allSessions.length}</div>
            <div className="text-gray-400 text-sm">Total Sessions</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-400">{avgAccuracy}%</div>
            <div className="text-gray-400 text-sm">Avg Accuracy</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
          {allSessions.length === 0 ? (
            <p className="text-gray-500">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {allSessions.slice(0, 10).map((sess) => (
                <div key={sess.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{sess.game_type} — {sess.mode}</div>
                    <div className="text-xs text-gray-500">Room: {sess.room_code} • {new Date(sess.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Score: {sess.score}</div>
                    <div className="text-xs text-gray-500">{sess.accuracy_percent}% accuracy</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
