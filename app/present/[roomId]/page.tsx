'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { DISCUSSION_ACTIVITY_ID } from '@/lib/discussion/types'
import { BiasDetectivePresent } from '@/lib/present/bias-detective-present'
import { DiscussionPresent } from '@/lib/present/discussion-present'
import { ClosedPresent } from '@/lib/present/closed-present'
import { fetchActiveInstanceMeta } from '@/lib/present/fetch-instance'
import { PollPresent } from '@/lib/present/poll-present'
import { WordCloudPresent } from '@/lib/present/wordcloud-present'
import { PresentShell } from '@/lib/present/present-shell'
import type { PresentInstanceMeta, PresentRoom } from '@/lib/present/types'
import { WaitingPresent } from '@/lib/present/waiting-present'
import { fetchActivePollConfig } from '@/lib/poll/fetch-active'
import type { PollLaunchConfig } from '@/lib/poll/types'
import { POLL_ACTIVITY_ID } from '@/lib/poll/types'
import { WORDCLOUD_ACTIVITY_ID } from '@/lib/wordcloud/types'
import { supabase } from '@/lib/supabase'

export default function PresentRoomPage() {
  const params = useParams()
  const roomId = params.roomId as string

  const [room, setRoom] = useState<PresentRoom | null>(null)
  const [instanceMeta, setInstanceMeta] = useState<PresentInstanceMeta | null>(null)
  const [pollConfig, setPollConfig] = useState<PollLaunchConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle()

    if (error || !data) {
      setNotFound(true)
      setRoom(null)
      return
    }

    const roomData = data as PresentRoom
    setRoom(roomData)
    setNotFound(false)

    const meta = await fetchActiveInstanceMeta(supabase, roomData)
    setInstanceMeta(meta)

    if (roomData.current_activity === POLL_ACTIVITY_ID) {
      const config = await fetchActivePollConfig(supabase, roomData)
      setPollConfig(config)
    } else {
      setPollConfig(null)
    }
  }, [roomId])

  useEffect(() => {
    void loadRoom().finally(() => setLoading(false))

    const channel = supabase
      .channel(`present-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          void loadRoom()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, loadRoom])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-200 text-xl">
        Loading presentation...
      </div>
    )
  }

  if (notFound || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-center px-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">Room not found</h1>
          <p className="text-indigo-300">Check the presentation link from your teacher.</p>
        </div>
      </div>
    )
  }

  const presentRoom = room
  const activity = presentRoom.current_activity || 'waiting'
  const isLive = presentRoom.status === 'active' && activity !== 'waiting'

  let activityView: ReactNode

  if (presentRoom.status === 'closed') {
    activityView = <ClosedPresent />
  } else if (activity === 'waiting') {
    activityView = <WaitingPresent roomId={presentRoom.id} roomCode={presentRoom.code} />
  } else if (activity === POLL_ACTIVITY_ID) {
    activityView =
      pollConfig && presentRoom.active_activity_instance_id ? (
        <PollPresent
          launchConfig={pollConfig}
          activityInstanceId={presentRoom.active_activity_instance_id}
        />
      ) : (
        <div className="text-center text-2xl text-indigo-200">Loading poll...</div>
      )
  } else if (activity === DISCUSSION_ACTIVITY_ID) {
    activityView =
      presentRoom.active_activity_instance_id ? (
        <DiscussionPresent
          roomId={presentRoom.id}
          roomCode={presentRoom.code}
          activityInstanceId={presentRoom.active_activity_instance_id}
        />
      ) : (
        <div className="text-center text-2xl text-indigo-200">Loading discussion...</div>
      )
  } else if (activity === WORDCLOUD_ACTIVITY_ID) {
    activityView =
      presentRoom.active_activity_instance_id ? (
        <WordCloudPresent activityInstanceId={presentRoom.active_activity_instance_id} />
      ) : (
        <div className="text-center text-2xl text-indigo-200">Loading word cloud...</div>
      )
  } else if (activity === 'bias-detective') {
    activityView = (
      <BiasDetectivePresent
        roomId={presentRoom.id}
        roomCode={presentRoom.code}
        startedAt={instanceMeta?.started_at}
      />
    )
  } else {
    activityView = (
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4 capitalize">
          {activity.replace(/-/g, ' ')}
        </h1>
        <p className="text-xl text-indigo-200">Activity in progress — participate on your device.</p>
      </div>
    )
  }

  const isDiscussion = activity === DISCUSSION_ACTIVITY_ID

  return (
    <PresentShell
      roomCode={presentRoom.code}
      roomStatus={presentRoom.status}
      live={isLive}
      hideHeader={isDiscussion}
      shellClassName={
        isDiscussion
          ? 'min-h-screen bg-[#0b0a12] flex flex-col'
          : undefined
      }
      mainClassName={
        isDiscussion
          ? 'flex-1 flex items-start justify-center px-6 py-8 md:px-12 md:py-10 lg:px-16 lg:py-12 overflow-y-auto'
          : undefined
      }
    >
      {activityView}
    </PresentShell>
  )
}
