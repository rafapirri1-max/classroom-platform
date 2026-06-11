import { DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH } from './types'

export function normalizeWordCloudAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function validateWordCloudAnswer(
  text: string,
  maxLength = DEFAULT_WORDCLOUD_MAX_ANSWER_LENGTH
): { ok: true; answer: string; normalized: string } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (trimmed.length < 1) {
    return { ok: false, error: 'Answer cannot be empty' }
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: `Answer must be ${maxLength} characters or less` }
  }

  const normalized = normalizeWordCloudAnswer(trimmed)
  if (normalized.length < 1) {
    return { ok: false, error: 'Answer cannot be empty' }
  }

  return { ok: true, answer: trimmed, normalized }
}
