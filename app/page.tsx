'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRoomCode = searchParams.get('room') || ''
  
  const [roomCode, setRoomCode] = useState(urlRoomCode)
  const [name, setName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [showJoinClass, setShowJoinClass] = useState(false)

  useEffect(() => { loadUserData() }, [])

  async function loadUserData() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    if (session?.user) {
      const prof = await getUserProfile()
      setProfile(prof)
      const { data: enrollments } = await supabase
        .from('class_enrollments').select('*, classes(class_name, class_code, teacher_id)').eq('student_id', prof?.id)
      setMyClasses(enrollments || [])
    }
    setLoading(false)
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !name.trim()) return
    
    // Look up room by code to get UUID
    const { data: room } = await supabase
      .from('rooms').select('id, code, status').eq('code', roomCode.toUpperCase()).single()
    
    if (!room) {
      alert('Room not found. Check the code and try again.')
      return
    }
    
    if (room.status === 'closed') {
      alert('This room is closed.')
      return
    }
    
    // Add participant
    await supabase.from('participants').insert({
      room_id: room.id,
      name: name,
      participant_id: Math.random().toString(36).substring(2, 15)
    })
    
    if (user && profile) {
      await supabase.from('game_sessions').insert({
        student_id: profile.id, game_type: 'join', mode: 'room', room_code: roomCode.toUpperCase(), score: 0, completed: false
      })
    }
    
    // Redirect to room with UUID
    router.push(`/student/${room.id}?name=${encodeURIComponent(name)}`)
  }

  const handleJoinClass = async () => {
    if (!classCode.trim() || !user || !profile) { alert('Please sign in first.'); return }
    const { data: cls } = await supabase.from('classes').select('*').eq('class_code', classCode.toUpperCase()).single()
    if (!cls) { alert('Class not found.'); return }
    const { error } = await supabase.from('class_enrollments').insert({ class_id: cls.id, student_id: profile.id })
    if (error) {
      if (error.message.includes('duplicate')) alert('Already enrolled!')
      else alert('Error: ' + error.message)
      return
    }
    alert(`Joined ${cls.class_name}!`)
    setShowJoinClass(false)
    setClassCode('')
    loadUserData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMyClasses([])
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Student Portal</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <a href="/student/profile" className="text-sm text-gray-400 hover:text-white transition">Profile</a>
                <button onClick={handleLogout}
                  className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-900 hover:bg-red-900/30 transition">Logout</button>
              </>
            ) : (
              <a href="/login" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">Sign In</a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><span>🚪</span> Join a Room</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your name" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Room Code</label>
              <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter 4-digit code" maxLength={4} />
            </div>
            <button onClick={handleJoinRoom} disabled={!roomCode.trim() || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition">Join Room</button>
          </div>
        </div>

        {user && (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><span>📚</span> My Classes</h2>
              <button onClick={() => setShowJoinClass(!showJoinClass)}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition">
                {showJoinClass ? 'Cancel' : '+ Join Class'}
              </button>
            </div>
            {showJoinClass && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <input type="text" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter class code" maxLength={6} />
                  <button onClick={handleJoinClass} disabled={!classCode.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition">Join</button>
                </div>
              </div>
            )}
            {myClasses.length === 0 ? (
              <p className="text-gray-500 text-sm">No classes yet. Join a class with a code from your teacher.</p>
            ) : (
              <div className="space-y-2">
                {myClasses.map((enrollment) => (
                  <div key={enrollment.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{enrollment.classes?.class_name}</div>
                      <div className="text-xs text-gray-500">Code: {enrollment.classes?.class_code}</div>
                    </div>
                    <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">Enrolled</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {user && profile && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><span>📈</span> My Progress</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{myClasses.length}</div>
                <div className="text-xs text-gray-500">Classes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">—</div>
                <div className="text-xs text-gray-500">Games Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">—</div>
                <div className="text-xs text-gray-500">Badges</div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <a href="/teacher/login" className="text-sm text-gray-500 hover:text-gray-400 transition">Are you a teacher? Login here →</a>
        </div>
      </main>
    </div>
  )
}
