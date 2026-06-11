'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BiasDetectiveTeacherPanel } from '@/lib/bias-detective/teacher-panel'
import { BIAS_DETECTIVE_ACTIVITY_ID } from '@/lib/bias-detective/types'
import { closeRoomWithInstances, launchRoomActivity } from '@/lib/activity-instances'
import { activityToLaunchCard } from '@/lib/activity-engine/adapters/game-json'
import type { ActivityLaunchCard } from '@/lib/activity-engine/types'
import { fetchActiveDiscussionConfig } from '@/lib/discussion/fetch-active'
import type {
  DiscussionLaunchConfig,
  DiscussionResponsesPayload,
  DiscussionVoteResultsPayload,
} from '@/lib/discussion/types'
import { DISCUSSION_ACTIVITY_ID } from '@/lib/discussion/types'
import { fetchActivePollConfig } from '@/lib/poll/fetch-active'
import type { PollResultsPayload } from '@/lib/poll/results'
import type { PollLaunchConfig } from '@/lib/poll/types'
import { POLL_ACTIVITY_ID } from '@/lib/poll/types'
import { fetchActiveWordCloudConfig } from '@/lib/wordcloud/fetch-active'
import type { WordCloudLaunchConfig, WordCloudResponsesPayload } from '@/lib/wordcloud/types'
import { WORDCLOUD_ACTIVITY_ID } from '@/lib/wordcloud/types'
import { supabase, getUserProfile } from '@/lib/supabase'
import QRCode from 'qrcode'

export default function TeacherRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [games, setGames] = useState<ActivityLaunchCard[]>([])
  const [qrUrl, setQrUrl] = useState('')
  const [className, setClassName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [showPollModal, setShowPollModal] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['Option A', 'Option B', 'Option C', 'Option D'])
  const [pollLaunching, setPollLaunching] = useState(false)
  const [activePollConfig, setActivePollConfig] = useState<PollLaunchConfig | null>(null)
  const [pollResults, setPollResults] = useState<PollResultsPayload | null>(null)
  const [showDiscussionModal, setShowDiscussionModal] = useState(false)
  const [discussionQuestion, setDiscussionQuestion] = useState('')
  const [discussionAnonymous, setDiscussionAnonymous] = useState(false)
  const [discussionLaunching, setDiscussionLaunching] = useState(false)
  const [activeDiscussionConfig, setActiveDiscussionConfig] =
    useState<DiscussionLaunchConfig | null>(null)
  const [discussionData, setDiscussionData] = useState<DiscussionResponsesPayload | null>(null)
  const [discussionVoteResults, setDiscussionVoteResults] =
    useState<DiscussionVoteResultsPayload | null>(null)
  const [selectingResponseId, setSelectingResponseId] = useState<string | null>(null)
  const [clearingSpotlight, setClearingSpotlight] = useState(false)
  const [discussionPhaseUpdating, setDiscussionPhaseUpdating] = useState(false)
  const [showWordCloudModal, setShowWordCloudModal] = useState(false)
  const [wordCloudQuestion, setWordCloudQuestion] = useState('')
  const [wordCloudLaunching, setWordCloudLaunching] = useState(false)
  const [activeWordCloudConfig, setActiveWordCloudConfig] = useState<WordCloudLaunchConfig | null>(
    null
  )
  const [wordCloudData, setWordCloudData] = useState<WordCloudResponsesPayload | null>(null)
  const [wordCloudPhaseUpdating, setWordCloudPhaseUpdating] = useState(false)
  const [deletingWordCloudResponseId, setDeletingWordCloudResponseId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && room?.code) {
      const url = `${window.location.origin}/?room=${room.code}`
      QRCode.toDataURL(url, { width: 200 }).then(setQrUrl)
    }
  }, [room?.code])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) {
      setRoom(data)
      const pollConfig = await fetchActivePollConfig(supabase, data)
      setActivePollConfig(pollConfig)
      const discussionConfig = await fetchActiveDiscussionConfig(supabase, data)
      setActiveDiscussionConfig(discussionConfig)
      const wordCloudConfig = await fetchActiveWordCloudConfig(supabase, data)
      setActiveWordCloudConfig(wordCloudConfig)
      if (data.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('class_name')
          .eq('id', data.class_id)
          .maybeSingle()
        setClassName(cls?.class_name ?? null)
      } else {
        setClassName(null)
      }
    }
  }, [roomId])

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase.from('participants').select('*').eq('room_id', roomId).order('joined_at', { ascending: true })
    if (data) setParticipants(data)
  }, [roomId])

  const loadActivities = useCallback(async () => {
    const res = await fetch('/api/activities')
    const data = await res.json()
    if (data.activities) {
      setGames(data.activities.map(activityToLaunchCard))
    }
  }, [])

  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile?.role === 'teacher') setTeacherId(profile.id)
    })
    loadRoom()
    loadParticipants()
    loadActivities()
    setLoading(false)

    const roomChannel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, loadRoom)
      .subscribe()

    const participantChannel = supabase.channel(`participants-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` }, loadParticipants)
      .subscribe()

    return () => {
      roomChannel.unsubscribe()
      participantChannel.unsubscribe()
    }
  }, [roomId, loadRoom, loadParticipants, loadActivities])

  const activePollInstanceId =
    room?.current_activity === POLL_ACTIVITY_ID ? room?.active_activity_instance_id : null

  useEffect(() => {
    if (!activePollInstanceId) {
      setPollResults(null)
      return
    }

    let cancelled = false

    async function loadResults() {
      try {
        const res = await fetch(
          `/api/poll/results?activity_instance_id=${encodeURIComponent(activePollInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setPollResults(json as PollResultsPayload)
        }
      } catch {
        // ignore poll refresh errors
      }
    }

    void loadResults()
    const interval = setInterval(loadResults, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activePollInstanceId])

  const activeDiscussionInstanceId =
    room?.current_activity === DISCUSSION_ACTIVITY_ID ? room?.active_activity_instance_id : null

  useEffect(() => {
    if (!activeDiscussionInstanceId) {
      setDiscussionData(null)
      return
    }

    let cancelled = false

    async function loadDiscussionResponses() {
      try {
        const res = await fetch(
          `/api/discussion/responses?activity_instance_id=${encodeURIComponent(activeDiscussionInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setDiscussionData(json as DiscussionResponsesPayload)
        }
      } catch {
        // ignore discussion refresh errors
      }
    }

    void loadDiscussionResponses()
    const interval = setInterval(loadDiscussionResponses, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeDiscussionInstanceId])

  const activeWordCloudInstanceId =
    room?.current_activity === WORDCLOUD_ACTIVITY_ID ? room?.active_activity_instance_id : null

  useEffect(() => {
    if (!activeWordCloudInstanceId || !teacherId) {
      setWordCloudData(null)
      return
    }

    let cancelled = false

    async function loadWordCloudResponses() {
      try {
        const params = new URLSearchParams({
          room_id: roomId,
          teacher_id: teacherId!,
          activity_instance_id: activeWordCloudInstanceId!,
        })
        const res = await fetch(`/api/wordcloud/responses?${params}`)
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setWordCloudData(json as WordCloudResponsesPayload)
          if (json.phase) {
            setActiveWordCloudConfig((prev) =>
              prev ? { ...prev, phase: json.phase } : prev
            )
          }
        }
      } catch {
        // ignore word cloud refresh errors
      }
    }

    void loadWordCloudResponses()
    const interval = setInterval(loadWordCloudResponses, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeWordCloudInstanceId, teacherId, roomId])

  const wordCloudPhase = wordCloudData?.phase ?? activeWordCloudConfig?.phase ?? 'collecting'

  const discussionPhase =
    discussionData?.phase ?? activeDiscussionConfig?.phase ?? 'collecting'

  useEffect(() => {
    if (!activeDiscussionInstanceId || (discussionPhase !== 'voting' && discussionPhase !== 'results')) {
      setDiscussionVoteResults(null)
      return
    }

    let cancelled = false

    async function loadVoteResults() {
      try {
        const res = await fetch(
          `/api/discussion/vote-results?activity_instance_id=${encodeURIComponent(activeDiscussionInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setDiscussionVoteResults(json as DiscussionVoteResultsPayload)
        }
      } catch {
        // ignore vote results refresh errors
      }
    }

    void loadVoteResults()
    const interval = setInterval(loadVoteResults, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeDiscussionInstanceId, discussionPhase])

  async function launchActivity(gameId: string) {
    if (!room) return
    try {
      await launchRoomActivity(supabase, room, gameId)
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch activity'
      alert(message)
    }
  }

  async function launchPoll() {
    if (!teacherId) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setPollLaunching(true)
    try {
      const res = await fetch('/api/poll/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          question: pollQuestion,
          options: pollOptions,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to launch poll')
      }
      setShowPollModal(false)
      setPollQuestion('')
      setPollOptions(['Option A', 'Option B', 'Option C', 'Option D'])
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch poll'
      alert(message)
    } finally {
      setPollLaunching(false)
    }
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)))
  }

  function addPollOption() {
    setPollOptions((prev) => (prev.length >= 6 ? prev : [...prev, `Option ${String.fromCharCode(65 + prev.length)}`]))
  }

  function removePollOption(index: number) {
    setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function launchWordCloud() {
    if (!teacherId) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setWordCloudLaunching(true)
    try {
      const res = await fetch('/api/wordcloud/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          question: wordCloudQuestion,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to launch word cloud')
      }
      setShowWordCloudModal(false)
      setWordCloudQuestion('')
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch word cloud'
      alert(message)
    } finally {
      setWordCloudLaunching(false)
    }
  }

  async function deleteWordCloudResponse(responseId: string) {
    if (!teacherId || !room?.active_activity_instance_id) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    if (wordCloudPhase !== 'collecting') {
      return
    }
    if (!confirm('Remove this response? The student will be able to submit again.')) {
      return
    }

    setDeletingWordCloudResponseId(responseId)
    try {
      const res = await fetch('/api/wordcloud/delete-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: room.active_activity_instance_id,
          response_id: responseId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to remove response')
      }
      setWordCloudData((prev) =>
        prev
          ? {
              ...prev,
              response_count: Math.max(0, prev.response_count - 1),
              responses: prev.responses.filter((response) => response.id !== responseId),
            }
          : prev
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove response'
      alert(message)
    } finally {
      setDeletingWordCloudResponseId(null)
    }
  }

  async function revealWordCloud() {
    if (!teacherId || !room?.active_activity_instance_id) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setWordCloudPhaseUpdating(true)
    try {
      const res = await fetch('/api/wordcloud/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: room.active_activity_instance_id,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to reveal word cloud')
      }
      if (json.launch_config) {
        setActiveWordCloudConfig(json.launch_config as WordCloudLaunchConfig)
      }
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reveal word cloud'
      alert(message)
    } finally {
      setWordCloudPhaseUpdating(false)
    }
  }

  async function launchDiscussion() {
    if (!teacherId) {
      alert('Teacher profile not loaded. Please refresh and try again.')
      return
    }
    setDiscussionLaunching(true)
    try {
      const res = await fetch('/api/discussion/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          question: discussionQuestion,
          anonymous: discussionAnonymous,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to launch discussion')
      }
      setShowDiscussionModal(false)
      setDiscussionQuestion('')
      setDiscussionAnonymous(false)
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch discussion'
      alert(message)
    } finally {
      setDiscussionLaunching(false)
    }
  }

  async function refreshDiscussionData() {
    if (!activeDiscussionInstanceId) return
    const res = await fetch(
      `/api/discussion/responses?activity_instance_id=${encodeURIComponent(activeDiscussionInstanceId)}`
    )
    const json = await res.json()
    if (res.ok && !json.error) {
      setDiscussionData(json as DiscussionResponsesPayload)
    }
  }

  async function clearSpotlight() {
    if (!teacherId || !activeDiscussionInstanceId) return
    setClearingSpotlight(true)
    try {
      const res = await fetch('/api/discussion/select-response', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: activeDiscussionInstanceId,
          selectedResponseId: null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to clear spotlight')
      }
      await loadRoom()
      await refreshDiscussionData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear spotlight'
      alert(message)
    } finally {
      setClearingSpotlight(false)
    }
  }

  async function startDiscussionVoting() {
    if (!teacherId || !activeDiscussionInstanceId) return
    setDiscussionPhaseUpdating(true)
    try {
      const res = await fetch('/api/discussion/start-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: activeDiscussionInstanceId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to start voting')
      }
      await loadRoom()
      await refreshDiscussionData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start voting'
      alert(message)
    } finally {
      setDiscussionPhaseUpdating(false)
    }
  }

  async function endDiscussionVoting() {
    if (!teacherId || !activeDiscussionInstanceId) return
    setDiscussionPhaseUpdating(true)
    try {
      const res = await fetch('/api/discussion/end-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: activeDiscussionInstanceId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to end voting')
      }
      await loadRoom()
      await refreshDiscussionData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to end voting'
      alert(message)
    } finally {
      setDiscussionPhaseUpdating(false)
    }
  }

  async function showResponseOnScreen(responseId: string) {
    if (!teacherId || !activeDiscussionInstanceId) return
    setSelectingResponseId(responseId)
    try {
      const res = await fetch('/api/discussion/select-response', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          teacher_id: teacherId,
          activity_instance_id: activeDiscussionInstanceId,
          response_id: responseId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to show response')
      }
      await refreshDiscussionData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to show response'
      alert(message)
    } finally {
      setSelectingResponseId(null)
    }
  }

  async function closeRoom() {
    try {
      await closeRoomWithInstances(supabase, roomId, room?.active_activity_instance_id)
      await loadRoom()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to close room'
      alert(message)
    }
  }

  // KICK OUT STUDENT
  async function kickStudent(participantId: string) {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
    
    if (error) {
      alert('Error removing student: ' + error.message)
    }
  }

  // KICK ALL STUDENTS
  async function kickAllStudents() {
    if (!confirm('Remove ALL students from this room?')) return
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('room_id', roomId)
    
    if (error) {
      alert('Error removing students: ' + error.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  if (!room) return <div className="min-h-screen flex items-center justify-center text-white">Room not found</div>

  const discussionSpotlightId =
    discussionData?.selectedResponseId ?? activeDiscussionConfig?.selectedResponseId ?? null

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/teacher')}
          className="text-indigo-300 hover:text-white text-sm mb-4 flex items-center gap-1 transition"
        >
          ← Dashboard
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl font-bold text-accent">{room.code}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                room.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
              }`}>
                {room.status.toUpperCase()}
              </span>
            </div>
            <p className="text-indigo-200">
              {participants.length} students connected
              {className && (
                <span className="text-indigo-300/80"> · Class: {className}</span>
              )}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <a
              href={`/present/${roomId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-violet-500/20 text-violet-200 rounded-xl hover:bg-violet-500/30 text-sm inline-flex items-center"
            >
              🖥️ Open Presentation View
            </a>
            <button onClick={kickAllStudents} className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-xl hover:bg-orange-500/30 text-sm">
              🚫 Remove All
            </button>
            <button onClick={closeRoom} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 text-sm">
              🚪 Close Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">🎮 Launch Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => launchActivity('waiting')}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  room.current_activity === 'waiting'
                    ? 'bg-primary/30 border-primary text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <div className="text-3xl mb-2">⏳</div>
                <div className="font-bold">Waiting Screen</div>
                {room.current_activity === 'waiting' && (
                  <div className="text-xs mt-2 text-primary-300">✓ Currently Active</div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  room.current_activity === POLL_ACTIVITY_ID
                    ? 'bg-primary/30 border-primary text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <div className="text-3xl mb-2">📊</div>
                <div className="font-bold">Quick Poll</div>
                <div className="text-xs text-indigo-200 mt-1">Ask the class a multiple-choice question</div>
                {room.current_activity === POLL_ACTIVITY_ID && (
                  <div className="text-xs mt-2 text-primary-300">✓ Currently Active</div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDiscussionModal(true)}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  room.current_activity === DISCUSSION_ACTIVITY_ID
                    ? 'bg-primary/30 border-primary text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <div className="text-3xl mb-2">💬</div>
                <div className="font-bold">Discussion</div>
                <div className="text-xs text-indigo-200 mt-1">Collect written responses from the class</div>
                {room.current_activity === DISCUSSION_ACTIVITY_ID && (
                  <div className="text-xs mt-2 text-primary-300">✓ Currently Active</div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowWordCloudModal(true)}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  room.current_activity === WORDCLOUD_ACTIVITY_ID
                    ? 'bg-primary/30 border-primary text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <div className="text-3xl mb-2">☁️</div>
                <div className="font-bold">Word Cloud</div>
                <div className="text-xs text-indigo-200 mt-1">Collect short answers for a word cloud</div>
                {room.current_activity === WORDCLOUD_ACTIVITY_ID && (
                  <div className="text-xs mt-2 text-primary-300">✓ Currently Active</div>
                )}
              </button>

              <BiasDetectiveTeacherPanel
                roomId={roomId}
                teacherId={teacherId}
                isActive={room.current_activity === BIAS_DETECTIVE_ACTIVITY_ID}
                onLaunched={loadRoom}
              />

              {games
                .filter((game) => game.id !== BIAS_DETECTIVE_ACTIVITY_ID)
                .map((game) => (
                  <button
                    key={game.id}
                    onClick={() => launchActivity(game.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all ${
                      room.current_activity === game.id
                        ? 'bg-primary/30 border-primary text-white'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="text-3xl mb-2">{game.icon}</div>
                    <div className="font-bold">{game.name}</div>
                    <div className="text-xs text-indigo-200 mt-1">{game.description}</div>
                    {room.current_activity === game.id && (
                      <div className="text-xs mt-2 text-primary-300">✓ Currently Active</div>
                    )}
                  </button>
                ))}
            </div>

            {room.current_activity === DISCUSSION_ACTIVITY_ID && activeDiscussionConfig && (
              <div className="mb-8 bg-white/10 border border-primary/40 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">💬 Live discussion</h3>
                    <p className="text-white font-medium">{activeDiscussionConfig.question}</p>
                    {activeDiscussionConfig.anonymous && (
                      <p className="text-xs text-indigo-300/80 mt-1">Anonymous responses</p>
                    )}
                    <p className="text-xs text-indigo-300/80 mt-1 capitalize">
                      Phase: {discussionPhase}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {discussionPhase === 'collecting' &&
                      (discussionData?.responses.length ?? 0) >= 2 && (
                        <button
                          type="button"
                          onClick={() => void startDiscussionVoting()}
                          disabled={discussionPhaseUpdating}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-50"
                        >
                          {discussionPhaseUpdating ? 'Starting...' : 'Start Voting'}
                        </button>
                      )}
                    {discussionPhase === 'voting' && (
                      <button
                        type="button"
                        onClick={() => void endDiscussionVoting()}
                        disabled={discussionPhaseUpdating}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 disabled:opacity-50"
                      >
                        {discussionPhaseUpdating ? 'Ending...' : 'End Voting'}
                      </button>
                    )}
                    {discussionSpotlightId && (
                      <button
                        type="button"
                        onClick={() => void clearSpotlight()}
                        disabled={clearingSpotlight}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-indigo-100 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
                      >
                        {clearingSpotlight ? 'Clearing...' : 'Clear spotlight'}
                      </button>
                    )}
                    <div className="text-right text-sm">
                      <div className="text-2xl font-bold text-primary-300">
                        {discussionData?.responses.length ?? 0}
                      </div>
                      <div className="text-indigo-300 text-xs">responses</div>
                      {(discussionPhase === 'voting' || discussionPhase === 'results') && (
                        <>
                          <div className="text-2xl font-bold text-violet-300 mt-2">
                            {discussionVoteResults?.total_votes_cast ?? 0}
                          </div>
                          <div className="text-indigo-300 text-xs">votes cast</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {(discussionData?.responses.length ?? 0) === 0 ? (
                  <p className="text-indigo-300 text-sm">Waiting for student responses...</p>
                ) : (
                  <div className="space-y-3">
                    {(discussionData?.responses ?? []).map((response) => {
                      const isSelected =
                        discussionData?.selectedResponseId === response.id ||
                        activeDiscussionConfig.selectedResponseId === response.id
                      return (
                        <div
                          key={response.id}
                          className={`p-4 rounded-xl border ${
                            isSelected
                              ? 'bg-violet-500/20 border-violet-400/50'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-indigo-300 mb-1">{response.display_label}</p>
                              <p className="text-white">{response.response_text}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void showResponseOnScreen(response.id)}
                              disabled={selectingResponseId === response.id || isSelected}
                              className="shrink-0 px-3 py-2 rounded-lg bg-primary/80 text-white text-sm font-semibold hover:bg-primary disabled:opacity-50"
                            >
                              {isSelected
                                ? 'On screen'
                                : selectingResponseId === response.id
                                  ? 'Showing...'
                                  : 'Show on screen'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-indigo-400 mt-4">Updates every few seconds</p>
              </div>
            )}

            {room.current_activity === WORDCLOUD_ACTIVITY_ID && activeWordCloudConfig && (
              <div className="mb-8 bg-white/10 border border-primary/40 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">☁️ Live word cloud</h3>
                    <p className="text-white font-medium">{activeWordCloudConfig.question}</p>
                    <p className="text-xs text-indigo-300/80 mt-1 capitalize">
                      Phase: {wordCloudPhase}
                    </p>
                    {wordCloudPhase === 'revealed' && (
                      <p className="text-sm text-green-300/90 mt-2 font-medium">
                        Word cloud revealed on Presentation View
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {wordCloudPhase === 'collecting' && (
                      <button
                        type="button"
                        onClick={() => void revealWordCloud()}
                        disabled={wordCloudPhaseUpdating}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-50"
                      >
                        {wordCloudPhaseUpdating ? 'Revealing...' : 'Reveal Word Cloud'}
                      </button>
                    )}
                    <div className="text-right text-sm">
                      <div className="text-2xl font-bold text-primary-300">
                        {wordCloudData?.response_count ?? 0}
                      </div>
                      <div className="text-indigo-300 text-xs">responses</div>
                    </div>
                  </div>
                </div>
                {(wordCloudData?.responses.length ?? 0) === 0 ? (
                  <p className="text-indigo-300 text-sm">Waiting for student responses...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(wordCloudData?.responses ?? []).map((response) => (
                      <div
                        key={response.id}
                        className="inline-flex items-start gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 max-w-full"
                        title={response.display_label}
                      >
                        <div className="min-w-0">
                          <span className="text-white font-medium block">{response.answer_text}</span>
                          <span className="text-xs text-indigo-300/80 mt-0.5 block">
                            {response.display_label}
                          </span>
                        </div>
                        {wordCloudPhase === 'collecting' && (
                          <button
                            type="button"
                            onClick={() => void deleteWordCloudResponse(response.id)}
                            disabled={deletingWordCloudResponseId === response.id}
                            className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold text-red-200 border border-red-400/40 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {deletingWordCloudResponseId === response.id ? '...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-indigo-400 mt-4">
                  Teacher preview only — review before revealing. Updates every few seconds.
                </p>
              </div>
            )}

            {room.current_activity === POLL_ACTIVITY_ID && activePollConfig && (
              <div className="mb-8 bg-white/10 border border-primary/40 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">📊 Live poll results</h3>
                    <p className="text-white font-medium">{activePollConfig.question}</p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <div className="text-2xl font-bold text-primary-300">
                      {pollResults?.total_votes ?? 0}
                    </div>
                    <div className="text-indigo-300 text-xs">votes</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {(pollResults?.options ?? activePollConfig.options.map((opt) => ({
                    id: opt.id,
                    label: opt.label,
                    count: 0,
                    percent: 0,
                  }))).map((opt) => (
                    <div key={opt.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-indigo-100">{opt.label}</span>
                        <span className="text-indigo-300">
                          {opt.count} ({opt.percent}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all duration-300"
                          style={{ width: `${opt.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-indigo-400 mt-4">Updates every few seconds</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">👥 Connected Students</h2>
            </div>
            
            {participants.length === 0 ? (
              <div className="bg-white/10 rounded-2xl p-8 text-center text-indigo-200">
                No students yet. Share the QR code or room code.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {participants.map((p) => (
                  <div key={p.id} className="bg-white/10 rounded-xl p-3 text-center border border-white/10 relative group">
                    <div className="text-2xl mb-1">👤</div>
                    <div className="text-white font-semibold text-sm truncate">{p.name}</div>
                    <button
                      onClick={() => kickStudent(p.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove student"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 text-center sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📱 Scan to Join</h3>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="w-full max-w-[200px] mx-auto mb-4" />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  Generating...
                </div>
              )}
              <div className="text-3xl font-bold text-primary tracking-widest">{room.code}</div>
              <p className="text-gray-500 text-sm mt-2">or visit:<br/>{typeof window !== 'undefined' ? window.location.origin : ''}/?room={room.code}</p>
            </div>
          </div>
        </div>
      </div>

      {showWordCloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Launch Word Cloud</h3>
            <label className="block text-sm text-indigo-200 mb-2">Question</label>
            <textarea
              value={wordCloudQuestion}
              onChange={(e) => setWordCloudQuestion(e.target.value)}
              placeholder="What word comes to mind when you think of...?"
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 mb-5 focus:outline-none focus:border-primary resize-none"
            />
            <p className="text-xs text-indigo-300/70 mb-6">
              Students will submit one short answer (up to 40 characters).
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowWordCloudModal(false)}
                disabled={wordCloudLaunching}
                className="px-4 py-2 rounded-xl text-indigo-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void launchWordCloud()}
                disabled={wordCloudLaunching || !wordCloudQuestion.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {wordCloudLaunching ? 'Launching...' : 'Launch Word Cloud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscussionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Launch Discussion</h3>
            <label className="block text-sm text-indigo-200 mb-2">Discussion question</label>
            <textarea
              value={discussionQuestion}
              onChange={(e) => setDiscussionQuestion(e.target.value)}
              placeholder="What do you think about...?"
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 mb-5 focus:outline-none focus:border-primary resize-none"
            />
            <fieldset className="mb-6">
              <legend className="block text-sm text-indigo-200 mb-3">Response visibility</legend>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="discussion-visibility"
                    checked={!discussionAnonymous}
                    onChange={() => setDiscussionAnonymous(false)}
                    className="accent-primary"
                  />
                  <span>Named responses</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white">
                  <input
                    type="radio"
                    name="discussion-visibility"
                    checked={discussionAnonymous}
                    onChange={() => setDiscussionAnonymous(true)}
                    className="accent-primary"
                  />
                  <span>Anonymous responses</span>
                </label>
              </div>
            </fieldset>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDiscussionModal(false)}
                disabled={discussionLaunching}
                className="px-4 py-2 rounded-xl text-indigo-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void launchDiscussion()}
                disabled={discussionLaunching || !discussionQuestion.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {discussionLaunching ? 'Launching...' : 'Launch Discussion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Launch Quick Poll</h3>
            <label className="block text-sm text-indigo-200 mb-2">Question</label>
            <input
              type="text"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What do you think?"
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 mb-4 focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-indigo-200">Options</label>
              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="text-xs text-primary-300 hover:text-white"
                >
                  + Add option
                </button>
              )}
            </div>
            <div className="space-y-2 mb-6">
              {pollOptions.map((opt, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    maxLength={200}
                    className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      className="px-3 text-red-300 hover:text-red-200"
                      aria-label="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPollModal(false)}
                disabled={pollLaunching}
                className="px-4 py-2 rounded-xl text-indigo-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void launchPoll()}
                disabled={pollLaunching || !pollQuestion.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pollLaunching ? 'Launching...' : 'Launch Poll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
