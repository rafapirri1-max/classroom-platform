import { DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH, type WordCloudLaunchConfig, type WordCloudPhase } from './types'

const PHASES: WordCloudPhase[] = ['collecting', 'revealed']

export function buildWordCloudLaunchConfig(question: string): WordCloudLaunchConfig {
  return {
    type: 'wordcloud',
    question: question.trim(),
    phase: 'collecting',
    maxAnswerLength: DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH,
  }
}

export function validateWordCloudLaunchInput(
  question: string
): { ok: true; config: WordCloudLaunchConfig } | { ok: false; error: string } {
  const trimmed = question.trim()
  if (trimmed.length < 1) {
    return { ok: false, error: 'Question is required' }
  }
  if (trimmed.length > 500) {
    return { ok: false, error: 'Question must be 500 characters or less' }
  }

  return { ok: true, config: buildWordCloudLaunchConfig(trimmed) }
}

export function parseWordCloudLaunchConfig(raw: unknown): WordCloudLaunchConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as WordCloudLaunchConfig
  if (value.type !== 'wordcloud' || typeof value.question !== 'string') return null

  const phase =
    typeof value.phase === 'string' && PHASES.includes(value.phase as WordCloudPhase)
      ? (value.phase as WordCloudPhase)
      : 'collecting'

  const maxAnswerLength =
    typeof value.maxAnswerLength === 'number' && value.maxAnswerLength > 0
      ? Math.min(value.maxAnswerLength, 120)
      : DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH

  return {
    type: 'wordcloud',
    question: value.question,
    phase,
    maxAnswerLength,
  }
}

export function mergeWordCloudLaunchConfigPhase(
  existing: unknown,
  phase: WordCloudPhase
): WordCloudLaunchConfig | null {
  const parsed = parseWordCloudLaunchConfig(existing)
  if (!parsed) return null
  return { ...parsed, phase }
}
