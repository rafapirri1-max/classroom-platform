import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDiscussionDisplayLabel } from './display'
import { parseDiscussionLaunchConfig } from './launch-config'
import type { DiscussionResponsesPayload } from './types'
import { DISCUSSION_ACTIVITY_ID } from './types'

export async function fetchDiscussionResponses(
  supabase: SupabaseClient,
  activityInstanceId: string
): Promise<DiscussionResponsesPayload | null> {
  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, activity_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    console.error('fetchDiscussionResponses instance:', instanceError.message)
    return null
  }
  if (!instance || instance.activity_id !== DISCUSSION_ACTIVITY_ID) return null

  const launchConfig = parseDiscussionLaunchConfig(instance.launch_config)
  if (!launchConfig) return null

  const { data: rows, error: rowsError } = await supabase
    .from('discussion_responses')
    .select('id, student_id, response_text, created_at')
    .eq('activity_instance_id', activityInstanceId)
    .order('created_at', { ascending: true })

  if (rowsError) {
    console.error('fetchDiscussionResponses rows:', rowsError.message, rowsError.code)
    return null
  }

  const studentIds = Array.from(new Set((rows || []).map((row) => row.student_id as string)))
  const nameByStudentId = new Map<string, string>()

  if (studentIds.length > 0) {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .in('id', studentIds)

    if (studentsError) {
      console.error('fetchDiscussionResponses students:', studentsError.message, studentsError.code)
    } else {
      for (const student of students || []) {
        nameByStudentId.set(student.id as string, (student.name as string) || 'Student')
      }
    }
  }

  const responses = (rows || []).map((row, index) => {
    const responseNumber = index + 1
    const studentName = nameByStudentId.get(row.student_id as string) || 'Student'
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      response_number: responseNumber,
      display_label: formatDiscussionDisplayLabel(
        launchConfig.anonymous,
        responseNumber,
        studentName
      ),
      response_text: row.response_text as string,
      created_at: row.created_at as string,
    }
  })

  return {
    activity_instance_id: instance.id,
    question: launchConfig.question,
    anonymous: launchConfig.anonymous,
    phase: launchConfig.phase,
    selectedResponseId: launchConfig.selectedResponseId,
    responses,
  }
}
