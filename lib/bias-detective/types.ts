export const BIAS_DETECTIVE_ACTIVITY_ID = 'bias-detective' as const

export type BiasDetectiveLearnSlide = {
  emoji: string
  title: string
  content: string
  tip: string
}

export type BiasDetectiveLearn = {
  title: string
  slides: BiasDetectiveLearnSlide[]
}

export type BiasDetectiveQuizQuestion = {
  q: string
  options: string[]
  correct: number
  explanation: string
}

export type BiasDetectiveQuiz = {
  title: string
  questions: BiasDetectiveQuizQuestion[]
}

export type BiasDetectiveScenarioChoice = {
  text: string
  score: number
  feedback: string
}

export type BiasDetectiveScenario = {
  title: string
  text: string
  choices: BiasDetectiveScenarioChoice[]
}

export type BiasDetectiveScenarios = {
  title: string
  scenarios: BiasDetectiveScenario[]
}

export type BiasDetectiveMatchingPair = {
  bias: string
  example: string
}

export type BiasDetectiveMatching = {
  title: string
  pairs: BiasDetectiveMatchingPair[]
}

export type BiasDetectiveDetectiveClue = {
  text: string
  bias: string
}

export type BiasDetectiveDetectiveCase = {
  title: string
  text: string
  clues: BiasDetectiveDetectiveClue[]
}

export type BiasDetectiveDetective = {
  title: string
  cases: BiasDetectiveDetectiveCase[]
}

export type BiasDetectiveSpeedQuestion = {
  text: string
  bias: string
  options: string[]
}

export type BiasDetectiveSpeed = {
  title: string
  questions: BiasDetectiveSpeedQuestion[]
}

export type BiasDetectiveGameData = {
  learn: BiasDetectiveLearn
  quiz: BiasDetectiveQuiz
  scenarios: BiasDetectiveScenarios
  matching: BiasDetectiveMatching
  detective: BiasDetectiveDetective
  speed: BiasDetectiveSpeed
}

export type BiasQuestionSetSummary = {
  id: string
  title: string
  description: string | null
  question_count: number
  created_at: string
  updated_at: string
}

export type BiasDetectiveLaunchConfig = {
  type: 'bias-detective'
  questionSetId: 'default' | string
  title?: string
  content?: BiasDetectiveGameData
}

export const BIAS_DETECTIVE_SECTION_KEYS = [
  'learn',
  'quiz',
  'scenarios',
  'matching',
  'detective',
  'speed',
] as const
