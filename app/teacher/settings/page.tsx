'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function TeacherSettings() {
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const prof = await getUserProfile()
    if (!prof || prof.role !== 'teacher') { router.push('/login'); return }
    setProfile(prof)
    setName(prof.name || '')
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('students').update({ name }).eq('id', profile.id)
    setSaving(false)
    alert('Profile updated!')
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push('/teacher')}
            className="text-gray-400 hover:text-white transition flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={profile?.email} disabled
                className="w-full bg-gray-700/50 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <p className="text-gray-400 text-sm mb-4">Deleting your account will remove all classes, student data, and session history. This cannot be undone.</p>
          <button onClick={() => alert('Contact support to delete your account.')}
            className="bg-red-900/50 hover:bg-red-900/70 text-red-300 border border-red-700 px-6 py-2 rounded-lg transition">
            Delete Account
          </button>
        </div>
      </main>
    </div>
  )
}
