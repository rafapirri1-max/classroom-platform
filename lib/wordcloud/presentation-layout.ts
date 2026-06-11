import type { WordCloudAggregateWord, WordCloudPlacedWord } from './types'

export const WORD_CLOUD_PALETTE = [
  '#22d3ee', // cyan
  '#38bdf8', // sky
  '#34d399', // emerald
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#fb7185', // rose
  '#a3e635', // lime
] as const

const CORE_X_MIN = 30
const CORE_X_MAX = 70
const CORE_Y_MIN = 35
const CORE_Y_MAX = 75

const EXPANDED_X_MIN = 20
const EXPANDED_X_MAX = 80
const EXPANDED_Y_MIN = 25
const EXPANDED_Y_MAX = 80

/** First five words: fixed safe anchors around centre. */
const CORE_ANCHORS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 50, y: 50 },
  { x: 60, y: 50 },
  { x: 40, y: 50 },
  { x: 50, y: 62 },
  { x: 50, y: 40 },
]

/** Additional slots inside expanded bounds, spread outward from centre. */
const EXPANDED_ANCHORS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 35, y: 45 },
  { x: 65, y: 45 },
  { x: 35, y: 55 },
  { x: 65, y: 55 },
  { x: 30, y: 50 },
  { x: 70, y: 50 },
  { x: 50, y: 30 },
  { x: 50, y: 70 },
  { x: 40, y: 38 },
  { x: 60, y: 62 },
  { x: 38, y: 62 },
  { x: 62, y: 38 },
  { x: 28, y: 42 },
  { x: 72, y: 58 },
  { x: 25, y: 55 },
  { x: 75, y: 45 },
  { x: 45, y: 28 },
  { x: 55, y: 72 },
  { x: 22, y: 35 },
  { x: 78, y: 65 },
]

function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

function hashUnit(seed: string, salt: number): number {
  const hashed = hashString(`${seed}::${salt}`)
  return (hashed % 10000) / 10000
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function positionForIndex(index: number, text: string): { x: number; y: number } {
  if (index < CORE_ANCHORS.length) {
    return CORE_ANCHORS[index]
  }

  const expandedIndex = index - CORE_ANCHORS.length
  const slot = EXPANDED_ANCHORS[expandedIndex % EXPANDED_ANCHORS.length]
  const cycle = Math.floor(expandedIndex / EXPANDED_ANCHORS.length)

  // Small deterministic jitter per word, tightened on repeat cycles.
  const jitterScale = Math.max(2, 5 - cycle)
  const jitterX = (hashUnit(text, 1) - 0.5) * jitterScale
  const jitterY = (hashUnit(text, 2) - 0.5) * jitterScale

  return {
    x: clamp(slot.x + jitterX, EXPANDED_X_MIN, EXPANDED_X_MAX),
    y: clamp(slot.y + jitterY, EXPANDED_Y_MIN, EXPANDED_Y_MAX),
  }
}

function fontSizeForWord(
  count: number,
  maxCount: number,
  text: string,
  isCenter: boolean
): number {
  const min = isCenter ? 36 : 20
  const max = isCenter ? 72 : 48
  const ratio = maxCount > 0 ? count / maxCount : 1
  const jitter = (hashUnit(text, 3) - 0.5) * 4
  return Math.round(clamp(min + ratio * (max - min) + jitter, min, max))
}

export function layoutWordCloudWords(words: WordCloudAggregateWord[]): WordCloudPlacedWord[] {
  if (words.length === 0) return []

  const sorted = [...words].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
  const maxCount = sorted[0]?.count ?? 1

  return sorted.map((word, index) => {
    const isCenter = index === 0
    const { x, y } = positionForIndex(index, word.text)

    return {
      text: word.text,
      count: word.count,
      fontSize: fontSizeForWord(word.count, maxCount, word.text, isCenter),
      color: WORD_CLOUD_PALETTE[hashString(word.text) % WORD_CLOUD_PALETTE.length],
      left: clamp(x, isCenter ? CORE_X_MIN : EXPANDED_X_MIN, isCenter ? CORE_X_MAX : EXPANDED_X_MAX),
      top: clamp(y, isCenter ? CORE_Y_MIN : EXPANDED_Y_MIN, isCenter ? CORE_Y_MAX : EXPANDED_Y_MAX),
      rotation: isCenter ? 0 : (hashUnit(word.text, 4) - 0.5) * 30,
    }
  })
}

export function wordCloudLayoutKey(words: WordCloudAggregateWord[]): string {
  return words.map((word) => `${word.text}:${word.count}`).join('|')
}
