/** Analytics scope: class-wide (default), one room, or the room's active launch. */
export type AnalyticsScopeFilter = 'all' | 'room' | 'launch'

export type ScopeFilterInput = {
  scope: AnalyticsScopeFilter
  roomId?: string | null
  /** rooms.active_activity_instance_id for the selected room (Current Launch only). */
  activeInstanceId?: string | null
}

export function filterSessionsByScope<
  T extends { room_id?: string | null; activity_instance_id?: string | null },
>(sessions: T[], options: ScopeFilterInput): T[] {
  const { scope, roomId, activeInstanceId } = options

  if (scope === 'all') return sessions

  if (scope === 'room') {
    if (!roomId) return []
    return sessions.filter((s) => s.room_id === roomId)
  }

  if (scope === 'launch') {
    if (!activeInstanceId) return []
    return sessions.filter((s) => s.activity_instance_id === activeInstanceId)
  }

  return sessions
}

export function filterAnswersBySessionIds<T extends { session_id: string }>(
  answers: T[],
  sessionIds: Set<string> | string[]
): T[] {
  const idSet = sessionIds instanceof Set ? sessionIds : new Set(sessionIds)
  return answers.filter((a) => idSet.has(a.session_id))
}

export function resolveActiveInstanceId(
  room: { active_activity_instance_id?: string | null } | undefined
): string | null {
  return room?.active_activity_instance_id ?? null
}
