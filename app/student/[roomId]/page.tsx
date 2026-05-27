'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'
import { startGameSession, endGameSession } from '@/lib/tracking'

export default function StudentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const participantId = searchParams.get('pid') || ''
  const name = searchParams.get('name') || 'Student'

  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [gameSessionId, setGameSessionId] = useState<string | null>(null)

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
  }, [roomId])

  useEffect(() => {
    loadRoom()
    setLoading(false)

    // Load user profile for tracking
    getUserProfile().then(prof => setProfile(prof))

    const channel = supabase.channel(`student-room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [roomId, loadRoom])

  // Track when bias game launches
  useEffect(() => {
    const activity = room?.current_activity
    if (activity === 'bias_game' && profile && !gameSessionId) {
      startGameSession(profile.id, 'bias', 'detective', room.code).then(id => {
        setGameSessionId(id)
      })
    }
  }, [room?.current_activity, profile, gameSessionId, room?.code])

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
        <div className="text-white font-semibold">👤 {name
