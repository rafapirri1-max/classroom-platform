import { SESSION_STORAGE_PREFIX } from './constants'

type StoredRun = {
  sessionId: string
  /** False after end_session succeeds; open runs may be restored on refresh. */
  open: boolean
}

export function runStorageKey(roomId: string, activityId: string): string {
  return `${SESSION_STORAGE_PREFIX}:${roomId}:${activityId}`
}

function parseStoredRun(raw: string | null): StoredRun | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredRun
    if (parsed?.sessionId && typeof parsed.open === 'boolean') return parsed
  } catch {
    // Legacy plain session id string
    if (raw.length > 0) return { sessionId: raw, open: true }
  }
  return null
}

/** Open (incomplete) run only — never restore a completed attempt from storage. */
export function readOpenStoredRunSessionId(
  roomId: string,
  activityId: string
): string | null {
  if (typeof window === 'undefined') return null
  const stored = parseStoredRun(sessionStorage.getItem(runStorageKey(roomId, activityId)))
  return stored?.open ? stored.sessionId : null
}

export function writeStoredRunSessionId(
  roomId: string,
  activityId: string,
  sessionId: string
): void {
  if (typeof window === 'undefined') return
  const payload: StoredRun = { sessionId, open: true }
  sessionStorage.setItem(runStorageKey(roomId, activityId), JSON.stringify(payload))
}

export function markStoredRunCompleted(roomId: string, activityId: string): void {
  if (typeof window === 'undefined') return
  const key = runStorageKey(roomId, activityId)
  const stored = parseStoredRun(sessionStorage.getItem(key))
  if (!stored) return
  sessionStorage.setItem(key, JSON.stringify({ ...stored, open: false }))
}

export function clearStoredRun(roomId: string, activityId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(runStorageKey(roomId, activityId))
}

export function clearStoredRunsForRoom(roomId: string): void {
  if (typeof window === 'undefined') return
  const prefix = `${SESSION_STORAGE_PREFIX}:${roomId}:`
  const keysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(prefix)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key))
}
