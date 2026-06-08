import {
  clearStoredRun,
  clearStoredRunsForRoom,
  readOpenStoredRunSessionId,
  writeStoredRunSessionId,
} from './student-storage'
import { shouldStartRunFromRoomUpdate } from './room-activity'
import { isTrackableActivity } from './trackable'

export type RoomRunContext = {
  id: string
  code: string
  status?: string
  class_id?: string | null
  current_activity?: string | null
  active_activity_instance_id?: string | null
}

export type TrackCaller = (
  action: string,
  data: Record<string, unknown>
) => Promise<{ ok: boolean; json: Record<string, unknown> }>

export type BeginRunResult = {
  sessionId: string | null
  restored: boolean
}

const inFlightStarts = new Map<string, Promise<string | null>>()

function inFlightKey(
  roomId: string,
  activityId: string,
  activityInstanceId: string | null | undefined,
  forceNew: boolean
) {
  return `${roomId}:${activityId}:${activityInstanceId ?? 'none'}:${forceNew ? 'new' : 'reuse'}`
}

export function clearRunOnTeacherWaiting(roomId: string): void {
  clearStoredRunsForRoom(roomId)
}

async function callStartSession(
  room: RoomRunContext,
  activityId: string,
  studentId: string,
  callTrack: TrackCaller,
  forceNew: boolean
): Promise<string | null> {
  const activityInstanceId = room.active_activity_instance_id ?? null
  const { ok, json } = await callTrack('start_session', {
    student_id: studentId,
    game_type: activityId,
    mode: 'room',
    room_code: room.code,
    room_id: room.id,
    class_id: room.class_id ?? null,
    activity_instance_id: activityInstanceId,
    force_new: forceNew,
  })

  if (ok && typeof json.session_id === 'string') {
    writeStoredRunSessionId(room.id, activityId, json.session_id, activityInstanceId)
    return json.session_id
  }
  return null
}

/**
 * Start or restore a tracked run for room.current_activity (activity id).
 * Host-ready: Engine V1b Activity Host should call this instead of inline effects.
 */
export async function beginOrRestoreRun(options: {
  room: RoomRunContext
  activityId: string
  studentId: string
  callTrack: TrackCaller
  forceNew?: boolean
}): Promise<BeginRunResult> {
  const { room, activityId, studentId, callTrack, forceNew = false } = options
  if (!isTrackableActivity(activityId)) {
    return { sessionId: null, restored: false }
  }

  const activityInstanceId = room.active_activity_instance_id ?? null

  if (forceNew) {
    clearStoredRun(room.id, activityId, activityInstanceId)
  } else {
    const stored = readOpenStoredRunSessionId(room.id, activityId, activityInstanceId)
    if (stored) {
      return { sessionId: stored, restored: true }
    }
  }

  const flightKey = inFlightKey(room.id, activityId, activityInstanceId, forceNew)
  const existing = inFlightStarts.get(flightKey)
  if (existing) {
    const sessionId = await existing
    return { sessionId, restored: false }
  }

  const promise = callStartSession(room, activityId, studentId, callTrack, forceNew)
  inFlightStarts.set(flightKey, promise)
  try {
    const sessionId = await promise
    return { sessionId, restored: false }
  } finally {
    inFlightStarts.delete(flightKey)
  }
}

/** Realtime room UPDATE: waiting screen, activity change, or ignore duplicate subscribe. */
export async function handleRoomActivityUpdate(options: {
  room: RoomRunContext
  prevActivity: string | null | undefined
  nextActivity: string | null | undefined
  studentId: string
  callTrack: TrackCaller
  priorRunOpen?: boolean
}): Promise<BeginRunResult | 'cleared' | null> {
  const { room, prevActivity, nextActivity, studentId, callTrack, priorRunOpen = true } = options

  if (nextActivity === 'waiting' && isTrackableActivity(prevActivity)) {
    clearRunOnTeacherWaiting(room.id)
    return 'cleared'
  }

  if (!shouldStartRunFromRoomUpdate(prevActivity, nextActivity, priorRunOpen) || !nextActivity) {
    return null
  }

  clearStoredRun(room.id, nextActivity, room.active_activity_instance_id)

  return beginOrRestoreRun({
    room,
    activityId: nextActivity,
    studentId,
    callTrack,
    forceNew: true,
  })
}

/** Student joined while a trackable activity is already live (refresh-safe restore). */
export async function handleJoinActiveActivity(options: {
  room: RoomRunContext
  studentId: string
  callTrack: TrackCaller
}): Promise<BeginRunResult | null> {
  const activityId = options.room.current_activity
  if (!isTrackableActivity(activityId) || !activityId) return null

  return beginOrRestoreRun({
    room: options.room,
    activityId,
    studentId: options.studentId,
    callTrack: options.callTrack,
    forceNew: false,
  })
}
