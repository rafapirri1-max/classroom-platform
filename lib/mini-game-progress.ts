export type MiniGameProgressEntry = {
  miniGameId: string
  miniGameName: string
  score: number
  accuracy: number
  timeSpent: number
  completedAt: string
}

export type HubProgressRawData = {
  activityId?: string
  requiredMiniGameIds?: string[]
  miniGames?: MiniGameProgressEntry[]
  hubCompletedAt?: string
}

function asHubRawData(value: unknown): HubProgressRawData {
  if (!value || typeof value !== 'object') return {}
  return value as HubProgressRawData
}

export function mergeHubMiniGameProgress(
  existing: unknown,
  update: {
    activityId?: string
    requiredMiniGameIds?: string[]
    miniGame: MiniGameProgressEntry
  }
): {
  raw_data: HubProgressRawData
  score: number
  accuracy_percent: number
  time_spent_seconds: number
} {
  const base = asHubRawData(existing)
  if (update.activityId) base.activityId = update.activityId
  if (update.requiredMiniGameIds) base.requiredMiniGameIds = update.requiredMiniGameIds

  const miniGames = [...(base.miniGames || [])]
  const index = miniGames.findIndex((m) => m.miniGameId === update.miniGame.miniGameId)
  if (index >= 0) miniGames[index] = update.miniGame
  else miniGames.push(update.miniGame)
  base.miniGames = miniGames

  const score = miniGames.reduce((sum, m) => sum + (m.score || 0), 0)
  const time_spent_seconds = miniGames.reduce((sum, m) => sum + (m.timeSpent || 0), 0)
  const accuracy_percent =
    miniGames.length > 0
      ? Math.round(miniGames.reduce((sum, m) => sum + (m.accuracy || 0), 0) / miniGames.length)
      : 0

  return { raw_data: base, score, accuracy_percent, time_spent_seconds }
}

export function finalizeHubRawData(
  existing: unknown,
  patch?: Partial<HubProgressRawData>
): HubProgressRawData {
  const base = asHubRawData(existing)
  return {
    ...base,
    ...patch,
    hubCompletedAt: new Date().toISOString(),
  }
}

export const DEFAULT_HUB_REQUIRED_MINI_GAME_IDS = [
  'quiz',
  'scenarios',
  'matching',
  'detective',
  'speed',
] as const

export type HubProgressSummary = {
  completedCount: number
  requiredCount: number
  progressLabel: string
  miniGames: MiniGameProgressEntry[]
  hasProgress: boolean
}

/** Read-only summary for teacher analytics dashboards. */
export function getHubProgressSummary(rawData: unknown): HubProgressSummary | null {
  const hub = asHubRawData(rawData)
  const miniGames = hub.miniGames || []
  const requiredIds =
    (hub.requiredMiniGameIds?.length ?? 0) > 0
      ? hub.requiredMiniGameIds!
      : [...DEFAULT_HUB_REQUIRED_MINI_GAME_IDS]

  if (miniGames.length === 0) return null

  const completedIds = new Set(miniGames.map((m) => m.miniGameId))
  const completedCount = requiredIds.filter((id) => completedIds.has(id)).length

  return {
    completedCount,
    requiredCount: requiredIds.length,
    progressLabel: `${completedCount}/${requiredIds.length} mini-games`,
    miniGames,
    hasProgress: true,
  }
}
