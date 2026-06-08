import type { SupabaseClient } from '@supabase/supabase-js'
import { OPEN_SESSION_MAX_AGE_MS } from './constants'

export async function findReusableOpenSession(
  supabase: SupabaseClient,
  params: {
    student_id: string
    room_id: string
    game_type: string
    activity_instance_id?: string | null
  }
): Promise<string | null> {
  const { student_id, room_id, game_type, activity_instance_id } = params
  const cutoff = new Date(Date.now() - OPEN_SESSION_MAX_AGE_MS).toISOString()

  let query = supabase
    .from('game_sessions')
    .select('id')
    .eq('student_id', student_id)
    .or('completed.is.null,completed.eq.false')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)

  if (activity_instance_id) {
    query = query.eq('activity_instance_id', activity_instance_id)
  } else {
    query = query
      .eq('room_id', room_id)
      .eq('game_type', game_type)
      .is('activity_instance_id', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('findReusableOpenSession:', error.message)
    return null
  }

  return data?.id ?? null
}
