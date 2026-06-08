import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePollLaunchConfig } from './launch-config'
import type { PollLaunchConfig } from './types'
import { POLL_ACTIVITY_ID } from './types'

export type PollOptionResult = {
  id: string
  label: string
  count: number
  percent: number
}

export type PollResultsPayload = {
  activity_instance_id: string
  status: string
  launch_config: PollLaunchConfig
  total_votes: number
  options: PollOptionResult[]
}

export function aggregatePollResults(
  launchConfig: PollLaunchConfig,
  responses: { selected_option_ids: string[] }[],
  meta: { activityInstanceId: string; status: string }
): PollResultsPayload {
  const counts: Record<string, number> = {}
  for (const opt of launchConfig.options) {
    counts[opt.id] = 0
  }

  for (const response of responses) {
    const optionId = response.selected_option_ids?.[0]
    if (optionId && optionId in counts) {
      counts[optionId] += 1
    }
  }

  const totalVotes = Object.values(counts).reduce((sum, n) => sum + n, 0)

  const options: PollOptionResult[] = launchConfig.options.map((opt) => {
    const count = counts[opt.id] ?? 0
    const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    return { id: opt.id, label: opt.label, count, percent }
  })

  return {
    activity_instance_id: meta.activityInstanceId,
    status: meta.status,
    launch_config: launchConfig,
    total_votes: totalVotes,
    options,
  }
}

export async function fetchPollResults(
  supabase: SupabaseClient,
  activityInstanceId: string
): Promise<PollResultsPayload | null> {
  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, status, activity_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    console.error('fetchPollResults instance:', instanceError.message)
    return null
  }
  if (!instance || instance.activity_id !== POLL_ACTIVITY_ID) return null

  const launchConfig = parsePollLaunchConfig(instance.launch_config)
  if (!launchConfig) return null

  const { data: responses, error: responsesError } = await supabase
    .from('poll_responses')
    .select('selected_option_ids')
    .eq('activity_instance_id', activityInstanceId)

  if (responsesError) {
    console.error('fetchPollResults responses:', responsesError.message)
    return null
  }

  return aggregatePollResults(launchConfig, responses || [], {
    activityInstanceId: instance.id,
    status: instance.status,
  })
}
