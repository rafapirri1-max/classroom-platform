'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .eq('status', 'active')
      .single()

    if (roomError || !room) {
      setError('Room not found or inactive.')
      setLoading(false)
      return
    }

    const participantId = Math.random().toString(36).substring(2, 10)

    await supabase.from('participants').insert({
      room_id: room.id,
      name: name || 'Anonymous',
      participant_id: participantId,
    })

    router.push(`/student/${room.id}?pid=${participantId}&name=${encodeURIComponent(name)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-3xl font-bold text-white mb-2">Join a Room</h1>
          <p className="text-indigo-200">Enter your teacher's room code</p>
        </div>

        <form onSubmit={joinRoom} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="mb-4">
            <label className="block text-white text-sm font-semibold mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-semibold mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7392"
              maxLength={4}
              className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-accent text-center text-2xl tracking-widest font-bold"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Room 🚀'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/teacher" className="text-indigo-300 hover:text-white text-sm transition-colors">
            👨‍🏫 I'm a teacher → Teacher Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
