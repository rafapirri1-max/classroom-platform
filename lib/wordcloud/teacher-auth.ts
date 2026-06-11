import type { SupabaseClient } from '@supabase/supabase-js'
import { WORDCLOUD_ACTIVITY_ID } from './types'

export async function authorizeTeacherWordCloudAction(
  supabase: SupabaseClient,
  roomId: string,
  teacherId: string,
  activityInstanceId: string
): Promise<
  | { ok: true; instance: { id: string; launch_config: unknown } }
  | { ok: false; error: string; status: number }
> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, status, teacher_id, active_activity_instance_id')
    .eq('id', roomId)
    .maybeSingle()

  if (roomError) return { ok: false, error: roomError.message, status: 500 }
  if (!room) return { ok: false, error: 'Room not found', status: 404 }
  if (room.status !== 'active') return { ok: false, error: 'Room is not active', status: 400 }
  if (room.teacher_id !== teacherId) {
    return { ok: false, error: 'Not authorized for this room', status: 403 }
  }
  if (room.active_activity_instance_id !== activityInstanceId) {
    return { ok: false, error: 'This word cloud is not the active launch', status: 409 }
  }

  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, activity_id, status, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) return { ok: false, error: instanceError.message, status: 500 }
  if (!instance) return { ok: false, error: 'Word cloud launch not found', status: 404 }
  if (instance.activity_id !== WORDCLOUD_ACTIVITY_ID) {
    return { ok: false, error: 'Not a word cloud launch', status: 400 }
  }
  if (instance.status !== 'active') {
    return { ok: false, error: 'Word cloud has ended', status: 409 }
  }

  return { ok: true, instance }
}
