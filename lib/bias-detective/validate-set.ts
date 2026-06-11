import { countBiasDetectiveQuestions } from './question-count'
import {
  BIAS_DETECTIVE_SECTION_KEYS,
  type BiasDetectiveGameData,
} from './types'

export type BiasSetValidationResult =
  | { ok: true; content: BiasDetectiveGameData; questionCount: number }
  | { ok: false; error: string }

function isNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${field} must be a non-empty string`
  }
  return null
}

function validateLearnSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'learn section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'learn.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.slides) || section.slides.length === 0) {
    return 'learn.slides must be a non-empty array'
  }
  for (let i = 0; i < section.slides.length; i++) {
    const slide = section.slides[i] as Record<string, unknown>
    for (const key of ['emoji', 'title', 'content', 'tip'] as const) {
      const err = isNonEmptyString(slide[key], `learn.slides[${i}].${key}`)
      if (err) return err
    }
  }
  return null
}

function validateQuizSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'quiz section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'quiz.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.questions) || section.questions.length === 0) {
    return 'quiz.questions must be a non-empty array'
  }
  for (let i = 0; i < section.questions.length; i++) {
    const q = section.questions[i] as Record<string, unknown>
    const qErr = isNonEmptyString(q.q, `quiz.questions[${i}].q`)
    if (qErr) return qErr
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `quiz.questions[${i}].options must have at least 2 options`
    }
    for (let j = 0; j < q.options.length; j++) {
      const optErr = isNonEmptyString(q.options[j], `quiz.questions[${i}].options[${j}]`)
      if (optErr) return optErr
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
      return `quiz.questions[${i}].correct must be a valid option index`
    }
    const expErr = isNonEmptyString(q.explanation, `quiz.questions[${i}].explanation`)
    if (expErr) return expErr
  }
  return null
}

function validateScenariosSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'scenarios section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'scenarios.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.scenarios) || section.scenarios.length === 0) {
    return 'scenarios.scenarios must be a non-empty array'
  }
  for (let i = 0; i < section.scenarios.length; i++) {
    const s = section.scenarios[i] as Record<string, unknown>
    for (const key of ['title', 'text'] as const) {
      const err = isNonEmptyString(s[key], `scenarios.scenarios[${i}].${key}`)
      if (err) return err
    }
    if (!Array.isArray(s.choices) || s.choices.length < 2) {
      return `scenarios.scenarios[${i}].choices must have at least 2 choices`
    }
    for (let j = 0; j < s.choices.length; j++) {
      const c = s.choices[j] as Record<string, unknown>
      const textErr = isNonEmptyString(c.text, `scenarios.scenarios[${i}].choices[${j}].text`)
      if (textErr) return textErr
      if (typeof c.score !== 'number') {
        return `scenarios.scenarios[${i}].choices[${j}].score must be a number`
      }
      const fbErr = isNonEmptyString(c.feedback, `scenarios.scenarios[${i}].choices[${j}].feedback`)
      if (fbErr) return fbErr
    }
  }
  return null
}

function validateMatchingSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'matching section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'matching.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.pairs) || section.pairs.length === 0) {
    return 'matching.pairs must be a non-empty array'
  }
  for (let i = 0; i < section.pairs.length; i++) {
    const p = section.pairs[i] as Record<string, unknown>
    for (const key of ['bias', 'example'] as const) {
      const err = isNonEmptyString(p[key], `matching.pairs[${i}].${key}`)
      if (err) return err
    }
  }
  return null
}

function validateDetectiveSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'detective section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'detective.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.cases) || section.cases.length === 0) {
    return 'detective.cases must be a non-empty array'
  }
  for (let i = 0; i < section.cases.length; i++) {
    const c = section.cases[i] as Record<string, unknown>
    for (const key of ['title', 'text'] as const) {
      const err = isNonEmptyString(c[key], `detective.cases[${i}].${key}`)
      if (err) return err
    }
    if (!Array.isArray(c.clues) || c.clues.length === 0) {
      return `detective.cases[${i}].clues must be a non-empty array`
    }
    for (let j = 0; j < c.clues.length; j++) {
      const clue = c.clues[j] as Record<string, unknown>
      for (const key of ['text', 'bias'] as const) {
        const err = isNonEmptyString(clue[key], `detective.cases[${i}].clues[${j}].${key}`)
        if (err) return err
      }
    }
  }
  return null
}

function validateSpeedSection(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'speed section is required'
  const section = value as Record<string, unknown>
  const titleErr = isNonEmptyString(section.title, 'speed.title')
  if (titleErr) return titleErr
  if (!Array.isArray(section.questions) || section.questions.length === 0) {
    return 'speed.questions must be a non-empty array'
  }
  for (let i = 0; i < section.questions.length; i++) {
    const q = section.questions[i] as Record<string, unknown>
    const textErr = isNonEmptyString(q.text, `speed.questions[${i}].text`)
    if (textErr) return textErr
    const biasErr = isNonEmptyString(q.bias, `speed.questions[${i}].bias`)
    if (biasErr) return biasErr
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `speed.questions[${i}].options must have at least 2 options`
    }
    for (let j = 0; j < q.options.length; j++) {
      const optErr = isNonEmptyString(q.options[j], `speed.questions[${i}].options[${j}]`)
      if (optErr) return optErr
    }
    if (!q.options.includes(q.bias)) {
      return `speed.questions[${i}].bias must match one of the options`
    }
  }
  return null
}

const SECTION_VALIDATORS: Record<(typeof BIAS_DETECTIVE_SECTION_KEYS)[number], (v: unknown) => string | null> = {
  learn: validateLearnSection,
  quiz: validateQuizSection,
  scenarios: validateScenariosSection,
  matching: validateMatchingSection,
  detective: validateDetectiveSection,
  speed: validateSpeedSection,
}

export function validateBiasDetectiveSet(raw: unknown): BiasSetValidationResult {
  if (raw === null || raw === undefined) {
    return { ok: false, error: 'Question set cannot be empty' }
  }

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Invalid JSON — check commas, quotes, and brackets' }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Question set must be a JSON object' }
  }

  const root = parsed as Record<string, unknown>
  for (const key of BIAS_DETECTIVE_SECTION_KEYS) {
    if (!(key in root)) {
      return { ok: false, error: `Missing required section: ${key}` }
    }
    const sectionError = SECTION_VALIDATORS[key](root[key])
    if (sectionError) {
      return { ok: false, error: sectionError }
    }
  }

  const extraKeys = Object.keys(root).filter(
    (k) => !BIAS_DETECTIVE_SECTION_KEYS.includes(k as (typeof BIAS_DETECTIVE_SECTION_KEYS)[number])
  )
  if (extraKeys.length > 0) {
    return {
      ok: false,
      error: `Unexpected top-level keys: ${extraKeys.join(', ')}. Only ${BIAS_DETECTIVE_SECTION_KEYS.join(', ')} are allowed`,
    }
  }

  const content = parsed as BiasDetectiveGameData
  const questionCount = countBiasDetectiveQuestions(content)
  if (questionCount === 0) {
    return { ok: false, error: 'Question set must include at least one quiz, scenario, matching, detective, or speed item' }
  }

  return { ok: true, content, questionCount }
}

export function validateQuestionSetTitle(title: string): { ok: true; title: string } | { ok: false; error: string } {
  const trimmed = title.trim()
  if (trimmed.length < 1) {
    return { ok: false, error: 'Title is required' }
  }
  if (trimmed.length > 120) {
    return { ok: false, error: 'Title must be 120 characters or less' }
  }
  return { ok: true, title: trimmed }
}
