import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWordCloudLaunchConfig } from './launch-config'
import type { WordCloudLaunchConfig } from './types'
import { WORDCLOUD_ACTIVITY_ID } from './types'

export async function fetchActiveWordCloudConfig(
  supabase: SupabaseClient,
  room: {
    current_activity?: string | null
    active_activity_instance_id?: string | null
  }
): Promise<WordCloudLaunchConfig | null> {
  if (room.current_activity !== WORDCLOUD_ACTIVITY_ID || !room.active_activity_instance_id) {
    return null
  }

  const { data, error } = await supabase
    .from('activity_instances')
    .select('launch_config, activity_id')
    .eq('id', room.active_activity_instance_id)
    .maybeSingle()

  if (error) {
    console.error('fetchActiveWordCloudConfig:', error.message)
    return null
  }
  if (!data || data.activity_id !== WORDCLOUD_ACTIVITY_ID) return null

  return parseWordCloudLaunchConfig(data.launch_config)
}
