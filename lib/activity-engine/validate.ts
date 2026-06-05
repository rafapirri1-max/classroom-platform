import type { ActivityDefinition, ActivityDifficulty, GameJsonLegacy } from './types'

const DIFFICULTIES: ActivityDifficulty[] = ['easy', 'medium', 'hard']

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isDifficulty(value: unknown): value is ActivityDifficulty {
  return typeof value === 'string' && DIFFICULTIES.includes(value as ActivityDifficulty)
}

/** Validate and normalize raw game.json object. Returns null if invalid. */
export function parseGameJson(raw: unknown, folderName: string): GameJsonLegacy | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const id = isNonEmptyString(o.id) ? o.id.trim() : folderName
  if (!isNonEmptyString(id)) return null
  if (!isNonEmptyString(o.name)) return null
  if (!isNonEmptyString(o.icon)) return null
  if (!isNonEmptyString(o.description)) return null

  const result: GameJsonLegacy = {
    id,
    name: o.name.trim(),
    icon: o.icon.trim(),
    description: o.description.trim(),
  }

  if (o.difficulty !== undefined) {
    if (!isDifficulty(o.difficulty)) return null
    result.difficulty = o.difficulty
  }
  if (o.minPlayers !== undefined) {
    if (typeof o.minPlayers !== 'number' || o.minPlayers < 0) return null
    result.minPlayers = o.minPlayers
  }
  if (o.maxPlayers !== undefined) {
    if (typeof o.maxPlayers !== 'number' || o.maxPlayers < 0) return null
    result.maxPlayers = o.maxPlayers
  }
  if (o.duration !== undefined) {
    if (!isNonEmptyString(o.duration)) return null
    result.duration = o.duration.trim()
  }
  if (o.tracking !== undefined) {
    if (typeof o.tracking !== 'boolean') return null
    result.tracking = o.tracking
  }
  if (o.type !== undefined && o.type !== 'game') return null
  if (o.type === 'game') result.type = 'game'
  if (o.version !== undefined) {
    if (!isNonEmptyString(o.version)) return null
    result.version = o.version.trim()
  }

  if (folderName !== id) {
    console.warn(
      `[activity-engine] game.json id "${id}" does not match folder "${folderName}"; using json id`
    )
  }

  return result
}

/** Lightweight sanity check on a fully built definition before serving from API. */
export function isValidActivityDefinition(def: ActivityDefinition): boolean {
  return (
    isNonEmptyString(def.id) &&
    def.type === 'game' &&
    isNonEmptyString(def.version) &&
    isNonEmptyString(def.display.name) &&
    isNonEmptyString(def.runtime.entryPath) &&
    def.runtime.entryPath.startsWith('/games/')
  )
}
