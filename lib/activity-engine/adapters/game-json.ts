import {
  ANALYTICS_PROFILE,
  DEFAULT_ACTIVITY_TYPE,
  DEFAULT_ACTIVITY_VERSION,
  DEFAULT_RELAUNCH_POLICY,
  DEFAULT_RUNTIME_HANDLER,
} from '../schema'
import type { ActivityDefinition, GameJsonLegacy } from '../types'
import { isValidActivityDefinition } from '../validate'

export function gameJsonToActivityDefinition(
  game: GameJsonLegacy,
  sourcePath: string
): ActivityDefinition | null {
  const id = game.id
  const trackable = game.tracking !== false

  const definition: ActivityDefinition = {
    id,
    type: game.type ?? DEFAULT_ACTIVITY_TYPE,
    version: game.version ?? DEFAULT_ACTIVITY_VERSION,
    display: {
      name: game.name,
      icon: game.icon,
      description: game.description,
      difficulty: game.difficulty,
      durationLabel: game.duration,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
    },
    runtime: {
      handler: DEFAULT_RUNTIME_HANDLER,
      entryPath: `/games/${id}/index.html`,
      relaunchPolicy: DEFAULT_RELAUNCH_POLICY,
    },
    analytics: {
      profile: trackable ? ANALYTICS_PROFILE.SCORED_ASSESSMENT : ANALYTICS_PROFILE.PRESENCE_ONLY,
      trackable,
    },
    source: {
      kind: 'builtin',
      path: sourcePath,
    },
    config: buildConfigPassthrough(game),
  }

  return isValidActivityDefinition(definition) ? definition : null
}

function buildConfigPassthrough(game: GameJsonLegacy): Record<string, unknown> {
  const known = new Set([
    'id',
    'name',
    'icon',
    'description',
    'difficulty',
    'minPlayers',
    'maxPlayers',
    'duration',
    'tracking',
    'type',
    'version',
  ])
  const config: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(game)) {
    if (!known.has(key)) config[key] = value
  }
  return config
}

/** Map definition to legacy GameConfig for /api/games compatibility. */
export function activityToLaunchCard(def: ActivityDefinition) {
  return {
    id: def.id,
    name: def.display.name,
    icon: def.display.icon,
    description: def.display.description,
    difficulty: def.display.difficulty ?? 'medium',
  }
}
