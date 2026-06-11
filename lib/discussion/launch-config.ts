import type { DiscussionLaunchConfig, DiscussionPhase } from './types'

const PHASES: DiscussionPhase[] = ['collecting', 'voting', 'results']

export function buildDiscussionLaunchConfig(
  question: string,
  anonymous = false
): DiscussionLaunchConfig {
  return {
    type: 'discussion',
    question: question.trim(),
    anonymous,
    selectedResponseId: null,
    phase: 'collecting',
  }
}

export function validateDiscussionLaunchInput(
  question: string,
  anonymous?: unknown
): { ok: true; config: DiscussionLaunchConfig } | { ok: false; error: string } {
  const trimmed = question.trim()
  if (trimmed.length < 1) {
    return { ok: false, error: 'Question is required' }
  }
  if (trimmed.length > 500) {
    return { ok: false, error: 'Question must be 500 characters or less' }
  }

  const isAnonymous = anonymous === true

  return { ok: true, config: buildDiscussionLaunchConfig(trimmed, isAnonymous) }
}

export function parseDiscussionLaunchConfig(raw: unknown): DiscussionLaunchConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as DiscussionLaunchConfig
  if (value.type !== 'discussion' || typeof value.question !== 'string') return null
  if (value.selectedResponseId !== null && typeof value.selectedResponseId !== 'string') {
    return null
  }
  const phase =
    typeof value.phase === 'string' && PHASES.includes(value.phase as DiscussionPhase)
      ? (value.phase as DiscussionPhase)
      : 'collecting'

  return {
    type: 'discussion',
    question: value.question,
    anonymous: value.anonymous === true,
    selectedResponseId: value.selectedResponseId ?? null,
    phase,
  }
}

export function mergeDiscussionLaunchConfigSelectedResponse(
  existing: unknown,
  selectedResponseId: string | null
): DiscussionLaunchConfig | null {
  const parsed = parseDiscussionLaunchConfig(existing)
  if (!parsed) return null
  return { ...parsed, selectedResponseId }
}

export function mergeDiscussionLaunchConfigPhase(
  existing: unknown,
  phase: DiscussionPhase
): DiscussionLaunchConfig | null {
  const parsed = parseDiscussionLaunchConfig(existing)
  if (!parsed) return null
  return { ...parsed, phase }
}
