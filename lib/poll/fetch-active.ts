import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePollLaunchConfig } from './launch-config'
import type { PollLaunchConfig } from './types'
import { POLL_ACTIVITY_ID } from './types'

export async function fetchActivePollConfig(
  supabase: SupabaseClient,
  room: {
    current_activity?: string | null
    active_activity_instance_id?: string | null
  }
): Promise<PollLaunchConfig | null> {
  if (room.current_activity !== POLL_ACTIVITY_ID || !room.active_activity_instance_id) {
    return null
  }

  const { data, error } = await supabase
    .from('activity_instances')
    .select('launch_config, activity_id')
    .eq('id', room.active_activity_instance_id)
    .maybeSingle()

  if (error) {
    console.error('fetchActivePollConfig:', error.message)
    return null
  }
  if (!data || data.activity_id !== POLL_ACTIVITY_ID) return null

  return parsePollLaunchConfig(data.launch_config)
}
