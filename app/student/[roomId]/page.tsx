'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StudentPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [room, setRoom] = useState<any>(null)

  useEffect(() => {
    supabase.from('rooms').select('*').eq('id', roomId).single().then(({ data }) => {
      if (data) setRoom(data)
    })
  }, [roomId])

  if (!room) return <div>Loading...</div>
  if (room.status === 'closed') return <div>Room closed</div>

  const activity = room.current_activity || 'waiting'

  return (
    <div>
      <div>Room: {room.code} | Activity: {activity}</div>
      {activity === 'waiting' && <div>Waiting for teacher...</div>}
      {activity === 'bias_game' && <iframe src="/bias_game.html" style={{width:'100%',height:'90vh',border:0}} />}
      {activity === 'poll' && <div>Poll here</div>}
      {activity === 'wordcloud' && <div>Word cloud here</div>}
    </div>
  )
}
