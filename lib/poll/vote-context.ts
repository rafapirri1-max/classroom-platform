import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePollLaunchConfig } from './launch-config'
import type { PollLaunchConfig } from './types'
import { POLL_ACTIVITY_ID } from './types'

export type PollVoteContext = {
  room: {
    id: string
    status: string
    class_id: string | null
    active_activity_instance_id: string | null
  }
  instance: {
    id: string
    status: string
    activity_id: string
    room_id: string
  }
  launchConfig: PollLaunchConfig
}

export async function loadPollVoteContext(
  supabase: SupabaseClient,
  roomId: string,
  activityInstanceId: string
): Promise<{ ok: true; context: PollVoteContext } | { ok: false; error: string; status: number }> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, status, class_id, active_activity_instance_id')
    .eq('id', roomId)
    .maybeSingle()

  if (roomError) {
    return { ok: false, error: roomError.message, status: 500 }
  }
  if (!room) {
    return { ok: false, error: 'Room not found', status: 404 }
  }
  if (room.status !== 'active') {
    return { ok: false, error: 'Room is not active', status: 400 }
  }
  if (room.active_activity_instance_id !== activityInstanceId) {
    return { ok: false, error: 'This poll is not the active launch', status: 409 }
  }

  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, status, activity_id, room_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    return { ok: false, error: instanceError.message, status: 500 }
  }
  if (!instance) {
    return { ok: false, error: 'Poll launch not found', status: 404 }
  }
  if (instance.activity_id !== POLL_ACTIVITY_ID) {
    return { ok: false, error: 'Not a poll launch', status: 400 }
  }
  if (instance.room_id !== roomId) {
    return { ok: false, error: 'Poll does not belong to this room', status: 400 }
  }
  if (instance.status !== 'active') {
    return { ok: false, error: 'Poll has ended', status: 409 }
  }

  const launchConfig = parsePollLaunchConfig(instance.launch_config)
  if (!launchConfig) {
    return { ok: false, error: 'Invalid poll configuration', status: 500 }
  }

  return {
    ok: true,
    context: {
      room,
      instance,
      launchConfig,
    },
  }
}

export function isValidPollOptionId(
  launchConfig: PollLaunchConfig,
  optionId: string
): boolean {
  return launchConfig.options.some((opt) => opt.id === optionId)
}
