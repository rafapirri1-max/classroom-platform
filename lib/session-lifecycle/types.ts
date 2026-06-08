export type GameSessionRow = {
  id: string
  student_id: string
  game_type?: string
  mode?: string
  completed?: boolean | null
  score?: number | null
  accuracy_percent?: number | null
  time_spent_seconds?: number | null
  raw_data?: unknown
  room_id?: string | null
  created_at: string
  students?: { name?: string; email?: string } | null
}

export type QuestionAttemptRow = {
  id?: string
  session_id: string
  question_text?: string
  student_answer?: string
  correct_answer?: string
  is_correct?: boolean
  time_taken_ms?: number
  created_at?: string
  game_sessions?: { student_id?: string; students?: { name?: string } }
}

export type DateFilter = 'all' | 'week' | 'month' | 'term'

export type StudentPerformanceRow = {
  id: string
  name: string
  sessions: GameSessionRow[]
  totalScore: number
  totalAccuracy: number
  count: number
  firstSession: string
  lastSession: string
  avgScore: number
  avgAccuracy: number
  improvement: number
}

export type MissedQuestionRow = {
  text: string
  total: number
  correct: number
  accuracy: number
  missed: number
}

export type ClassAnalyticsMetrics = {
  filteredSessions: GameSessionRow[]
  completedSessions: GameSessionRow[]
  unfinishedSessions: GameSessionRow[]
  studentScores: Record<string, Omit<StudentPerformanceRow, 'avgScore' | 'avgAccuracy' | 'improvement'>>
  studentList: StudentPerformanceRow[]
  classAvgScore: number
  classAvgAccuracy: number
  missedQuestions: MissedQuestionRow[]
  filteredAnswers: QuestionAttemptRow[]
}
