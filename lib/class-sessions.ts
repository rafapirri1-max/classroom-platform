import type { SupabaseClient } from '@supabase/supabase-js'

export type FetchClassGameSessionsOptions = {
  classId: string
  classStudentIds: string[]
  /** When set, only sessions for this activity (e.g. bias-detective). */
  gameType?: string
  /** Supabase select string; defaults to * */
  select?: string
  /** Exclude join placeholder sessions (default true). */
  excludeJoin?: boolean
}

type GameSessionQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>

function applySessionFilters(
  query: GameSessionQuery,
  options: { gameType?: string; excludeJoin: boolean }
): GameSessionQuery {
  let q = query
  if (options.excludeJoin) q = q.neq('game_type', 'join')
  if (options.gameType) q = q.eq('game_type', options.gameType)
  return q
}

/**
 * Loads game_sessions for a class using Phase 0 attribution:
 * 1. Sessions with class_id matching this class (explicit attribution)
 * 2. Legacy sessions with null class_id for enrolled students (enrollment fallback)
 */
export async function fetchClassGameSessions<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  options: FetchClassGameSessionsOptions
): Promise<T[]> {
  const {
    classId,
    classStudentIds,
    gameType,
    select = '*',
    excludeJoin = true,
  } = options

  const filterOpts = { gameType, excludeJoin }

  const { data: byClass, error: classError } = await applySessionFilters(
    supabase.from('game_sessions').select(select),
    filterOpts
  )
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  if (classError) {
    console.error('fetchClassGameSessions by class_id:', classError.message)
    throw classError
  }

  let byEnrollment: T[] = []
  if (classStudentIds.length > 0) {
    const { data, error: enrollError } = await applySessionFilters(
      supabase.from('game_sessions').select(select),
      filterOpts
    )
      .is('class_id', null)
      .in('student_id', classStudentIds)
      .order('created_at', { ascending: false })

    if (enrollError) {
      console.error('fetchClassGameSessions enrollment fallback:', enrollError.message)
      throw enrollError
    }
    byEnrollment = (data || []) as T[]
  }

  const seen = new Set<string>()
  const merged: T[] = []

  for (const row of [...((byClass || []) as T[]), ...byEnrollment]) {
    const id = (row as { id?: string }).id
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(row)
  }

  merged.sort((a, b) => {
    const aTime = new Date((a as { created_at?: string }).created_at || 0).getTime()
    const bTime = new Date((b as { created_at?: string }).created_at || 0).getTime()
    return bTime - aTime
  })

  return merged
}
