'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { closeRoomWithInstances, launchRoomActivity } from '@/lib/activity-instances'
import { activityToLaunchCard } from '@/lib/activity-engine/adapters/game-json'
import type { ActivityLaunchCard } from '@/lib/activity-engine/types'
import { fetchActivePollConfig } from '@/lib/poll/fetch-active'
import type { PollLaunchConfig } from '@/lib/poll/types'
import { POLL_ACTIVITY_ID } from '@/lib/poll/types'
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
          <div className="flex gap-3">
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

              {games.map((game) => (
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

            {room.current_activity === POLL_ACTIVITY_ID && activePollConfig && (
              <div className="mb-8 bg-white/10 border border-primary/40 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-white mb-2">📊 Live poll</h3>
                <p className="text-white font-medium mb-4">{activePollConfig.question}</p>
                <ul className="space-y-2">
                  {activePollConfig.options.map((opt) => (
                    <li
                      key={opt.id}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-indigo-100 text-sm"
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-indigo-300 mt-4">Voting and results arrive in a later update.</p>
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
