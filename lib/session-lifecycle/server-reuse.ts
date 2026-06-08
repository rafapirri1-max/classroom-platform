import type { SupabaseClient } from '@supabase/supabase-js'
import { OPEN_SESSION_MAX_AGE_MS } from './constants'

export async function findReusableOpenSession(
  supabase: SupabaseClient,
  params: {
    student_id: string
    room_id: string
    game_type: string
  }
): Promise<string | null> {
  const { student_id, room_id, game_type } = params
  const cutoff = new Date(Date.now() - OPEN_SESSION_MAX_AGE_MS).toISOString()

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('student_id', student_id)
    .eq('room_id', room_id)
    .eq('game_type', game_type)
    .or('completed.is.null,completed.eq.false')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('findReusableOpenSession:', error.message)
    return null
  }

  return data?.id ?? null
}
