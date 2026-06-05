import type { ActivityType, AnalyticsProfileId, RuntimeHandler } from './types'

export const DEFAULT_ACTIVITY_VERSION = '1.0.0'

export const DEFAULT_ACTIVITY_TYPE: ActivityType = 'game'

export const DEFAULT_RUNTIME_HANDLER: RuntimeHandler = 'iframe'

export const DEFAULT_RELAUNCH_POLICY = 'teacher_controlled' as const

export const ANALYTICS_PROFILE = {
  SCORED_ASSESSMENT: 'scored-assessment',
  PRESENCE_ONLY: 'presence-only',
} as const satisfies Record<string, AnalyticsProfileId>

export const BUILTIN_GAMES_DIR = ['public', 'games'] as const
