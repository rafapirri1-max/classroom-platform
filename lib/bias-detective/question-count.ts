import type { BiasDetectiveGameData } from './types'

/** Count interactive items across quiz, scenarios, matching, detective, and speed sections. */
export function countBiasDetectiveQuestions(content: BiasDetectiveGameData): number {
  return (
    content.quiz.questions.length +
    content.scenarios.scenarios.length +
    content.matching.pairs.length +
    content.detective.cases.length +
    content.speed.questions.length
  )
}
