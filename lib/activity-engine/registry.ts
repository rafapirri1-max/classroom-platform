import { loadBuiltinGameDefinitions } from './loaders/builtin-games'
import type { ActivityDefinition } from './types'

let cachedActivities: ActivityDefinition[] | null = null

async function loadAll(): Promise<ActivityDefinition[]> {
  if (cachedActivities) return cachedActivities
  cachedActivities = await loadBuiltinGameDefinitions()
  return cachedActivities
}

/** Clear in-memory cache (tests / dev only). */
export function clearActivityRegistryCache(): void {
  cachedActivities = null
}

export async function getAllActivities(): Promise<ActivityDefinition[]> {
  return loadAll()
}

export async function getActivityById(id: string): Promise<ActivityDefinition | null> {
  const activities = await loadAll()
  return activities.find((a) => a.id === id) ?? null
}
