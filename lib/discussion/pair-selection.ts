export function canonicalPair(leftId: string, rightId: string): [string, string] {
  return leftId < rightId ? [leftId, rightId] : [rightId, leftId]
}

export function pairKey(leftId: string, rightId: string): string {
  const [a, b] = canonicalPair(leftId, rightId)
  return `${a}|${b}`
}

export type ComparisonPair = {
  displayLeftId: string
  displayRightId: string
  canonicalLeftId: string
  canonicalRightId: string
}

export function pickComparisonPair(
  responseIds: string[],
  completedPairKeys: Set<string>
): ComparisonPair | null {
  if (responseIds.length < 2) return null

  const allPairs: Array<[string, string]> = []
  for (let i = 0; i < responseIds.length; i++) {
    for (let j = i + 1; j < responseIds.length; j++) {
      allPairs.push(canonicalPair(responseIds[i], responseIds[j]))
    }
  }

  const unseen = allPairs.filter(([a, b]) => !completedPairKeys.has(pairKey(a, b)))
  const pool = unseen.length > 0 ? unseen : allPairs
  const [canonicalLeftId, canonicalRightId] = pool[Math.floor(Math.random() * pool.length)]

  if (Math.random() < 0.5) {
    return {
      displayLeftId: canonicalLeftId,
      displayRightId: canonicalRightId,
      canonicalLeftId,
      canonicalRightId,
    }
  }

  return {
    displayLeftId: canonicalRightId,
    displayRightId: canonicalLeftId,
    canonicalLeftId,
    canonicalRightId,
  }
}
