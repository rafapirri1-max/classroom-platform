import type { SupabaseClient } from '@supabase/supabase-js'
import { parseDiscussionLaunchConfig } from './launch-config'
import type { DiscussionLaunchConfig } from './types'
import { DISCUSSION_ACTIVITY_ID } from './types'

export type DiscussionRespondContext = {
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
  launchConfig: DiscussionLaunchConfig
}

export async function loadDiscussionRespondContext(
  supabase: SupabaseClient,
  roomId: string,
  activityInstanceId: string
): Promise<
  { ok: true; context: DiscussionRespondContext } | { ok: false; error: string; status: number }
> {
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
    return { ok: false, error: 'This discussion is not the active launch', status: 409 }
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
    return { ok: false, error: 'Discussion launch not found', status: 404 }
  }
  if (instance.activity_id !== DISCUSSION_ACTIVITY_ID) {
    return { ok: false, error: 'Not a discussion launch', status: 400 }
  }
  if (instance.room_id !== roomId) {
    return { ok: false, error: 'Discussion does not belong to this room', status: 400 }
  }
  if (instance.status !== 'active') {
    return { ok: false, error: 'Discussion has ended', status: 409 }
  }

  const launchConfig = parseDiscussionLaunchConfig(instance.launch_config)
  if (!launchConfig) {
    return { ok: false, error: 'Invalid discussion configuration', status: 500 }
  }
  if (launchConfig.phase !== 'collecting') {
    return { ok: false, error: 'Discussion is no longer accepting responses', status: 409 }
  }

  return {
    ok: true,
    context: { room, instance, launchConfig },
  }
}
