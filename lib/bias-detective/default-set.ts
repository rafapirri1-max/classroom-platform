import type { BiasDetectiveGameData } from './types'
import builtinDefault from '@/public/games/bias-detective/default-set.json'

export const DEFAULT_BIAS_SET_TITLE = 'Built-in Default Set'

export function getBuiltinDefaultContent(): BiasDetectiveGameData {
  return builtinDefault as BiasDetectiveGameData
}
