'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

interface GameConfig {
  id: string
  name: string
  icon: string
  description: string
  difficulty: string
}

export default function TeacherRoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [games, setGames] = useState<GameConfig[]>([])
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && room?.code) {
      const url = `${window.location.origin}/?room=${room.code}`
      QRCode.toDataURL(url, { width: 200 }).then(setQrUrl)
    }
  }, [room?.code])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
  }, [roomId])

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase.from('participants').select('*').eq('room_id', roomId).order('joined_at', { ascending: true })
    if (data) setParticipants(data)
  }, [roomId])

  const loadGames = useCallback(async () => {
    const res = await fetch('/api/games')
    const data = await res.json()
    if (data.games) setGames(data.games)
  }, [])

  useEffect(() => {
    loadRoom()
    loadParticipants()
    loadGames()
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
  }, [roomId, loadRoom, loadParticipants, loadGames])

  async function launchActivity(gameId: string) {
    await supabase.from('rooms').update({ current_activity: gameId }).eq('id', roomId)
  }

  async function closeRoom() {
    await supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  if (!room) return <div className="min-h-screen flex items-center justify-center text-white">Room not found</div>

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
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
            <p className="text-indigo-200">{participants.length} students connected</p>
          </div>
          <div className="flex gap-3">
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

            <h2 className="text-xl font-bold text-white mb-4">👥 Connected Students</h2>
            {participants.length === 0 ? (
              <div className="bg-white/10 rounded-2xl p-8 text-center text-indigo-200">
                No students yet. Share the QR code or room code.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {participants.map((p) => (
                  <div key={p.id} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl mb-1">👤</div>
                    <div className="text-white font-semibold text-sm truncate">{p.name}</div>
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
    </div>
  )
}
