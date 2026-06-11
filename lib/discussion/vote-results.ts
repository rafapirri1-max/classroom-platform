import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDiscussionDisplayLabel } from './display'
import { parseDiscussionLaunchConfig } from './launch-config'
import type { DiscussionVoteResultsPayload } from './types'
import { DISCUSSION_ACTIVITY_ID } from './types'

export async function fetchDiscussionVoteResults(
  supabase: SupabaseClient,
  activityInstanceId: string
): Promise<DiscussionVoteResultsPayload | null> {
  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, activity_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    console.error('fetchDiscussionVoteResults instance:', instanceError.message)
    return null
  }
  if (!instance || instance.activity_id !== DISCUSSION_ACTIVITY_ID) return null

  const launchConfig = parseDiscussionLaunchConfig(instance.launch_config)
  if (!launchConfig) return null

  const { data: responses, error: responsesError } = await supabase
    .from('discussion_responses')
    .select('id, student_id, response_text, created_at')
    .eq('activity_instance_id', activityInstanceId)
    .order('created_at', { ascending: true })

  if (responsesError) {
    console.error('fetchDiscussionVoteResults responses:', responsesError.message)
    return null
  }

  const rows = responses || []
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id as string)))
  const nameByStudentId = new Map<string, string>()

  if (studentIds.length > 0) {
    const { data: students } = await supabase.from('students').select('id, name').in('id', studentIds)
    for (const student of students || []) {
      nameByStudentId.set(student.id as string, (student.name as string) || 'Student')
    }
  }

  const voteCountByResponseId = new Map<string, number>()
  for (const row of rows) {
    voteCountByResponseId.set(row.id as string, 0)
  }

  const { data: votes, error: votesError } = await supabase
    .from('discussion_votes')
    .select('selected_response_id')
    .eq('activity_instance_id', activityInstanceId)

  if (votesError) {
    console.error('fetchDiscussionVoteResults votes:', votesError.message)
    return null
  }

  for (const vote of votes || []) {
    const id = vote.selected_response_id as string
    voteCountByResponseId.set(id, (voteCountByResponseId.get(id) ?? 0) + 1)
  }

  const results = rows.map((row, index) => {
    const responseNumber = index + 1
    const studentName = nameByStudentId.get(row.student_id as string) || 'Student'
    return {
      response_id: row.id as string,
      response_number: responseNumber,
      display_label: formatDiscussionDisplayLabel(
        launchConfig.anonymous,
        responseNumber,
        studentName
      ),
      response_text: row.response_text as string,
      vote_count: voteCountByResponseId.get(row.id as string) ?? 0,
    }
  })

  results.sort((a, b) => b.vote_count - a.vote_count || a.response_number - b.response_number)

  return {
    activity_instance_id: instance.id,
    phase: launchConfig.phase,
    question: launchConfig.question,
    anonymous: launchConfig.anonymous,
    total_votes_cast: votes?.length ?? 0,
    response_count: rows.length,
    results,
  }
}
