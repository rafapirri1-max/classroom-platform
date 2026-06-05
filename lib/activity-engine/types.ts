/** Platform handler families (extend when adding new activity kinds). */
export type ActivityType = 'game'

/** How the student shell mounts the activity. Engine v1: iframe only for built-in games. */
export type RuntimeHandler = 'iframe'

export type ActivityDifficulty = 'easy' | 'medium' | 'hard'

/** Analytics aggregation family (metadata in v1; drives profiles in later engines). */
export type AnalyticsProfileId =
  | 'scored-assessment'
  | 'presence-only'

export type ActivityRelaunchPolicy = 'teacher_controlled'

export type ActivityDefinitionSource = {
  kind: 'builtin'
  /** Repo-relative path to the authoring file, e.g. public/games/bias-detective/game.json */
  path: string
}

export type ActivityDefinitionDisplay = {
  name: string
  icon: string
  description: string
  difficulty?: ActivityDifficulty
  durationLabel?: string
  minPlayers?: number
  maxPlayers?: number
}

export type ActivityDefinitionRuntime = {
  handler: RuntimeHandler
  /** Public URL path served by Next static files, e.g. /games/bias-detective/index.html */
  entryPath: string
  relaunchPolicy: ActivityRelaunchPolicy
}

export type ActivityDefinitionAnalytics = {
  profile: AnalyticsProfileId
  trackable: boolean
}

/**
 * Canonical in-memory activity definition (Engine v1).
 * - id: stable activity_id (equals game.json id and game_sessions.game_type today)
 * - type: activity_type (handler family)
 * - version: activity_version (default 1.0.0 until content versioning ships)
 */
export type ActivityDefinition = {
  id: string
  type: ActivityType
  version: string
  display: ActivityDefinitionDisplay
  runtime: ActivityDefinitionRuntime
  analytics: ActivityDefinitionAnalytics
  source: ActivityDefinitionSource
  /** Passthrough of extra game.json fields for forward compatibility */
  config: Record<string, unknown>
}

/** Legacy authoring shape for each folder under public/games (game.json). */
export type GameJsonLegacy = {
  id: string
  name: string
  icon: string
  description: string
  difficulty?: ActivityDifficulty
  minPlayers?: number
  maxPlayers?: number
  duration?: string
  tracking?: boolean
  type?: ActivityType
  version?: string
}

/** Subset returned to teacher launch UI (matches former GameConfig usage). */
export type ActivityLaunchCard = {
  id: string
  name: string
  icon: string
  description: string
  difficulty: string
}
