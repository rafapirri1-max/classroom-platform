'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function StudentProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const prof = await getUserProfile()
    if (!prof) { router.push('/login'); return }
    setProfile(prof)
    const { data: sess } = await supabase.from('game_sessions').select('*').eq('student_id', prof.id).order('created_at', { ascending: false }).limit(20)
    setSessions(sess || [])
    const { data: badgeData } = await supabase.from('student_badges').select('*, badges(name, description, icon)').eq('student_id', prof.id)
    setBadges(badgeData || [])
    setLoading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-white transition flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Home
            </a>
            <span className="text-gray-600">|</span>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <button onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-900 hover:bg-red-900/30 transition">Logout</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center text-3xl">👤</div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <p className="text-gray-400 text-sm">{profile?.email}</p>
              <span className="inline-block mt-1 bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded">{profile?.role === 'teacher' ? 'Teacher' : 'Student'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🏅 My Badges ({badges.length})</h3>
          {badges.length === 0 ? (
            <p className="text-gray-500 text-sm">No badges yet. Play games to earn them!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div key={b.id} className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">{b.badges?.icon || '🏅'}</div>
                  <div className="text-sm font-medium">{b.badges?.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🎮 Recent Games</h3>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No games played yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((sess) => (
                <div key={sess.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{sess.game_type} — {sess.mode}</div>
                    <div className="text-xs text-gray-500">{new Date(sess.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">{sess.score} pts</div>
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
