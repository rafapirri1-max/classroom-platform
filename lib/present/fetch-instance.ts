import type { SupabaseClient } from '@supabase/supabase-js'
import type { PresentInstanceMeta, PresentRoom } from './types'

export async function fetchActiveInstanceMeta(
  supabase: SupabaseClient,
  room: Pick<PresentRoom, 'active_activity_instance_id'>
): Promise<PresentInstanceMeta | null> {
  if (!room.active_activity_instance_id) return null

  const { data, error } = await supabase
    .from('activity_instances')
    .select('id, activity_id, started_at, status')
    .eq('id', room.active_activity_instance_id)
    .maybeSingle()

  if (error) {
    console.error('fetchActiveInstanceMeta:', error.message)
    return null
  }

  return data as PresentInstanceMeta | null
}
