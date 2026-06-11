import type { SupabaseClient } from '@supabase/supabase-js'
import { parseDiscussionLaunchConfig } from './launch-config'
import type { DiscussionLaunchConfig } from './types'
import { DISCUSSION_ACTIVITY_ID } from './types'

export async function fetchActiveDiscussionConfig(
  supabase: SupabaseClient,
  room: {
    current_activity?: string | null
    active_activity_instance_id?: string | null
  }
): Promise<DiscussionLaunchConfig | null> {
  if (room.current_activity !== DISCUSSION_ACTIVITY_ID || !room.active_activity_instance_id) {
    return null
  }

  const { data, error } = await supabase
    .from('activity_instances')
    .select('launch_config, activity_id')
    .eq('id', room.active_activity_instance_id)
    .maybeSingle()

  if (error) {
    console.error('fetchActiveDiscussionConfig:', error.message)
    return null
  }
  if (!data || data.activity_id !== DISCUSSION_ACTIVITY_ID) return null

  return parseDiscussionLaunchConfig(data.launch_config)
}
