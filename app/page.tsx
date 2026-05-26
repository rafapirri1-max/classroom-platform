'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })
  }, [])

  const handleJoin = async () => {
    if (!roomCode.trim() || !name.trim()) return
    router.push(`/student/${roomCode}?name=${encodeURIComponent(name)}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto pt-12">
        {/* Auth bar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Student Portal</h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Logout
              </button>
            </div>
          ) : (
            <a href="/login" className="text-sm text-blue-400 hover:text-blue-300">
              Sign in
            </a>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Join a Room</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 4-digit code"
                maxLength={4}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!roomCode.trim() || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Join Room
            </button>
          </div>
        </div>

        {user && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">My Progress</h2>
            <p className="text-gray-400 text-sm">Your game history and badges will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
