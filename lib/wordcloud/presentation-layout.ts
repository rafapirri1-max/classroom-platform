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

function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * A measured box for a word, in pixels, centred at (cx, cy).
 */
type PlacedBox = {
  cx: number
  cy: number
  halfW: number
  halfH: number
}

function intersects(a: PlacedBox, b: PlacedBox, gap: number): boolean {
  return (
    Math.abs(a.cx - b.cx) < a.halfW + b.halfW + gap &&
    Math.abs(a.cy - b.cy) < a.halfH + b.halfH + gap
  )
}

/** Measures the rendered size of a word using a shared canvas context. */
function makeMeasurer(): (text: string, fontSize: number) => { width: number; height: number } {
  let ctx: CanvasRenderingContext2D | null = null
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d')
  }

  return (text: string, fontSize: number) => {
    if (ctx) {
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
      const metrics = ctx.measureText(text)
      // Width plus a little horizontal padding for the bold glyphs.
      const width = metrics.width + fontSize * 0.3
      // Canvas height metrics are unreliable across browsers; approximate.
      const height = fontSize * 1.25
      return { width, height }
    }
    // Fallback estimate when no DOM is available.
    return { width: text.length * fontSize * 0.58, height: fontSize * 1.25 }
  }
}

export type WordCloudLayoutOptions = {
  /** Container width in px. */
  width: number
  /** Container height in px. */
  height: number
}

/**
 * Lays out words with a size-aware Archimedean spiral so that:
 * - the highest-frequency word is centred,
 * - every other word spirals outward around it,
 * - no two words overlap,
 * - phrases stay intact (no wrapping / no rotation),
 * - all words fit inside the container (font is scaled down if needed).
 *
 * Returns positions as percentages of the container so they remain responsive.
 */
export function layoutWordCloudWords(
  words: WordCloudAggregateWord[],
  options?: WordCloudLayoutOptions
): WordCloudPlacedWord[] {
  if (words.length === 0) return []

  const width = options?.width ?? 1200
  const height = options?.height ?? 700
  const sorted = [...words].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
  const maxCount = sorted[0]?.count ?? 1
  const minCount = sorted[sorted.length - 1]?.count ?? 1

  const measure = makeMeasurer()
  const pad = Math.max(8, Math.min(width, height) * 0.02)

  // Base font sizes scale with the container so the cloud fills the screen.
  const baseMax = clamp(Math.min(width / 9, height / 6), 44, 130)
  const baseMin = clamp(baseMax * 0.32, 18, 46)

  // Try progressively smaller global scales until every word is placed.
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.pow(0.85, attempt)
    const placed: PlacedBox[] = []
    const result: WordCloudPlacedWord[] = []
    let success = true

    for (let index = 0; index < sorted.length; index++) {
      const word = sorted[index]
      const ratio = maxCount > minCount ? (word.count - minCount) / (maxCount - minCount) : 1
      const fontSize = Math.round((baseMin + ratio * (baseMax - baseMin)) * scale)
      const { width: w, height: h } = measure(word.text, fontSize)
      const halfW = w / 2
      const halfH = h / 2

      // If a single word is wider/taller than the container, this scale fails.
      if (w > width - pad * 2 || h > height - pad * 2) {
        success = false
        break
      }

      const box = placeWithSpiral({
        index,
        text: word.text,
        halfW,
        halfH,
        width,
        height,
        pad,
        placed,
      })

      if (!box) {
        success = false
        break
      }

      placed.push(box)
      result.push({
        text: word.text,
        count: word.count,
        fontSize,
        color: WORD_CLOUD_PALETTE[hashString(word.text) % WORD_CLOUD_PALETTE.length],
        left: (box.cx / width) * 100,
        top: (box.cy / height) * 100,
        rotation: 0,
      })
    }

    if (success) return result
  }

  // Extremely unlikely fallback: stack centred so nothing is lost.
  return sorted.map((word, index) => ({
    text: word.text,
    count: word.count,
    fontSize: baseMin,
    color: WORD_CLOUD_PALETTE[hashString(word.text) % WORD_CLOUD_PALETTE.length],
    left: 50,
    top: clamp(10 + (index * 80) / Math.max(1, sorted.length - 1), 6, 94),
    rotation: 0,
  }))
}

function placeWithSpiral(params: {
  index: number
  text: string
  halfW: number
  halfH: number
  width: number
  height: number
  pad: number
  placed: PlacedBox[]
}): PlacedBox | null {
  const { index, halfW, halfH, width, height, pad, placed } = params
  const centerX = width / 2
  const centerY = height / 2
  const gap = Math.max(4, Math.min(width, height) * 0.012)

  // The most frequent word goes dead centre.
  if (index === 0) {
    return { cx: centerX, cy: centerY, halfW, halfH }
  }

  // Archimedean spiral, slightly elliptical to match wide screens.
  const maxRadius = Math.hypot(width, height)
  const step = Math.max(2, Math.min(width, height) * 0.006)

  for (let t = 0; t < 4000; t++) {
    const angle = 0.35 * t
    const radius = step * angle
    if (radius > maxRadius) break

    const cx = centerX + Math.cos(angle) * radius * 1.35
    const cy = centerY + Math.sin(angle) * radius

    // Keep the whole box inside the container.
    if (
      cx - halfW < pad ||
      cx + halfW > width - pad ||
      cy - halfH < pad ||
      cy + halfH > height - pad
    ) {
      continue
    }

    const candidate: PlacedBox = { cx, cy, halfW, halfH }
    const collides = placed.some((box) => intersects(candidate, box, gap))
    if (!collides) {
      return candidate
    }
  }

  return null
}

export function wordCloudLayoutKey(words: WordCloudAggregateWord[]): string {
  return words.map((word) => `${word.text}:${word.count}`).join('|')
}
