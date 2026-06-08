import type { SupabaseClient } from '@supabase/supabase-js'

export type RoomSnapshot = {
  id: string
  status: string
  current_activity?: string | null
  active_activity_instance_id?: string | null
}

export type RoomSnapshotMap = Record<string, RoomSnapshot>

export type ActivityInstanceSnapshot = {
  id: string
  status: string
}

export type ActivityInstanceSnapshotMap = Record<string, ActivityInstanceSnapshot>

export async function fetchRoomsByIds(
  supabase: SupabaseClient,
  roomIds: string[]
): Promise<RoomSnapshotMap> {
  if (roomIds.length === 0) return {}

  const { data, error } = await supabase
    .from('rooms')
    .select('id, status, current_activity, active_activity_instance_id')
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

export async function fetchActivityInstancesByIds(
  supabase: SupabaseClient,
  instanceIds: string[]
): Promise<ActivityInstanceSnapshotMap> {
  if (instanceIds.length === 0) return {}

  const { data, error } = await supabase
    .from('activity_instances')
    .select('id, status')
    .in('id', instanceIds)

  if (error) {
    console.error('fetchActivityInstancesByIds:', error.message)
    return {}
  }

  const map: ActivityInstanceSnapshotMap = {}
  for (const row of data || []) {
    map[row.id] = row as ActivityInstanceSnapshot
  }
  return map
}

/** True when the room is active and still running this session's activity. */
export function isLiveHubInProgress(
  session: {
    room_id?: string | null
    game_type?: string | null
    activity_instance_id?: string | null
  },
  roomsById: RoomSnapshotMap,
  instancesById: ActivityInstanceSnapshotMap = {}
): boolean {
  if (!session.room_id) return false
  const room = roomsById[session.room_id]
  if (!room || room.status !== 'active') return false
  const activityId = session.game_type || 'bias-detective'
  if (room.current_activity !== activityId) return false

  const instanceId = session.activity_instance_id
  if (!instanceId) return true

  const matchesRoomActive = room.active_activity_instance_id === instanceId
  const instanceActive = instancesById[instanceId]?.status === 'active'
  return matchesRoomActive || instanceActive
}

export function getHubSessionEndReason(
  session: {
    room_id?: string | null
    game_type?: string | null
    activity_instance_id?: string | null
  },
  roomsById: RoomSnapshotMap,
  instancesById: ActivityInstanceSnapshotMap = {}
): string {
  if (isLiveHubInProgress(session, roomsById, instancesById)) return ''
  if (!session.room_id) return 'No room linked'
  const room = roomsById[session.room_id]
  if (!room) return 'Room not found'
  if (room.status === 'closed') return 'Room closed'
  const instanceId = session.activity_instance_id
  if (instanceId && instancesById[instanceId]?.status === 'ended') {
    return 'Previous launch ended'
  }
  const activityId = session.game_type || 'bias-detective'
  if (room.current_activity === 'waiting') return 'Activity ended'
  if (room.current_activity !== activityId) return 'Activity changed'
  return 'Session ended'
}
