import { partitionSessions } from './partition'
import type {
  ClassAnalyticsMetrics,
  DateFilter,
  GameSessionRow,
  QuestionAttemptRow,
  StudentPerformanceRow,
} from './types'

export function filterSessionsByDate(
  sessions: GameSessionRow[],
  dateFilter: DateFilter
): GameSessionRow[] {
  if (dateFilter === 'all') return sessions

  const now = Date.now()
  const cutoffs: Record<Exclude<DateFilter, 'all'>, number> = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    term: 120 * 24 * 60 * 60 * 1000,
  }

  const ms = cutoffs[dateFilter]
  const threshold = new Date(now - ms)

  return sessions.filter((session) => new Date(session.created_at) >= threshold)
}

export function buildClassAnalyticsMetrics(options: {
  sessions: GameSessionRow[]
  answers: QuestionAttemptRow[]
  dateFilter: DateFilter
}): ClassAnalyticsMetrics {
  const filteredSessions = filterSessionsByDate(options.sessions, options.dateFilter)
  const { completed: completedSessions, unfinished: unfinishedSessions } =
    partitionSessions(filteredSessions)

  const studentScores = completedSessions.reduce<
    Record<string, Omit<StudentPerformanceRow, 'avgScore' | 'avgAccuracy' | 'improvement'>>
  >((acc, session) => {
    const studentId = session.student_id
    const studentName = session.students?.name || 'Unknown'
    if (!acc[studentId]) {
      acc[studentId] = {
        id: studentId,
        name: studentName,
        sessions: [],
        totalScore: 0,
        totalAccuracy: 0,
        count: 0,
        firstSession: session.created_at,
        lastSession: session.created_at,
      }
    }
    acc[studentId].sessions.push(session)
    acc[studentId].totalScore += session.score || 0
    acc[studentId].totalAccuracy += session.accuracy_percent || 0
    acc[studentId].count += 1
    if (new Date(session.created_at) < new Date(acc[studentId].firstSession)) {
      acc[studentId].firstSession = session.created_at
    }
    if (new Date(session.created_at) > new Date(acc[studentId].lastSession)) {
      acc[studentId].lastSession = session.created_at
    }
    return acc
  }, {})

  const studentList: StudentPerformanceRow[] = Object.values(studentScores).map((s) => ({
    ...s,
    avgScore: s.count > 0 ? Math.round(s.totalScore / s.count) : 0,
    avgAccuracy: s.count > 0 ? Math.round(s.totalAccuracy / s.count) : 0,
    improvement:
      s.count > 1
        ? Math.round(
            (s.sessions[0].score || 0) -
              (s.sessions[s.sessions.length - 1].score || 0)
          )
        : 0,
  }))

  const completedSessionIds = new Set(completedSessions.map((s) => s.id))
  const filteredAnswers = options.answers.filter((a) =>
    completedSessionIds.has(a.session_id)
  )

  const questionStats = filteredAnswers.reduce<
    Record<string, { text: string; total: number; correct: number }>
  >((acc, answer) => {
    const qText = answer.question_text?.substring(0, 80) || 'Unknown'
    if (!acc[qText]) acc[qText] = { text: qText, total: 0, correct: 0 }
    acc[qText].total += 1
    if (answer.is_correct) acc[qText].correct += 1
    return acc
  }, {})

  const missedQuestions = Object.values(questionStats)
    .filter((q) => q.total > 0)
    .map((q) => ({
      ...q,
      accuracy: Math.round((q.correct / q.total) * 100),
      missed: q.total - q.correct,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10)

  const classAvgScore =
    studentList.length > 0
      ? Math.round(studentList.reduce((sum, s) => sum + s.avgScore, 0) / studentList.length)
      : 0
  const classAvgAccuracy =
    studentList.length > 0
      ? Math.round(
          studentList.reduce((sum, s) => sum + s.avgAccuracy, 0) / studentList.length
        )
      : 0

  return {
    filteredSessions,
    completedSessions,
    unfinishedSessions,
    studentScores,
    studentList,
    classAvgScore,
    classAvgAccuracy,
    missedQuestions,
    filteredAnswers,
  }
}
