'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [showClosed, setShowClosed] = useState(false)
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
      .from('classes')
      .select('*')
      .eq('teacher_id', prof.id)
      .order('created_at', { ascending: false })

    setClasses(classData || [])

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })

    setRooms(roomData || [])
    setLoading(false)
  }

  async function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code, status: 'active' })
      .select()
      .single()

    if (error) {
      alert('Error creating room: ' + error.message)
      return
    }

    if (data) {
      router.push(`/teacher/room/${data.id}`)
    }
  }

  async function reopenRoom(roomId: string) {
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'active' })
      .eq('id', roomId)

    if (error) {
      alert('Error reopening room: ' + error.message)
      return
    }

    // Refresh rooms
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })

    setRooms(data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeRooms = rooms.filter(r => r.status === 'active')
  const closedRooms = rooms.filter(r => r.status === 'closed')

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
        {/* Stats */}
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
            <div className="text-3xl font-bold text-purple-400">{activeRooms.length}</div>
            <div className="text-gray-400 text-sm mt-1">Active Rooms</div>
          </div>
        </div>

        {/* Classes Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
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
                      <p className="text-sm text-gray-400">
                        Code: <span className="font-mono text-blue-400">{cls.class_code}</span>
                      </p>
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

        {/* Active Rooms Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">🎮 Active Rooms</h2>
            <button
              onClick={createRoom}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Room
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No active rooms</h3>
              <p className="text-gray-500 mb-4">Create a room to launch games with students.</p>
              <button onClick={createRoom}
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition">
                Create First Room
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <div key={room.id}
                  onClick={() => router.push(`/teacher/room/${room.id}`)}
                  className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center text-2xl">🎮</div>
                    <div>
                      <h3 className="font-semibold">Room {room.code}</h3>
                      <p className="text-sm text-gray-400">
                        Created {new Date(room.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300">
                      ACTIVE
                    </span>
                    <span className="text-sm text-gray-400">View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Closed Rooms Section (collapsible) */}
        {closedRooms.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-400">🚪 Closed Rooms ({closedRooms.length})</h2>
              <button
                onClick={() => setShowClosed(!showClosed)}
                className="text-sm text-gray-400 hover:text-white transition">
                {showClosed ? 'Hide' : 'Show'}
              </button>
            </div>

            {showClosed && (
              <div className="space-y-3">
                {closedRooms.map((room) => (
                  <div key={room.id} className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center text-2xl">🎮</div>
                      <div>
                        <h3 className="font-semibold text-gray-400">Room {room.code}</h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(room.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400">
                        CLOSED
                      </span>
                      <button
                        onClick={() => reopenRoom(room.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition">
                        Re-open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
