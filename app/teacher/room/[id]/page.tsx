'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

const ACTIVITIES = [
  { id: 'waiting', name: 'Waiting Screen', emoji: '⏳' },
  { id: 'bias_game', name: 'Bias Detective Game', emoji: '🧠' },
  { id: 'poll', name: 'Quick Poll', emoji: '📊' },
  { id: 'wordcloud', name: 'Word Cloud', emoji: '☁️' },
]

export default function TeacherRoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && room?.code) {
      // QR code sends students to home page with room code pre-filled
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

  useEffect(() => {
    loadRoom()
    loadParticipants()
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
  }, [roomId, loadRoom, loadParticipants])

  async function launchActivity(activityId: string) {
    await supabase.from
