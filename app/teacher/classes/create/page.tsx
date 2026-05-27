'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export default function CreateClass() {
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const router = useRouter()

  const generateNewCode = () => setClassCode(generateClassCode())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!className.trim() || !classCode.trim()) return
    setLoading(true)
    const profile = await getUserProfile()
    if (!profile) { setLoading(false); return }
    
    const { data, error } = await supabase
      .from('classes')
      .insert({ teacher_id: profile.id, class_code: classCode, class_name: className, subject: subject || null })
      .select().single()
    
    setLoading(false)
    if (error) { alert('Error: ' + error.message); return }
    setCreated(true)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(classCode)
    alert('Class code copied!')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push('/teacher')}
            className="text-gray-400 hover:text-white transition flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Class</h1>

        {created ? (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold mb-2">Class Created!</h2>
            <p className="text-gray-300 mb-6">Share this code with your students:</p>
            <div className="bg-gray-800 rounded-lg p-4 mb-6 inline-block">
              <div className="text-4xl font-mono font-bold text-blue-400 tracking-wider">{classCode}</div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={copyCode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">Copy Code</button>
              <a href="/teacher"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition">Go to Dashboard</a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Class Name *</label>
              <input type="text" value={className} onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Business Studies 8A" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Subject (optional)</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., IGCSE Business Studies" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Class Code</label>
              <div className="flex gap-3">
                <input type="text" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Generate or type code" maxLength={6} required />
                <button type="button" onClick={generateNewCode}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition">Generate</button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Students will use this code to join your class.</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => router.push('/teacher')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition">Cancel</button>
              <button type="submit" disabled={loading || !className.trim() || !classCode.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition">
                {loading ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
