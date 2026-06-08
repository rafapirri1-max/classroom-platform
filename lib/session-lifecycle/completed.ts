import type { GameSessionRow } from './types'

/** Finished via end_session; null/false are treated as unfinished. */
export function isSessionCompleted(session: Pick<GameSessionRow, 'completed'>): boolean {
  return session.completed === true
}
