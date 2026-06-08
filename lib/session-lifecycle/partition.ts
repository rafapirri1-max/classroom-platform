import { isSessionCompleted } from './completed'
import type { GameSessionRow } from './types'

export function partitionSessions(sessions: GameSessionRow[]) {
  const completed: GameSessionRow[] = []
  const unfinished: GameSessionRow[] = []

  for (const session of sessions) {
    if (isSessionCompleted(session)) completed.push(session)
    else unfinished.push(session)
  }

  return { completed, unfinished }
}
