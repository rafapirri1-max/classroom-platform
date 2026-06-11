/** Room activity ids that do not create game_sessions runs (not activity-specific). */
const NON_TRACKABLE_ACTIVITIES = new Set(['waiting', 'poll', 'wordcloud', 'discussion'])

/** Whether room.current_activity should start/reuse a tracked run. */
export function isTrackableActivity(activityId: string | null | undefined): boolean {
  if (!activityId) return false
  return !NON_TRACKABLE_ACTIVITIES.has(activityId)
}
