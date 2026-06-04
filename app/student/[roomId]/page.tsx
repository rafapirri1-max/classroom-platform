'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

export default function StudentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const name = searchParams.get('name') || 'Student'

  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  // Use refs for tracking so message handler always has current values
  const sessionIdRef = useRef<string | null>(null)
  const gameStartTimeRef = useRef<number>(0)
  const profileRef = useRef<any>(null)

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
  }, [roomId])

  useEffect(() => {
    loadRoom()
    setLoading(false)

    // Load user profile for tracking
    getUserProfile().then(prof => {
      setProfile(prof)
      profileRef.current = prof
    })

    const channel = supabase.channel(`student-room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, async (payload) => {
        setRoom(payload.new)
        
        // Start tracking when game launches
        if (payload.new.current_activity !== 'waiting' && 
            payload.new.current_activity !== 'poll' && 
            payload.new.current_activity !== 'wordcloud' &&
            payload.new.current_activity !== payload.old?.current_activity) {
          
          const prof = profileRef.current
          if (prof?.id) {
            console.log('Starting tracking session...')
            const res = await fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'start_session',
                data: {
                  student_id: prof.id,
                  game_type: payload.new.current_activity,
                  mode: 'room',
                  room_code: payload.new.code
                }
              })
            })
            const data = await res.json()
            console.log('Start session response:', data)
            if (data.session_id) {
              sessionIdRef.current = data.session_id
              gameStartTimeRef.current = Date.now()
              console.log('Session started:', data.session_id)
            }
          }
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [roomId, loadRoom])

  // Listen for messages from the game iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const currentSessionId = sessionIdRef.current
      
      if (!currentSessionId) {
        console.log('No session ID yet, ignoring message:', event.data)
        return
      }

      if (event.data.type === 'GAME_ANSWER') {
        console.log('Recording answer:', event.data.data)
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_answer',
            data: {
              session_id: currentSessionId,
              ...event.data.data
            }
          })
        })
        const result = await res.json()
        console.log('Record answer response:', result)
      }

      if (event.data.type === 'GAME_COMPLETE') {
        console.log('Game complete:', event.data.data)
        const timeSeconds = Math.round((Date.now() - gameStartTimeRef.current) / 1000)
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end_session',
            data: {
              session_id: currentSessionId,
              student_id: profileRef.current?.id,
              score: event.data.data.score,
              accuracy_percent: event.data.data.accuracy_percent,
              time_spent_seconds: timeSeconds,
              completed: true
            }
          })
        })
        const result = await res.json()
        console.log('End session response:', result)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, []) // Empty dependency array — runs once on mount

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
  const isGame = activity !== 'waiting' && activity !== 'poll' && activity !== 'wordcloud'

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

        {isGame && (
          <div className="h-[calc(100vh-60px)]">
            <iframe 
              src={`/games/${activity}/index.html`} 
              className="w-full h-full border-0 rounded-xl" 
              title="Game"
            />
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
