import { promises as fs } from 'fs'
import { join } from 'path'

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

export async function getAllGames(): Promise<GameConfig[]> {
  try {
    const gamesDir = join(process.cwd(), 'app', 'games')
    const entries = await fs.readdir(gamesDir, { withFileTypes: true })
    const games: GameConfig[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const configPath = join(gamesDir, entry.name, 'game.json')
          const configData = await fs.readFile(configPath, 'utf-8')
          const config = JSON.parse(configData)
          games.push(config)
        } catch {
          // Skip invalid game folders
        }
      }
    }

    return games
  } catch {
    return []
  }
}

export async function getGameById(id: string): Promise<GameConfig | null> {
  const games = await getAllGames()
  return games.find(g => g.id === id) || null
}
