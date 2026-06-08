import type { PollLaunchConfig, PollOption } from './types'

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

export function buildPollLaunchConfig(
  question: string,
  optionLabels: string[]
): PollLaunchConfig {
  const trimmedQuestion = question.trim()
  const options: PollOption[] = optionLabels
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .slice(0, OPTION_IDS.length)
    .map((label, index) => ({
      id: OPTION_IDS[index],
      label,
    }))

  return {
    type: 'poll',
    question: trimmedQuestion,
    options,
    allowMultiple: false,
  }
}

export function validatePollLaunchInput(
  question: string,
  optionLabels: string[]
): { ok: true; config: PollLaunchConfig } | { ok: false; error: string } {
  const trimmedQuestion = question.trim()
  if (trimmedQuestion.length < 1) {
    return { ok: false, error: 'Question is required' }
  }
  if (trimmedQuestion.length > 500) {
    return { ok: false, error: 'Question must be 500 characters or less' }
  }

  const nonEmpty = optionLabels.map((l) => l.trim()).filter((l) => l.length > 0)
  if (nonEmpty.length < 2) {
    return { ok: false, error: 'At least two options are required' }
  }
  if (nonEmpty.length > OPTION_IDS.length) {
    return { ok: false, error: `At most ${OPTION_IDS.length} options are allowed` }
  }

  for (const label of nonEmpty) {
    if (label.length > 200) {
      return { ok: false, error: 'Each option must be 200 characters or less' }
    }
  }

  return { ok: true, config: buildPollLaunchConfig(trimmedQuestion, nonEmpty) }
}

export function parsePollLaunchConfig(raw: unknown): PollLaunchConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as PollLaunchConfig
  if (value.type !== 'poll' || typeof value.question !== 'string') return null
  if (!Array.isArray(value.options) || value.options.length < 2) return null
  for (const opt of value.options) {
    if (!opt?.id || !opt?.label) return null
  }
  return value
}
