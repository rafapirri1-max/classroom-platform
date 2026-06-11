import type { BiasDetectiveGameData, BiasDetectiveLaunchConfig } from './types'

export function buildBiasDetectiveLaunchConfig(
  questionSetId: 'default' | string,
  options?: { title?: string; content?: BiasDetectiveGameData }
): BiasDetectiveLaunchConfig {
  if (questionSetId === 'default') {
    return { type: 'bias-detective', questionSetId: 'default', title: options?.title }
  }
  return {
    type: 'bias-detective',
    questionSetId,
    title: options?.title,
    content: options?.content,
  }
}

export function parseBiasDetectiveLaunchConfig(raw: unknown): BiasDetectiveLaunchConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as BiasDetectiveLaunchConfig
  if (value.type !== 'bias-detective') return null
  if (value.questionSetId !== 'default' && typeof value.questionSetId !== 'string') return null
  return value
}
