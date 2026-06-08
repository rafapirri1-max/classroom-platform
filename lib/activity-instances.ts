import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityInstanceEndReason =
  | 'activity_ended'
  | 'activity_switched'
  | 'room_closed'
  | 'superseded'

export type RoomForActivityLaunch = {
  id: string
  current_activity?: string | null
  class_id?: string | null
  teacher_id?: string | null
  active_activity_instance_id?: string | null
}

/** End the room's active instance (if any) and clear rooms.active_activity_instance_id. */
export async function endActiveRoomInstance(
  supabase: SupabaseClient,
  roomId: string,
  endReason: ActivityInstanceEndReason,
  activeInstanceId?: string | null
): Promise<void> {
  let instanceId = activeInstanceId ?? null
  if (!instanceId) {
    const { data: room } = await supabase
      .from('rooms')
      .select('active_activity_instance_id')
      .eq('id', roomId)
      .maybeSingle()
    instanceId = room?.active_activity_instance_id ?? null
  }
  if (!instanceId) return

  const endedAt = new Date().toISOString()
  const { error: instanceError } = await supabase
    .from('activity_instances')
    .update({
      status: 'ended',
      ended_at: endedAt,
      end_reason: endReason,
    })
    .eq('id', instanceId)
    .eq('status', 'active')

  if (instanceError) {
    console.error('endActiveRoomInstance:', instanceError.message)
    throw instanceError
  }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({ active_activity_instance_id: null })
    .eq('id', roomId)

  if (roomError) {
    console.error('endActiveRoomInstance clear room:', roomError.message)
    throw roomError
  }
}

async function createAndActivateInstance(
  supabase: SupabaseClient,
  room: RoomForActivityLaunch,
  activityId: string
): Promise<string> {
  const { data: instance, error: insertError } = await supabase
    .from('activity_instances')
    .insert({
      room_id: room.id,
      class_id: room.class_id ?? null,
      teacher_id: room.teacher_id ?? null,
      activity_id: activityId,
      status: 'active',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('createAndActivateInstance:', insertError.message)
    throw insertError
  }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({
      current_activity: activityId,
      active_activity_instance_id: instance.id,
    })
    .eq('id', room.id)

  if (roomError) {
    console.error('createAndActivateInstance update room:', roomError.message)
    throw roomError
  }

  return instance.id
}

/**
 * Teacher launch flow: end any active instance, optionally waiting-hop for same-game relaunch,
 * create a new instance, set rooms.active_activity_instance_id, update current_activity.
 */
export async function launchRoomActivity(
  supabase: SupabaseClient,
  room: RoomForActivityLaunch,
  gameId: string
): Promise<void> {
  if (gameId === 'waiting') {
    await endActiveRoomInstance(
      supabase,
      room.id,
      'activity_ended',
      room.active_activity_instance_id
    )
    const { error } = await supabase
      .from('rooms')
      .update({ current_activity: 'waiting' })
      .eq('id', room.id)
    if (error) throw error
    return
  }

  // Briefly set waiting so re-launching the same game still triggers a new attempt on students.
  if (room.current_activity === gameId) {
    await endActiveRoomInstance(
      supabase,
      room.id,
      'activity_ended',
      room.active_activity_instance_id
    )
    const { error: waitingError } = await supabase
      .from('rooms')
      .update({ current_activity: 'waiting' })
      .eq('id', room.id)
    if (waitingError) throw waitingError
  } else if (room.active_activity_instance_id) {
    await endActiveRoomInstance(
      supabase,
      room.id,
      'activity_switched',
      room.active_activity_instance_id
    )
  }

  await createAndActivateInstance(supabase, room, gameId)
}

/** Close room: end active instance, clear pointer, set status closed (preserve current_activity). */
export async function closeRoomWithInstances(
  supabase: SupabaseClient,
  roomId: string,
  activeInstanceId?: string | null
): Promise<void> {
  await endActiveRoomInstance(supabase, roomId, 'room_closed', activeInstanceId)
  const { error } = await supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId)
  if (error) throw error
}
