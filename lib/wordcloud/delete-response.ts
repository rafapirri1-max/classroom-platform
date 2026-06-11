import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWordCloudLaunchConfig } from './launch-config'

export async function deleteWordCloudResponse(
  supabase: SupabaseClient,
  activityInstanceId: string,
  responseId: string,
  launchConfigRaw: unknown
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const launchConfig = parseWordCloudLaunchConfig(launchConfigRaw)
  if (!launchConfig) {
    return { ok: false, error: 'Invalid word cloud configuration', status: 500 }
  }
  if (launchConfig.phase !== 'collecting') {
    return { ok: false, error: 'Cannot delete responses after reveal', status: 409 }
  }

  const { data: row, error: rowError } = await supabase
    .from('wordcloud_responses')
    .select('id, activity_instance_id')
    .eq('id', responseId)
    .maybeSingle()

  if (rowError) {
    return { ok: false, error: rowError.message, status: 500 }
  }
  if (!row) {
    return { ok: false, error: 'Response not found', status: 404 }
  }
  if (row.activity_instance_id !== activityInstanceId) {
    return { ok: false, error: 'Response does not belong to this word cloud', status: 400 }
  }

  const { error: deleteError } = await supabase
    .from('wordcloud_responses')
    .delete()
    .eq('id', responseId)

  if (deleteError) {
    if (deleteError.code === '42501') {
      return {
        ok: false,
        error:
          'Word cloud delete was blocked by database permissions. Apply wordcloud_responses delete migration.',
        status: 500,
      }
    }
    return { ok: false, error: deleteError.message, status: 500 }
  }

  return { ok: true }
}
