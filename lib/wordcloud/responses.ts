import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWordCloudLaunchConfig } from './launch-config'
import type { WordCloudResponsesPayload } from './types'
import { WORDCLOUD_ACTIVITY_ID } from './types'

export async function fetchWordCloudResponses(
  supabase: SupabaseClient,
  activityInstanceId: string
): Promise<WordCloudResponsesPayload | null> {
  const { data: instance, error: instanceError } = await supabase
    .from('activity_instances')
    .select('id, activity_id, launch_config')
    .eq('id', activityInstanceId)
    .maybeSingle()

  if (instanceError) {
    console.error('fetchWordCloudResponses instance:', instanceError.message)
    return null
  }
  if (!instance || instance.activity_id !== WORDCLOUD_ACTIVITY_ID) return null

  const launchConfig = parseWordCloudLaunchConfig(instance.launch_config)
  if (!launchConfig) return null

  const { data: rows, error: rowsError } = await supabase
    .from('wordcloud_responses')
    .select('id, student_id, answer_text, created_at')
    .eq('activity_instance_id', activityInstanceId)
    .order('created_at', { ascending: true })

  if (rowsError) {
    console.error('fetchWordCloudResponses rows:', rowsError.message, rowsError.code)
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
      console.error('fetchWordCloudResponses students:', studentsError.message, studentsError.code)
    } else {
      for (const student of students || []) {
        nameByStudentId.set(student.id as string, (student.name as string) || 'Student')
      }
    }
  }

  const responses = (rows || []).map((row) => {
    const studentName = nameByStudentId.get(row.student_id as string) || 'Student'
    return {
      id: row.id as string,
      answer_text: row.answer_text as string,
      display_label: studentName,
      created_at: row.created_at as string,
    }
  })

  return {
    activity_instance_id: instance.id,
    question: launchConfig.question,
    phase: launchConfig.phase,
    response_count: responses.length,
    responses,
  }
}
