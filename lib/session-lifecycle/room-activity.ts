import { isTrackableActivity } from './trackable'

/**
 * Whether a room UPDATE should start a new tracked run (e.g. waiting → activity, or switch activity).
 * Ignores initial subscribe when prevActivity is undefined to avoid duplicating join handling.
 */
export function shouldStartRunFromRoomUpdate(
  prevActivity: string | null | undefined,
  nextActivity: string | null | undefined,
  /** When false, same-activity UPDATE may mean teacher relaunch (payload.old missed waiting). */
  priorRunOpen = true
): boolean {
  if (!isTrackableActivity(nextActivity)) return false
  if (prevActivity === 'waiting') return true
  if (prevActivity === nextActivity && !priorRunOpen) return true
  if (isTrackableActivity(prevActivity) && prevActivity !== nextActivity) return true
  return false
}
