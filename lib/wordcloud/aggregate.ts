import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWordCloudLaunchConfig } from './launch-config'
import type { WordCloudAggregatePayload, WordCloudAggregateWord } from './types'
import { WORDCLOUD_ACTIVITY_ID } from './types'

export async function fetchWordCloudAggregate(
  supabase: SupabaseClient,
  activityInstanceId: string
): Promise<WordCloudAggregatePayload | null> {
  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, activity_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    console.error('fetchWordCloudAggregate instance:', instanceError.message)
    return null
  }
  if (!instance || instance.activity_id !== WORDCLOUD_ACTIVITY_ID) return null

  const launchConfig = parseWordCloudLaunchConfig(instance.launch_config)
  if (!launchConfig) return null

  const { count: responseCount, error: countError } = await supabase
    .from('wordcloud_responses')
    .select('id', { count: 'exact', head: true })
    .eq('activity_instance_id', activityInstanceId)

  if (countError) {
    console.error('fetchWordCloudAggregate count:', countError.message, countError.code)
    return null
  }

  if (launchConfig.phase !== 'revealed') {
    return {
      activity_instance_id: instance.id,
      question: launchConfig.question,
      phase: launchConfig.phase,
      response_count: responseCount ?? 0,
      words: null,
    }
  }

  const { data: rows, error: rowsError } = await supabase
    .from('wordcloud_responses')
    .select('answer_text, normalized_text')
    .eq('activity_instance_id', activityInstanceId)

  if (rowsError) {
    console.error('fetchWordCloudAggregate rows:', rowsError.message, rowsError.code)
    return null
  }

  const buckets = new Map<string, { text: string; count: number }>()

  for (const row of rows || []) {
    const normalized = (row.normalized_text as string) || ''
    const answerText = (row.answer_text as string) || ''
    if (!normalized) continue

    const existing = buckets.get(normalized)
    if (existing) {
      existing.count += 1
    } else {
      buckets.set(normalized, { text: answerText, count: 1 })
    }
  }

  const words: WordCloudAggregateWord[] = Array.from(buckets.values()).sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text)
  )

  return {
    activity_instance_id: instance.id,
    question: launchConfig.question,
    phase: launchConfig.phase,
    response_count: responseCount ?? words.reduce((sum, word) => sum + word.count, 0),
    words,
  }
}
