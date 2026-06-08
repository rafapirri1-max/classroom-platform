import type { SupabaseClient } from '@supabase/supabase-js'

export type RoomSnapshot = {
  id: string
  status: string
  current_activity?: string | null
}

export type RoomSnapshotMap = Record<string, RoomSnapshot>

export async function fetchRoomsByIds(
  supabase: SupabaseClient,
  roomIds: string[]
): Promise<RoomSnapshotMap> {
  if (roomIds.length === 0) return {}

  const { data, error } = await supabase
    .from('rooms')
    .select('id, status, current_activity')
    .in('id', roomIds)

  if (error) {
    console.error('fetchRoomsByIds:', error.message)
    return {}
  }

  const map: RoomSnapshotMap = {}
  for (const room of data || []) {
    map[room.id] = room as RoomSnapshot
  }
  return map
}

/** True when the room is active and still running this session's activity. */
export function isLiveHubInProgress(
  session: { room_id?: string | null; game_type?: string | null },
  roomsById: RoomSnapshotMap
): boolean {
  if (!session.room_id) return false
  const room = roomsById[session.room_id]
  if (!room || room.status !== 'active') return false
  const activityId = session.game_type || 'bias-detective'
  return room.current_activity === activityId
}

export function getHubSessionEndReason(
  session: { room_id?: string | null; game_type?: string | null },
  roomsById: RoomSnapshotMap
): string {
  if (isLiveHubInProgress(session, roomsById)) return ''
  if (!session.room_id) return 'No room linked'
  const room = roomsById[session.room_id]
  if (!room) return 'Room not found'
  if (room.status === 'closed') return 'Room closed'
  const activityId = session.game_type || 'bias-detective'
  if (room.current_activity === 'waiting') return 'Activity ended'
  if (room.current_activity !== activityId) return 'Activity changed'
  return 'Session ended'
}
