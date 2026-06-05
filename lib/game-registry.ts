import { getActivityById, getAllActivities } from '@/lib/activity-engine'
import type { GameJsonLegacy } from '@/lib/activity-engine/types'

/** @deprecated Use ActivityDefinition from @/lib/activity-engine. Kept for /api/games compatibility. */
export interface GameConfig {
  id: string
  name: string
  icon: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  minPlayers: number
  maxPlayers: number
  duration: string
  tracking: boolean
}

function definitionToGameConfig(def: Awaited<ReturnType<typeof getAllActivities>>[number]): GameConfig {
  return {
    id: def.id,
    name: def.display.name,
    icon: def.display.icon,
    description: def.display.description,
    difficulty: def.display.difficulty ?? 'medium',
    minPlayers: def.display.minPlayers ?? 1,
    maxPlayers: def.display.maxPlayers ?? 50,
    duration: def.display.durationLabel ?? '',
    tracking: def.analytics.trackable,
  }
}

export async function getAllGames(): Promise<GameConfig[]> {
  const activities = await getAllActivities()
  return activities.map(definitionToGameConfig)
}

export async function getGameById(id: string): Promise<GameConfig | null> {
  const def = await getActivityById(id)
  return def ? definitionToGameConfig(def) : null
}

export type { GameJsonLegacy }
