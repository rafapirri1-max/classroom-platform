'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, getUserProfile } from '@/lib/supabase'

function isTrackableGame(activity: string | null | undefined): boolean {
  return !!activity && activity !== 'waiting' && activity !== 'poll' && activity !== 'wordcloud'
}

async function callTrack(action: string, data: Record<string, unknown>) {
  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })
  const json = await res.json()
  return { ok: res.ok && !json.error, json }
}

function StudentContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const name = searchParams.get('name') || 'Student'

  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [submissionOk, setSubmissionOk] = useState(false)
  const [gameAttemptKey, setGameAttemptKey] = useState(0)
  const [enrolledInClass, setEnrolledInClass] = useState<boolean | null>(null)

  const profileRef = useRef<any>(null)
  const sessionIdRef = useRef<string | null>(null)
  const gameAttemptKeyRef = useRef(0)
  const sessionForAttemptRef = useRef<number | null>(null)
  const beganAttemptForActivityRef = useRef<string | null>(null)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
    return data
  }, [roomId])

  const startSessionForActivity = useCallback(async (activity: string, roomData: { code: string; id: string; class_id?: string | null }) => {
    const studentId = profileRef.current?.id
    if (!studentId || !isTrackableGame(activity)) return null

    const { ok, json } = await callTrack('start_session', {
      student_id: studentId,
      game_type: activity,
      mode: 'room',
      room_code: roomData.code,
      room_id: roomData.id,
      class_id: roomData.class_id ?? null,
    })

    if (ok && json.session_id) {
      setSessionId(json.session_id)
      sessionIdRef.current = json.session_id
      sessionForAttemptRef.current = gameAttemptKeyRef.current
      return json.session_id as string
    }
    return null
  }, [])

  const resetSubmissionState = useCallback(() => {
    setSubmissionStatus('')
    setSubmissionOk(false)
  }, [])

  const beginNewGameAttempt = useCallback(async (roomData: any) => {
    const activity = roomData?.current_activity
    if (!isTrackableGame(activity) || !profileRef.current?.id) return

    gameAttemptKeyRef.current += 1
    setGameAttemptKey(gameAttemptKeyRef.current)
    resetSubmissionState()
    setSessionId(null)
    sessionIdRef.current = null
    sessionForAttemptRef.current = null
    beganAttemptForActivityRef.current = activity

    await startSessionForActivity(activity, roomData)
  }, [resetSubmissionState, startSessionForActivity])

  const ensureSessionForCurrentAttempt = useCallback(async (roomData: any) => {
    const activity = roomData?.current_activity
    if (!isTrackableGame(activity) || !profileRef.current?.id) return null
    if (
      sessionForAttemptRef.current === gameAttemptKeyRef.current &&
      sessionIdRef.current
    ) {
      return sessionIdRef.current
    }
    return startSessionForActivity(activity, roomData)
  }, [startSessionForActivity])

  useEffect(() => {
    loadRoom().then(() => setLoading(false))
    getUserProfile().then(async prof => {
      setProfile(prof)
      if (!prof?.id) {
        setEnrolledInClass(null)
        return
      }
      const { count } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', prof.id)
      setEnrolledInClass((count ?? 0) > 0)
    })

    const channel = supabase.channel(`student-room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, async (payload) => {
        setRoom(payload.new)

        const activity = payload.new.current_activity
        const prevActivity = payload.old?.current_activity

        if (activity === 'waiting' && isTrackableGame(prevActivity)) {
          resetSubmissionState()
          beganAttemptForActivityRef.current = null
        }

        if (isTrackableGame(activity) && activity !== prevActivity) {
          await beginNewGameAttempt(payload.new)
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [roomId, loadRoom, beginNewGameAttempt, resetSubmissionState])

  // Start a new attempt when joining a room that already has an active game
  useEffect(() => {
    if (!room || !profile?.id) return
    const activity = room.current_activity
    if (!isTrackableGame(activity)) return
    if (beganAttemptForActivityRef.current === activity && sessionIdRef.current) return
    beginNewGameAttempt(room)
  }, [room, profile, beginNewGameAttempt])

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'GAME_SUBMIT') return

      setSubmissionStatus('Submitting...')
      setSubmissionOk(false)

      let activeSessionId = sessionIdRef.current
      const studentId = profileRef.current?.id

      if (!studentId) {
        setSubmissionStatus('Error: Sign in to submit answers to your teacher.')
        return
      }

      if (!activeSessionId && room) {
        activeSessionId = await ensureSessionForCurrentAttempt(room)
      }

      if (!activeSessionId) {
        setSubmissionStatus('Error: No active session. Ask your teacher to launch the game again.')
        return
      }

      const payload = event.data.data || {}
      const quizAnswers = payload.quiz_answers || []
      const scenarioAnswers = payload.scenario_answers || []

      for (const answer of quizAnswers) {
        const { ok, json } = await callTrack('record_answer', { session_id: activeSessionId, ...answer })
        if (!ok) {
          setSubmissionStatus(`Error saving answers: ${json.error || 'Unknown error'}`)
          return
        }
      }

      for (const answer of scenarioAnswers) {
        const { ok, json } = await callTrack('record_answer', { session_id: activeSessionId, ...answer })
        if (!ok) {
          setSubmissionStatus(`Error saving answers: ${json.error || 'Unknown error'}`)
          return
        }
      }

      const { ok, json } = await callTrack('end_session', {
        session_id: activeSessionId,
        student_id: studentId,
        score: payload.score,
        accuracy_percent: payload.accuracy_percent,
        time_spent_seconds: payload.time_spent_seconds,
        completed: true,
      })

      if (!ok) {
        setSubmissionStatus(`Error submitting results: ${json.error || 'Unknown error'}`)
        return
      }

      setSubmissionOk(true)
      setSubmissionStatus('Answers submitted to teacher!')
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [room, ensureSessionForCurrentAttempt])

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

      {profile && enrolledInClass === false && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 text-amber-100 px-4 py-2 text-center text-sm">
          You are signed in but not enrolled in a class. Your teacher may not see your results in class analytics until you join using their class code on the{' '}
          <a href="/" className="underline font-medium text-amber-200 hover:text-white">student home page</a>.
        </div>
      )}

      {submissionStatus && (
        <div className={`px-4 py-2 text-center border ${
          submissionOk
            ? 'bg-green-500/20 border-green-500/50 text-green-300'
            : 'bg-red-500/20 border-red-500/50 text-red-300'
        }`}>
          {submissionStatus}
        </div>
      )}

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
              key={`${activity}-${gameAttemptKey}`}
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

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <StudentContent />
    </Suspense>
  )
}
