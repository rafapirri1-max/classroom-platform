import { promises as fs } from 'fs'
import { join } from 'path'
import { gameJsonToActivityDefinition } from '../adapters/game-json'
import { BUILTIN_GAMES_DIR } from '../schema'
import type { ActivityDefinition } from '../types'
import { parseGameJson } from '../validate'

export async function loadBuiltinGameDefinitions(): Promise<ActivityDefinition[]> {
  const gamesDir = join(process.cwd(), ...BUILTIN_GAMES_DIR)
  const definitions: ActivityDefinition[] = []

  let entries: { name: string; isDirectory: () => boolean }[]
  try {
    entries = await fs.readdir(gamesDir, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderName = entry.name
    const sourcePath = join(...BUILTIN_GAMES_DIR, folderName, 'game.json').replace(/\\/g, '/')

    try {
      const configPath = join(gamesDir, folderName, 'game.json')
      const raw = JSON.parse(await fs.readFile(configPath, 'utf-8'))
      const gameJson = parseGameJson(raw, folderName)
      if (!gameJson) {
        console.warn(`[activity-engine] Skipping invalid game.json in ${folderName}`)
        continue
      }

      const definition = gameJsonToActivityDefinition(gameJson, sourcePath)
      if (!definition) {
        console.warn(`[activity-engine] Skipping invalid activity definition in ${folderName}`)
        continue
      }

      definitions.push(definition)
    } catch (err) {
      console.warn(`[activity-engine] Failed to load ${folderName}:`, err)
    }
  }

  definitions.sort((a, b) => a.display.name.localeCompare(b.display.name))
  return definitions
}
