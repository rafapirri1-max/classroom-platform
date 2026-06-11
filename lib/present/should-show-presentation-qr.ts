/** Read-only presentation activities where students may still need to join. */
const STANDBY_JOIN_ACTIVITIES = new Set(['waiting', 'bias-detective', 'discussion'])

export function shouldShowPresentationQr(
  currentActivity: string | null | undefined,
  roomStatus: string
): boolean {
  if (roomStatus !== 'active') return false
  const activity = currentActivity ?? 'waiting'
  return STANDBY_JOIN_ACTIVITIES.has(activity)
}
