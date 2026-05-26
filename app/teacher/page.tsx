'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export default function TeacherPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    const { data } = await supabase.from('rooms').select('*').order('created_at', { ascending: false })
    if (data) setRooms(data)
    setLoading(false)
  }

  async function createRoom() {
    const code = generateRoomCode()
    const { data, error } = await supabase.from('rooms').insert({ code, status: 'active' }).select().single()
    if (data && !error) {
      router.push(`/teacher/room/${data.id}`)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">👨‍🏫 Teacher Dashboard</h1>
            <p className="text-indigo-200 mt-1">Create and manage classroom rooms</p>
          </div>
          <button
            onClick={createRoom}
            className="px-6 py-3 bg-gradient-to-r from-accent to-orange-500 text-white font-bold rounded-xl hover:opacity-90"
          >
            + Create New Room
          </button>
        </div>

        {loading ? (
          <div className="text-center text-indigo-200 py-12">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
            <div className="text-5xl mb-4">🏫</div>
            <h2 className="text-xl font-bold text-white mb-2">No rooms yet</h2>
            <p className="text-indigo-200 mb-4">Create your first room</p>
            <button onClick={createRoom} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90">
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => router.push(`/teacher/room/${room.id}`)}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-accent mb-1">{room.code}</div>
                    <div className="text-indigo-200 text-sm">
                      Created {new Date(room.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      room.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {room.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
