'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StudentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const participantId = searchParams.get('pid') || ''
  const name = searchParams.get('name') || 'Student'

  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
  }, [roomId])

  useEffect(() => {
    loadRoom()
    setLoading(false)

    const channel = supabase.channel(`student-room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [roomId, loadRoom])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950">
        <div className="text-white text-xl">Connecting to room...</div>
      </div>
    )
  }

  if (!room || room.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20 max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Room Closed</h2>
          <p className="text-indigo-200">Ask your teacher for a new room code.</p>
        </div>
      </div>
    )
  }

  const activity = room.current_activity || 'waiting'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950">
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-semibold">👤 {name}</div>
        <div className="text-accent font-bold tracking-widest">{room.code}</div>
      </div>

      <div className="p-4">
        {activity === 'waiting' && (
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-2">Waiting for teacher...</h2>
              <p className="text-indigo-200">Your teacher will launch an activity soon</p>
            </div>
          </div>
        )}
        {(activity === 'bias_game' || activity === 'bias-game') && (
          <div className="h-[calc(100vh-60px)]">
            <iframe src="/bias_game.html" className="w-full h-full border-0 rounded-xl" title="Bias Detective Game" />
          </div>
        )}
        {activity === 'poll' && (
          <div className="max-w-md mx-auto mt-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">📊 Quick Poll</h2>
            <div className="space-y-3">
              {['Option A', 'Option B', 'Option C', 'Option D'].map((opt) => (
                <button key={opt} className="w-full p-4 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors border border-white/20">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {activity === 'wordcloud' && (
          <div className="max-w-md mx-auto mt-8">
            <h2 className="text-xl font-bold text-white mb-2 text-center">☁️ Word Cloud</h2>
            <p className="text-indigo-200 text-center mb-6">Type one word that comes to mind</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter a word..." maxLength={20} className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-accent" />
              <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90">Submit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
