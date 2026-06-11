'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  beginOrRestoreRun,
  handleJoinActiveActivity,
  handleRoomActivityUpdate,
  isTrackableActivity,
  markStoredRunCompleted,
  shouldStartRunFromRoomUpdate,
  type BeginRunResult,
  type RoomRunContext,
  type TrackCaller,
} from '@/lib/session-lifecycle'
import { DiscussionVotingPanel } from '@/lib/discussion/discussion-voting-panel'
import { fetchActiveDiscussionConfig } from '@/lib/discussion/fetch-active'
import type { DiscussionLaunchConfig } from '@/lib/discussion/types'
import { fetchActivePollConfig } from '@/lib/poll/fetch-active'
import type { PollLaunchConfig } from '@/lib/poll/types'
import { fetchActiveWordCloudConfig } from '@/lib/wordcloud/fetch-active'
import type { WordCloudLaunchConfig } from '@/lib/wordcloud/types'
import { supabase, getUserProfile } from '@/lib/supabase'

const callTrack: TrackCaller = async (action, data) => {
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

  const [room, setRoom] = useState<RoomRunContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [submissionOk, setSubmissionOk] = useState(false)
  const [gameAttemptKey, setGameAttemptKey] = useState(0)
  const [enrolledInClass, setEnrolledInClass] = useState<boolean | null>(null)
  const [pollConfig, setPollConfig] = useState<PollLaunchConfig | null>(null)
  const [pollVotedOptionId, setPollVotedOptionId] = useState<string | null>(null)
  const [pollVoting, setPollVoting] = useState(false)
  const [pollVoteError, setPollVoteError] = useState('')
  const [discussionConfig, setDiscussionConfig] = useState<DiscussionLaunchConfig | null>(null)
  const [discussionSubmitted, setDiscussionSubmitted] = useState(false)
  const [discussionResponseText, setDiscussionResponseText] = useState('')
  const [discussionSubmitting, setDiscussionSubmitting] = useState(false)
  const [discussionSubmitError, setDiscussionSubmitError] = useState('')
  const [wordCloudConfig, setWordCloudConfig] = useState<WordCloudLaunchConfig | null>(null)
  const [wordCloudSubmitted, setWordCloudSubmitted] = useState(false)
  const [wordCloudSubmittedText, setWordCloudSubmittedText] = useState('')
  const [wordCloudAnswerText, setWordCloudAnswerText] = useState('')
  const [wordCloudSubmitting, setWordCloudSubmitting] = useState(false)
  const [wordCloudSubmitError, setWordCloudSubmitError] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  const profileRef = useRef<any>(null)
  const sessionIdRef = useRef<string | null>(null)
  const gameAttemptKeyRef = useRef(0)
  const sessionForAttemptRef = useRef<number | null>(null)
  const beganAttemptForActivityRef = useRef<string | null>(null)
  const sessionOpenRef = useRef(false)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) {
      setRoom(data as RoomRunContext)
      const config = await fetchActivePollConfig(supabase, data)
      setPollConfig(config)
      const discConfig = await fetchActiveDiscussionConfig(supabase, data)
      setDiscussionConfig(discConfig)
      const wcConfig = await fetchActiveWordCloudConfig(supabase, data)
      setWordCloudConfig(wcConfig)
    } else {
      setPollConfig(null)
      setDiscussionConfig(null)
      setWordCloudConfig(null)
    }
    return data as RoomRunContext | null
  }, [roomId])

  const resetSubmissionState = useCallback(() => {
    setSubmissionStatus('')
    setSubmissionOk(false)
  }, [])

  const applyRunResult = useCallback(
    (result: BeginRunResult, activityId: string) => {
      if (!result.sessionId) return
      const previousSessionId = sessionIdRef.current
      if (result.sessionId !== previousSessionId || !result.restored) {
        gameAttemptKeyRef.current += 1
        setGameAttemptKey(gameAttemptKeyRef.current)
        resetSubmissionState()
      }
      setSessionId(result.sessionId)
      sessionIdRef.current = result.sessionId
      sessionForAttemptRef.current = gameAttemptKeyRef.current
      beganAttemptForActivityRef.current = activityId
      sessionOpenRef.current = true
    },
    [resetSubmissionState]
  )

  const clearRunRefs = useCallback(() => {
    resetSubmissionState()
    beganAttemptForActivityRef.current = null
    setSessionId(null)
    sessionIdRef.current = null
    sessionForAttemptRef.current = null
    sessionOpenRef.current = false
  }, [resetSubmissionState])

  const ensureSessionForCurrentAttempt = useCallback(async (roomData: RoomRunContext) => {
    const activityId = roomData?.current_activity
    const studentId = profileRef.current?.id
    if (!activityId || !isTrackableActivity(activityId) || !studentId) return null

    if (
      sessionOpenRef.current &&
      sessionForAttemptRef.current === gameAttemptKeyRef.current &&
      sessionIdRef.current
    ) {
      return sessionIdRef.current
    }

    const result = await beginOrRestoreRun({
      room: roomData,
      activityId,
      studentId,
      callTrack,
      forceNew: false,
    })
    if (result.sessionId) {
      applyRunResult(result, activityId)
    }
    return result.sessionId
  }, [applyRunResult])

  const activePollInstanceId =
    room?.current_activity === 'poll' ? room?.active_activity_instance_id : null

  const activeDiscussionInstanceId =
    room?.current_activity === 'discussion' ? room?.active_activity_instance_id : null

  const activeWordCloudInstanceId =
    room?.current_activity === 'wordcloud' ? room?.active_activity_instance_id : null

  useEffect(() => {
    if (!activeWordCloudInstanceId || !room) {
      return
    }

    let cancelled = false

    async function refreshWordCloudConfig() {
      const config = await fetchActiveWordCloudConfig(supabase, room!)
      if (!cancelled) {
        setWordCloudConfig(config)
      }
    }

    void refreshWordCloudConfig()
    const interval = setInterval(refreshWordCloudConfig, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeWordCloudInstanceId, room])

  useEffect(() => {
    if (!activeWordCloudInstanceId || !profile?.id) {
      setWordCloudSubmitted(false)
      setWordCloudSubmittedText('')
      setWordCloudAnswerText('')
      setWordCloudSubmitError('')
      return
    }

    let cancelled = false

    async function refreshMyWordCloudResponse() {
      try {
        const params = new URLSearchParams({
          activity_instance_id: activeWordCloudInstanceId!,
          student_id: profile!.id,
        })
        const res = await fetch(`/api/wordcloud/my-response?${params}`)
        const json = await res.json()
        if (!cancelled && res.ok && json.response) {
          setWordCloudSubmitted(true)
          setWordCloudSubmittedText(json.response.answer_text)
        } else if (!cancelled) {
          setWordCloudSubmitted(false)
          setWordCloudSubmittedText('')
        }
      } catch {
        if (!cancelled) {
          setWordCloudSubmitted(false)
          setWordCloudSubmittedText('')
        }
      }
    }

    void refreshMyWordCloudResponse()

    const shouldPoll = wordCloudConfig?.phase !== 'revealed'
    const interval = shouldPoll ? setInterval(refreshMyWordCloudResponse, 3000) : undefined

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [activeWordCloudInstanceId, profile?.id, wordCloudConfig?.phase])

  useEffect(() => {
    if (!activeDiscussionInstanceId || !room) {
      return
    }

    let cancelled = false

    async function refreshDiscussionConfig() {
      const config = await fetchActiveDiscussionConfig(supabase, room!)
      if (!cancelled) {
        setDiscussionConfig(config)
      }
    }

    void refreshDiscussionConfig()
    const interval = setInterval(refreshDiscussionConfig, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeDiscussionInstanceId, room])

  useEffect(() => {
    if (!activeDiscussionInstanceId || !profile?.id) {
      setDiscussionSubmitted(false)
      setDiscussionResponseText('')
      setDiscussionSubmitError('')
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const params = new URLSearchParams({
          activity_instance_id: activeDiscussionInstanceId,
          student_id: profile.id,
        })
        const res = await fetch(`/api/discussion/my-response?${params}`)
        const json = await res.json()
        if (!cancelled && res.ok && json.submitted) {
          setDiscussionSubmitted(true)
        } else if (!cancelled) {
          setDiscussionSubmitted(false)
        }
      } catch {
        if (!cancelled) setDiscussionSubmitted(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeDiscussionInstanceId, profile?.id])

  const submitDiscussionResponse = useCallback(async () => {
    if (discussionSubmitted || discussionSubmitting) {
      return
    }

    if (!profile?.id) {
      setDiscussionSubmitError('You must be signed in as a student to submit a response.')
      return
    }

    const trimmed = discussionResponseText.trim()
    if (!trimmed) {
      setDiscussionSubmitError('Please enter a response')
      return
    }

    setDiscussionSubmitting(true)
    setDiscussionSubmitError('')

    try {
      const { data: freshRoom, error: roomError } = await supabase
        .from('rooms')
        .select('id, current_activity, active_activity_instance_id, status')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError) {
        throw new Error(roomError.message)
      }
      if (!freshRoom || freshRoom.status !== 'active') {
        throw new Error('This room is no longer active.')
      }
      if (freshRoom.current_activity !== 'discussion' || !freshRoom.active_activity_instance_id) {
        throw new Error('Discussion is not active right now. Wait for your teacher to launch it.')
      }

      const res = await fetch('/api/discussion/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: freshRoom.id,
          activity_instance_id: freshRoom.active_activity_instance_id,
          student_id: profile.id,
          response_text: trimmed,
        }),
      })

      let json: { error?: string; code?: string } = {}
      try {
        json = (await res.json()) as { error?: string; code?: string }
      } catch {
        throw new Error(`Submit failed (${res.status})`)
      }

      if (!res.ok || json.error) {
        throw new Error(json.error || `Submit failed (${res.status})`)
      }

      setDiscussionSubmitted(true)
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              current_activity: freshRoom.current_activity,
              active_activity_instance_id: freshRoom.active_activity_instance_id,
            }
          : prev
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submit failed'
      setDiscussionSubmitError(message)
    } finally {
      setDiscussionSubmitting(false)
    }
  }, [
    roomId,
    profile?.id,
    discussionSubmitted,
    discussionSubmitting,
    discussionResponseText,
  ])

  const submitWordCloudAnswer = useCallback(async () => {
    if (wordCloudSubmitted || wordCloudSubmitting) {
      return
    }

    if (!profile?.id) {
      setWordCloudSubmitError('You must be signed in as a student to submit an answer.')
      return
    }

    const trimmed = wordCloudAnswerText.trim()
    if (!trimmed) {
      setWordCloudSubmitError('Please enter an answer')
      return
    }

    setWordCloudSubmitting(true)
    setWordCloudSubmitError('')

    try {
      const { data: freshRoom, error: roomError } = await supabase
        .from('rooms')
        .select('id, current_activity, active_activity_instance_id, status')
        .eq('id', roomId)
        .maybeSingle()

      if (roomError) {
        throw new Error(roomError.message)
      }
      if (!freshRoom || freshRoom.status !== 'active') {
        throw new Error('This room is no longer active.')
      }
      if (freshRoom.current_activity !== 'wordcloud' || !freshRoom.active_activity_instance_id) {
        throw new Error('Word cloud is not active right now. Wait for your teacher to launch it.')
      }

      const res = await fetch('/api/wordcloud/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: freshRoom.id,
          activity_instance_id: freshRoom.active_activity_instance_id,
          student_id: profile.id,
          answer_text: trimmed,
        }),
      })

      let json: { error?: string } = {}
      try {
        json = (await res.json()) as { error?: string }
      } catch {
        throw new Error(`Submit failed (${res.status})`)
      }

      if (!res.ok || json.error) {
        throw new Error(json.error || `Submit failed (${res.status})`)
      }

      setWordCloudSubmitted(true)
      setWordCloudSubmittedText(trimmed)
      setWordCloudAnswerText('')
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              current_activity: freshRoom.current_activity,
              active_activity_instance_id: freshRoom.active_activity_instance_id,
            }
          : prev
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submit failed'
      setWordCloudSubmitError(message)
    } finally {
      setWordCloudSubmitting(false)
    }
  }, [
    roomId,
    profile?.id,
    wordCloudSubmitted,
    wordCloudSubmitting,
    wordCloudAnswerText,
  ])

  useEffect(() => {
    if (!activePollInstanceId || !profile?.id) {
      setPollVotedOptionId(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const params = new URLSearchParams({
          activity_instance_id: activePollInstanceId,
          student_id: profile.id,
        })
        const res = await fetch(`/api/poll/my-vote?${params}`)
        const json = await res.json()
        if (!cancelled && res.ok && json.voted && json.selected_option_id) {
          setPollVotedOptionId(json.selected_option_id)
        } else if (!cancelled) {
          setPollVotedOptionId(null)
        }
      } catch {
        if (!cancelled) setPollVotedOptionId(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activePollInstanceId, profile?.id])

  const submitPollVote = useCallback(
    async (optionId: string) => {
      if (!room?.id || !activePollInstanceId || !profile?.id || pollVotedOptionId || pollVoting) {
        return
      }
      setPollVoting(true)
      setPollVoteError('')
      try {
        const res = await fetch('/api/poll/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: room.id,
            activity_instance_id: activePollInstanceId,
            student_id: profile.id,
            selected_option_id: optionId,
          }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Vote failed')
        }
        setPollVotedOptionId(optionId)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Vote failed'
        setPollVoteError(message)
      } finally {
        setPollVoting(false)
      }
    },
    [room?.id, activePollInstanceId, profile?.id, pollVotedOptionId, pollVoting]
  )

  useEffect(() => {
    loadRoom().then(() => setLoading(false))
    getUserProfile({ ensureIfMissing: true, role: 'student' })
      .then(async (prof) => {
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
      .finally(() => setProfileLoaded(true))

    const channel = supabase.channel(`student-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        async (payload) => {
          const roomData = payload.new as RoomRunContext
          setRoom(roomData)
          void fetchActivePollConfig(supabase, roomData).then(setPollConfig)
          void fetchActiveDiscussionConfig(supabase, roomData).then(setDiscussionConfig)
          if (roomData.current_activity !== 'poll') {
            setPollVotedOptionId(null)
            setPollVoteError('')
          }
          if (roomData.current_activity !== 'discussion') {
            setDiscussionSubmitted(false)
            setDiscussionResponseText('')
            setDiscussionSubmitError('')
          }

          const studentId = profileRef.current?.id
          if (!studentId) return

          const prevActivity = payload.old?.current_activity
          const nextActivity = roomData.current_activity

          const priorRunOpen = sessionOpenRef.current

          if (
            isTrackableActivity(nextActivity) &&
            shouldStartRunFromRoomUpdate(prevActivity, nextActivity, priorRunOpen) &&
            !priorRunOpen
          ) {
            clearRunRefs()
          }

          const outcome = await handleRoomActivityUpdate({
            room: roomData,
            prevActivity,
            nextActivity,
            studentId,
            callTrack,
            priorRunOpen,
          })

          if (outcome === 'cleared') {
            clearRunRefs()
            return
          }

          if (outcome && outcome.sessionId && roomData.current_activity) {
            applyRunResult(outcome, roomData.current_activity)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, loadRoom, applyRunResult, clearRunRefs])

  useEffect(() => {
    if (!room || !profile?.id) return
    const activityId = room.current_activity
    if (!isTrackableActivity(activityId) || !activityId) return
    if (
      beganAttemptForActivityRef.current === activityId &&
      sessionIdRef.current &&
      sessionOpenRef.current
    ) {
      return
    }

    void (async () => {
      const result = await handleJoinActiveActivity({
        room,
        studentId: profile.id,
        callTrack,
      })
      if (result?.sessionId) {
        applyRunResult(result, activityId)
      }
    })()
  }, [room, profile, applyRunResult])

  useEffect(() => {
    const resolveActiveSession = async (): Promise<string | null> => {
      let activeSessionId = sessionOpenRef.current ? sessionIdRef.current : null
      if (!activeSessionId && room) {
        activeSessionId = await ensureSessionForCurrentAttempt(room)
      }
      return activeSessionId
    }

    const recordAnswers = async (sessionId: string, answers: Record<string, unknown>[]) => {
      for (const answer of answers) {
        const { ok, json } = await callTrack('record_answer', {
          session_id: sessionId,
          ...answer,
        })
        if (!ok) {
          setSubmissionStatus(`Error saving answers: ${json.error || 'Unknown error'}`)
          return false
        }
      }
      return true
    }

    const handleMessage = async (event: MessageEvent) => {
      const messageType = event.data?.type
      if (messageType !== 'GAME_MINI_COMPLETE' && messageType !== 'GAME_SUBMIT') return

      const studentId = profileRef.current?.id
      if (!studentId) {
        setSubmissionStatus('Error: Sign in to submit answers to your teacher.')
        return
      }

      const activeSessionId = await resolveActiveSession()
      if (!activeSessionId) {
        setSubmissionStatus('Error: No active session. Ask your teacher to launch the game again.')
        return
      }

      const payload = event.data.data || {}

      if (messageType === 'GAME_MINI_COMPLETE') {
        const { ok, json } = await callTrack('update_progress', {
          session_id: activeSessionId,
          activity_id: payload.activity_id || room?.current_activity,
          required_mini_game_ids: payload.required_mini_game_ids,
          mini_game: payload.mini_game,
        })
        if (!ok) {
          setSubmissionStatus(`Error saving progress: ${json.error || 'Unknown error'}`)
          return
        }

        const answers = payload.answers || []
        if (answers.length > 0) {
          const recorded = await recordAnswers(activeSessionId, answers)
          if (!recorded) return
        }

        setSubmissionOk(false)
        setSubmissionStatus(
          `Progress saved: ${payload.mini_game?.miniGameName || 'mini-game'} ✓`
        )
        return
      }

      setSubmissionStatus('Submitting...')
      setSubmissionOk(false)

      const quizAnswers = payload.quiz_answers || []
      const scenarioAnswers = payload.scenario_answers || []
      if (quizAnswers.length > 0 || scenarioAnswers.length > 0) {
        const recorded = await recordAnswers(activeSessionId, [...quizAnswers, ...scenarioAnswers])
        if (!recorded) return
      }

      const { ok, json } = await callTrack('end_session', {
        session_id: activeSessionId,
        student_id: studentId,
        score: payload.score,
        accuracy_percent: payload.accuracy_percent,
        time_spent_seconds: payload.time_spent_seconds,
        completed: true,
        badges: payload.badges,
      })

      if (!ok) {
        setSubmissionStatus(`Error submitting results: ${json.error || 'Unknown error'}`)
        return
      }

      sessionOpenRef.current = false
      if (room?.id && room.current_activity) {
        markStoredRunCompleted(
          room.id,
          room.current_activity,
          room.active_activity_instance_id
        )
      }

      setSubmissionOk(true)
      setSubmissionStatus('Bias Detective complete — results sent to your teacher!')
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
  const showTrackedIframe = isTrackableActivity(activity)
  const isDiscussionVoting =
    activity === 'discussion' && discussionConfig?.phase === 'voting'

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex flex-col">
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="text-white font-semibold text-sm sm:text-base truncate pr-3">
          {isDiscussionVoting ? (
            <span className="flex items-center gap-2">
              <span aria-hidden>💬</span>
              <span>Discussion Voting</span>
            </span>
          ) : (
            <span>👤 {name}</span>
          )}
        </div>
        <div className="text-accent font-bold tracking-widest text-sm sm:text-base shrink-0">{room.code}</div>
      </div>

      {profile && enrolledInClass === false && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 text-amber-100 px-4 py-2 text-center text-sm">
          You are signed in but not enrolled in a class. Your teacher may not see your results in class
          analytics until you join using their class code on the{' '}
          <a href="/" className="underline font-medium text-amber-200 hover:text-white">
            student home page
          </a>
          .
        </div>
      )}

      {submissionStatus && (
        <div
          className={`px-4 py-2 text-center border ${
            submissionOk
              ? 'bg-green-500/20 border-green-500/50 text-green-300'
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}
        >
          {submissionStatus}
        </div>
      )}

      <div className={isDiscussionVoting ? 'flex-1 flex items-center justify-center px-3 sm:px-5 py-4' : 'p-4'}>
        {activity === 'waiting' && (
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-2">Waiting for teacher...</h2>
              <p className="text-indigo-200">Your teacher will launch an activity soon</p>
            </div>
          </div>
        )}

        {showTrackedIframe && (
          <div className="h-[calc(100vh-60px)]">
            <iframe
              key={`${activity}-${gameAttemptKey}`}
              src={
                activity === 'bias-detective' && room?.active_activity_instance_id
                  ? `/games/${activity}/index.html?activity_instance_id=${encodeURIComponent(room.active_activity_instance_id)}`
                  : `/games/${activity}/index.html`
              }
              className="w-full h-full border-0 rounded-xl"
              title="Game"
            />
          </div>
        )}

        {activity === 'discussion' && (
          <div
            className={`mx-auto w-full ${
              discussionConfig?.phase === 'voting' ? 'max-w-[1200px]' : 'max-w-lg mt-6 sm:mt-8'
            }`}
          >
            {discussionConfig ? (
              <>
                {discussionConfig.phase !== 'voting' ? (
                  <>
                    <h2 className="text-xl font-bold text-white mb-6 text-center">💬 Discussion</h2>
                    <p className="text-white text-center font-medium mb-6 text-lg">
                      {discussionConfig.question}
                    </p>
                  </>
                ) : null}
                {!profileLoaded ? (
                  <p className="text-center text-indigo-200 text-sm">Checking sign-in...</p>
                ) : !profile?.id ? (
                  <div className="text-center space-y-3">
                    <p className="text-amber-200 text-sm">
                      You must be signed in as a student to participate.
                    </p>
                    <a
                      href="/login"
                      className="inline-block px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90"
                    >
                      Sign in
                    </a>
                  </div>
                ) : discussionConfig.phase === 'voting' && room?.active_activity_instance_id ? (
                  <DiscussionVotingPanel
                    roomId={roomId}
                    activityInstanceId={room.active_activity_instance_id}
                    studentId={profile.id}
                    question={discussionConfig.question}
                    anonymous={discussionConfig.anonymous}
                  />
                ) : discussionConfig.phase === 'results' ? (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200">
                      <span className="font-semibold">Voting has ended</span>
                    </div>
                    <p className="text-indigo-300 text-sm mt-4">
                      See the presentation screen for top responses.
                    </p>
                  </div>
                ) : discussionSubmitted ? (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-200">
                      <span>✓</span>
                      <span className="font-semibold">Response submitted</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={discussionResponseText}
                      onChange={(e) => setDiscussionResponseText(e.target.value)}
                      placeholder="Write your response..."
                      maxLength={2000}
                      rows={6}
                      disabled={discussionSubmitting}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 mb-4 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => void submitDiscussionResponse()}
                      disabled={discussionSubmitting || !discussionResponseText.trim()}
                      className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                      {discussionSubmitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                    {discussionSubmitError && (
                      <p className="text-center text-red-300 text-sm mt-4">{discussionSubmitError}</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-indigo-200">Loading discussion...</p>
            )}
          </div>
        )}

        {activity === 'poll' && (
          <div className="max-w-md mx-auto mt-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">📊 Quick Poll</h2>
            {pollConfig ? (
              <>
                <p className="text-white text-center font-medium mb-6">{pollConfig.question}</p>
                {!profile?.id ? (
                  <p className="text-center text-amber-200 text-sm">
                    Sign in to vote in this poll.
                  </p>
                ) : pollVotedOptionId ? (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-200 mb-4">
                      <span>✓</span>
                      <span className="font-semibold">You voted</span>
                    </div>
                    <p className="text-indigo-200 text-sm">
                      Your answer:{' '}
                      <span className="text-white font-medium">
                        {pollConfig.options.find((o) => o.id === pollVotedOptionId)?.label ??
                          pollVotedOptionId}
                      </span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pollConfig.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={pollVoting}
                          onClick={() => void submitPollVote(opt.id)}
                          className="w-full p-4 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors border border-white/20 disabled:opacity-60"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {pollVoteError && (
                      <p className="text-center text-red-300 text-sm mt-4">{pollVoteError}</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-indigo-200">Loading poll...</p>
            )}
          </div>
        )}

        {activity === 'wordcloud' && (
          <div className="max-w-md mx-auto mt-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">☁️ Word Cloud</h2>
            {wordCloudConfig ? (
              <>
                <p className="text-white text-center font-medium mb-6 text-lg">
                  {wordCloudConfig.question}
                </p>
                {!profileLoaded ? (
                  <p className="text-center text-indigo-200 text-sm">Checking sign-in...</p>
                ) : !profile?.id ? (
                  <div className="text-center space-y-3">
                    <p className="text-amber-200 text-sm">
                      You must be signed in as a student to participate.
                    </p>
                    <a
                      href="/login"
                      className="inline-block px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90"
                    >
                      Sign in
                    </a>
                  </div>
                ) : wordCloudSubmitted ? (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-200 mb-4">
                      <span>✓</span>
                      <span className="font-semibold">Answer submitted</span>
                    </div>
                    <p className="text-indigo-200 text-sm">
                      Your answer:{' '}
                      <span className="text-white font-medium">{wordCloudSubmittedText}</span>
                    </p>
                    {wordCloudConfig.phase === 'revealed' && (
                      <p className="text-indigo-300 text-sm mt-4">
                        The word cloud is now on the presentation screen.
                      </p>
                    )}
                  </div>
                ) : wordCloudConfig.phase === 'revealed' ? (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200">
                      <span className="font-semibold">Collection has ended</span>
                    </div>
                    <p className="text-indigo-300 text-sm mt-4">
                      Your teacher has revealed the word cloud on the presentation screen.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={wordCloudAnswerText}
                        onChange={(e) => setWordCloudAnswerText(e.target.value)}
                        placeholder="Enter a short answer..."
                        maxLength={wordCloudConfig.maxAnswerLength}
                        disabled={wordCloudSubmitting}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-accent disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => void submitWordCloudAnswer()}
                        disabled={wordCloudSubmitting || !wordCloudAnswerText.trim()}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                      >
                        {wordCloudSubmitting ? '...' : 'Submit'}
                      </button>
                    </div>
                    <p className="text-center text-indigo-300/70 text-xs mt-3">
                      Up to {wordCloudConfig.maxAnswerLength} characters
                    </p>
                    {wordCloudSubmitError && (
                      <p className="text-center text-red-300 text-sm mt-4">{wordCloudSubmitError}</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-indigo-200">Loading word cloud...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <StudentContent />
    </Suspense>
  )
}
