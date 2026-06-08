import { SESSION_STORAGE_PREFIX } from './constants'

type StoredRun = {
  sessionId: string
  /** False after end_session succeeds; open runs may be restored on refresh. */
  open: boolean
}

export function runStorageKey(
  roomId: string,
  activityId: string,
  activityInstanceId?: string | null
): string {
  const base = `${SESSION_STORAGE_PREFIX}:${roomId}:${activityId}`
  return activityInstanceId ? `${base}:${activityInstanceId}` : base
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
  activityId: string,
  activityInstanceId?: string | null
): string | null {
  if (typeof window === 'undefined') return null
  if (activityInstanceId) {
    const stored = parseStoredRun(
      sessionStorage.getItem(runStorageKey(roomId, activityId, activityInstanceId))
    )
    if (stored?.open) return stored.sessionId
  }
  const legacy = parseStoredRun(sessionStorage.getItem(runStorageKey(roomId, activityId)))
  return legacy?.open ? legacy.sessionId : null
}

export function writeStoredRunSessionId(
  roomId: string,
  activityId: string,
  sessionId: string,
  activityInstanceId?: string | null
): void {
  if (typeof window === 'undefined') return
  const payload: StoredRun = { sessionId, open: true }
  sessionStorage.setItem(
    runStorageKey(roomId, activityId, activityInstanceId),
    JSON.stringify(payload)
  )
}

export function markStoredRunCompleted(
  roomId: string,
  activityId: string,
  activityInstanceId?: string | null
): void {
  if (typeof window === 'undefined') return
  const keys = [
    runStorageKey(roomId, activityId, activityInstanceId),
    runStorageKey(roomId, activityId),
  ]
  for (const key of keys) {
    const stored = parseStoredRun(sessionStorage.getItem(key))
    if (!stored) continue
    sessionStorage.setItem(key, JSON.stringify({ ...stored, open: false }))
  }
}

export function clearStoredRun(
  roomId: string,
  activityId: string,
  activityInstanceId?: string | null
): void {
  if (typeof window === 'undefined') return
  const prefix = `${SESSION_STORAGE_PREFIX}:${roomId}:${activityId}`
  sessionStorage.removeItem(prefix)
  if (activityInstanceId) {
    sessionStorage.removeItem(`${prefix}:${activityInstanceId}`)
  }
  const keysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(`${prefix}:`)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key))
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
