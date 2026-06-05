'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'
import ClassAnalytics from './analytics'

export default function ClassDetail() {
  const params = useParams()
  const classId = params.id as string
  const router = useRouter()

  const [classData, setClassData] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'sessions' | 'analytics'>('students')
  const [editingName, setEditingName] = useState(false)
  const [newClassName, setNewClassName] = useState('')

  useEffect(() => { loadClassData() }, [classId])

  async function loadClassData() {
    const profile = await getUserProfile()
    if (!profile) { router.push('/login'); return }

    const { data: cls } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('teacher_id', profile.id)
      .single()

    if (!cls) { router.push('/teacher'); return }

    setClassData(cls)
    setNewClassName(cls.class_name)

    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('*, students(name, email)')
      .eq('class_id', classId)

    setStudents(enrollments || [])

    const { data: sess } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_code', cls.class_code)
      .order('created_at', { ascending: false })

    setSessions(sess || [])
    setLoading(false)
  }

  async function updateClassName() {
    if (!newClassName.trim()) return
    const { error } = await supabase
      .from('classes')
      .update({ class_name: newClassName.trim() })
      .eq('id', classId)

    if (error) {
      alert('Error updating class: ' + error.message)
      return
    }

    setClassData({ ...classData, class_name: newClassName.trim() })
    setEditingName(false)
  }

  async function removeStudent(enrollmentId: string) {
    if (!confirm('Remove this student from the class?')) return
    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (error) {
      alert('Error removing student: ' + error.message)
      return
    }

    loadClassData()
  }

  const copyCode = () => {
    if (classData?.class_code) {
      navigator.clipboard.writeText(classData.class_code)
      alert('Class code copied!')
    }
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
            <button onClick={() => router.push('/teacher')}
              className="text-gray-400 hover:text-white transition flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Classes
            </button>
            <span className="text-gray-600">|</span>

            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-gray-700 text-white rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && updateClassName()}
                  autoFocus
                />
                <button onClick={updateClassName} className="text-green-400 hover:text-green-300 text-sm">✓</button>
                <button onClick={() => { setEditingName(false); setNewClassName(classData?.class_name || '') }} className="text-red-400 hover:text-red-300 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{classData?.class_name}</h1>
                <button onClick={() => setEditingName(true)} className="text-gray-500 hover:text-white text-sm">
                  ✏️
                </button>
              </div>
            )}
          </div>

          <button onClick={copyCode}
            className="bg-blue-900/50 hover:bg-blue-900 text-blue-300 px-3 py-1 rounded border border-blue-700 transition text-sm">
            Copy Code: {classData?.class_code}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6">
          {(['students', 'sessions', 'analytics'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Enrolled Students ({students.length})</h2>
              <p className="text-sm text-gray-500">
                Class code: <span className="font-mono text-blue-400">{classData?.class_code}</span>
              </p>
            </div>
            {students.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-gray-400">No students enrolled yet.</p>
                <p className="text-sm text-gray-500 mt-2">Share the class code with your students.</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Joined</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3">{s.students?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{s.students?.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(s.enrolled_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeStudent(s.id)}
                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900/30 transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Game Sessions ({sessions.length})</h2>
            {sessions.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">🎮</div>
                <p className="text-gray-400">No sessions yet.</p>
                <p className="text-sm text-gray-500 mt-2">Students will appear here after playing games.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div key={sess.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{sess.game_type} — {sess.mode}</div>
                      <div className="text-sm text-gray-500">{new Date(sess.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm">Score: <span className="text-green-400">{sess.score}</span></div>
                        <div className="text-xs text-gray-500">{sess.accuracy_percent}% accuracy</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${sess.completed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                        {sess.completed ? 'Completed' : 'In Progress'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <ClassAnalytics classId={classId} classCode={classData?.class_code || ''} />
        )}
      </main>
    </div>
  )
}
