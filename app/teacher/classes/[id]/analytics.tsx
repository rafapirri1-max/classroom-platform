'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchClassGameSessions } from '@/lib/class-sessions'

interface AnalyticsData {
  sessions: any[]
  answers: any[]
  students: any[]
  classStudents: any[]  // Students enrolled in THIS class
}

export default function ClassAnalytics({ classId, classCode }: { classId: string; classCode: string }) {
  const [data, setData] = useState<AnalyticsData>({ sessions: [], answers: [], students: [], classStudents: [] })
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'student' | 'timeline'>('overview')
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'term'>('all')

  useEffect(() => {
    loadAnalytics()
  }, [classId])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAnalytics()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [classId])

  async function loadAnalytics() {
    setLoading(true)
    // Get students enrolled in THIS class
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('*, students(id, name, email)')
      .eq('class_id', classId)

    const classStudentIds = enrollments?.map(e => e.students?.id).filter(Boolean) as string[] || []
    const classStudents = enrollments?.map(e => e.students).filter(Boolean) || []

    const sessions = await fetchClassGameSessions(supabase, {
      classId,
      classStudentIds,
      gameType: 'bias-detective',
      select: '*, students(name, email)',
    })

    // Get answers ONLY for sessions from students in this class
    const sessionIds = sessions?.map(s => s.id) || []
    const { data: answers } = await supabase
      .from('question_attempts')
      .select('*, game_sessions(student_id, students(name))')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['no-sessions'])
      .order('created_at', { ascending: false })

    setData({
      sessions,
      answers: answers || [],
      students: classStudents,
      classStudents: classStudents
    })
    setLoading(false)
  }

  // Filter sessions by date
  const filteredSessions = data.sessions.filter((session: any) => {
    if (dateFilter === 'all') return true
    const sessionDate = new Date(session.created_at)
    const now = new Date()
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return sessionDate >= weekAgo
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return sessionDate >= monthAgo
    }
    if (dateFilter === 'term') {
      // Assume school term is roughly 3-4 months
      const termAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)
      return sessionDate >= termAgo
    }
    return true
  })

  // Calculate statistics for filtered data
  const studentScores = filteredSessions.reduce((acc: any, session: any) => {
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
        lastSession: session.created_at
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

  const studentList = Object.values(studentScores).map((s: any) => ({
    ...s,
    avgScore: s.count > 0 ? Math.round(s.totalScore / s.count) : 0,
    avgAccuracy: s.count > 0 ? Math.round(s.totalAccuracy / s.count) : 0,
    improvement: s.count > 1 ? 
      Math.round(((s.sessions[0].score || 0) - (s.sessions[s.sessions.length - 1].score || 0))) : 0
  }))

  // Most missed questions (filtered)
  const filteredSessionIds = filteredSessions.map(s => s.id)
  const filteredAnswers = data.answers.filter((a: any) => filteredSessionIds.includes(a.session_id))

  const questionStats = filteredAnswers.reduce((acc: any, answer: any) => {
    const qText = answer.question_text?.substring(0, 80) || 'Unknown'
    if (!acc[qText]) {
      acc[qText] = { text: qText, total: 0, correct: 0 }
    }
    acc[qText].total += 1
    if (answer.is_correct) acc[qText].correct += 1
    return acc
  }, {})

  const missedQuestions = Object.values(questionStats)
    .filter((q: any) => q.total > 0)
    .map((q: any) => ({
      ...q,
      accuracy: Math.round((q.correct / q.total) * 100),
      missed: q.total - q.correct
    }))
    .sort((a: any, b: any) => a.accuracy - b.accuracy)
    .slice(0, 10)

  // Class averages
  const classAvgScore = studentList.length > 0 
    ? Math.round(studentList.reduce((sum: number, s: any) => sum + s.avgScore, 0) / studentList.length)
    : 0
  const classAvgAccuracy = studentList.length > 0
    ? Math.round(studentList.reduce((sum: number, s: any) => sum + s.avgAccuracy, 0) / studentList.length)
    : 0

  // Timeline data for selected student
  const selectedStudentData = selectedStudent ? studentScores[selectedStudent] : null
  const selectedStudentTimeline = selectedStudentData?.sessions?.sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  // Download CSV
  function downloadCSV(type: 'scores' | 'answers' | 'timeline') {
    let csv = ''
    let filename = ''

    if (type === 'scores') {
      const headers = ['Student Name', 'Score', 'Accuracy %', 'Time (sec)', 'Date', 'Completed']
      const rows = filteredSessions.map((s: any) => [
        s.students?.name || 'Unknown',
        s.score || 0,
        s.accuracy_percent || 0,
        s.time_spent_seconds || 0,
        new Date(s.created_at).toLocaleDateString(),
        s.completed ? 'Yes' : 'No'
      ])
      csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
      filename = `class-scores-${classCode}-${new Date().toISOString().split('T')[0]}.csv`
    }

    if (type === 'answers') {
      const headers = ['Student Name', 'Question', 'Student Answer', 'Correct Answer', 'Correct?', 'Time (ms)', 'Date']
      const rows = filteredAnswers.map((a: any) => [
        a.game_sessions?.students?.name || 'Unknown',
        a.question_text?.substring(0, 100) || '',
        a.student_answer?.substring(0, 100) || '',
        a.correct_answer?.substring(0, 100) || '',
        a.is_correct ? 'Yes' : 'No',
        a.time_taken_ms || 0,
        new Date(a.created_at).toLocaleDateString()
      ])
      csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
      filename = `detailed-answers-${classCode}-${new Date().toISOString().split('T')[0]}.csv`
    }

    if (type === 'timeline') {
      const headers = ['Date', 'Score', 'Accuracy %', 'Time (sec)', 'Session ID']
      const rows = selectedStudentTimeline.map((s: any) => [
        new Date(s.created_at).toLocaleDateString(),
        s.score || 0,
        s.accuracy_percent || 0,
        s.time_spent_seconds || 0,
        s.id
      ])
      csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
      filename = `student-timeline-${selectedStudentData?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">📊 Class Analytics</h2>
          <p className="text-sm text-gray-400">Class Code: {classCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadAnalytics()}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="term">This Term</option>
          </select>
          <button
            onClick={() => downloadCSV('scores')}
            disabled={filteredSessions.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            📥 Scores CSV
          </button>
          <button
            onClick={() => downloadCSV('answers')}
            disabled={filteredAnswers.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            📥 Answers CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-blue-400">{filteredSessions.length}</div>
          <div className="text-gray-400 text-xs md:text-sm">Sessions</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-green-400">{studentList.length}</div>
          <div className="text-gray-400 text-xs md:text-sm">Students Played</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-purple-400">{classAvgScore}</div>
          <div className="text-gray-400 text-xs md:text-sm">Avg Score</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-orange-400">{classAvgAccuracy}%</div>
          <div className="text-gray-400 text-xs md:text-sm">Avg Accuracy</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
        {(['overview', 'student', 'timeline'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode)
              if (mode !== 'timeline') setSelectedStudent(null)
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {mode === 'overview' && '📊 Overview'}
            {mode === 'student' && '👥 Students'}
            {mode === 'timeline' && '📈 Timeline'}
          </button>
        ))}
      </div>

      {/* OVERVIEW VIEW */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Student Scores Table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
              <h3 className="font-semibold">👥 Student Performance</h3>
            </div>
            {studentList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No game data for this class yet.</p>
                <p className="text-sm text-gray-500 mt-2">Students need to play the Bias Game and submit answers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/30">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Student</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Sessions</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Avg Score</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Avg Accuracy</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Trend</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {studentList.map((student: any) => (
                      <tr key={student.id} className="hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-center">{student.count}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${student.avgScore >= 700 ? 'text-green-400' : student.avgScore >= 400 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {student.avgScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${student.avgAccuracy >= 80 ? 'text-green-400' : student.avgAccuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {student.avgAccuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {student.count > 1 ? (
                            <span className={`text-sm ${student.improvement > 0 ? 'text-green-400' : student.improvement < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {student.improvement > 0 ? '↗ +' : student.improvement < 0 ? '↘ ' : '→ '}
                              {student.improvement}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedStudent(student.id)
                              setViewMode('timeline')
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm underline"
                          >
                            View Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Most Missed Questions */}
          {missedQuestions.length > 0 && (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
                <h3 className="font-semibold">⚠️ Most Missed Questions</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {missedQuestions.map((q: any, i: number) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{q.text}</span>
                        <span className={`text-sm font-bold ${q.accuracy >= 70 ? 'text-green-400' : q.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {q.accuracy}% correct
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${q.accuracy >= 70 ? 'bg-green-500' : q.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${q.accuracy}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {q.correct}/{q.total} students got this right • {q.missed} missed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT LIST VIEW */}
      {viewMode === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentList.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500 bg-gray-800 rounded-xl">
              <div className="text-4xl mb-2">👥</div>
              <p>No students have played yet.</p>
            </div>
          ) : (
            studentList.map((student: any) => (
              <div 
                key={student.id} 
                onClick={() => {
                  setSelectedStudent(student.id)
                  setViewMode('timeline')
                }}
                className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700/50 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-lg">{student.name}</div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    student.avgScore >= 700 ? 'bg-green-900/50 text-green-300' : 
                    student.avgScore >= 400 ? 'bg-yellow-900/50 text-yellow-300' : 
                    'bg-red-900/50 text-red-300'
                  }`}>
                    {student.avgScore} pts
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Sessions: <span className="text-white">{student.count}</span></div>
                  <div className="text-gray-400">Accuracy: <span className="text-white">{student.avgAccuracy}%</span></div>
                  <div className="text-gray-400">First: <span className="text-white">{new Date(student.firstSession).toLocaleDateString()}</span></div>
                  <div className="text-gray-400">Latest: <span className="text-white">{new Date(student.lastSession).toLocaleDateString()}</span></div>
                </div>
                {student.count > 1 && (
                  <div className="mt-2 text-xs">
                    <span className={student.improvement > 0 ? 'text-green-400' : student.improvement < 0 ? 'text-red-400' : 'text-gray-400'}>
                      Trend: {student.improvement > 0 ? '↗ Improving' : student.improvement < 0 ? '↘ Declining' : '→ Stable'}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewMode === 'timeline' && selectedStudent && selectedStudentData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">📈 {selectedStudentData.name} — Timeline</h3>
              <p className="text-sm text-gray-400">
                {selectedStudentTimeline.length} sessions from {new Date(selectedStudentData.firstSession).toLocaleDateString()} to {new Date(selectedStudentData.lastSession).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV('timeline')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                📥 Download Timeline
              </button>
              <button
                onClick={() => {
                  setSelectedStudent(null)
                  setViewMode('overview')
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Score Chart (simple bar chart) */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h4 className="font-semibold mb-4">Score Progression</h4>
            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
              {selectedStudentTimeline.map((session: any, i: number) => (
                <div key={session.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div 
                    className="w-12 rounded-t-lg transition-all hover:opacity-80"
                    style={{ 
                      height: `${Math.max(20, (session.score || 0) / 10)}px`,
                      background: session.score >= 700 ? '#22c55e' : session.score >= 400 ? '#eab308' : '#ef4444'
                    }}
                    title={`Score: ${session.score} | Accuracy: ${session.accuracy_percent}% | ${new Date(session.created_at).toLocaleDateString()}`}
                  ></div>
                  <span className="text-xs text-gray-500">{new Date(session.created_at).getMonth() + 1}/{new Date(session.created_at).getDate()}</span>
                  <span className="text-xs font-bold">{session.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Session History Table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
              <h4 className="font-semibold">Session History</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/30">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Score</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Accuracy</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Time</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {selectedStudentTimeline.map((session: any) => (
                    <tr key={session.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 text-sm">{new Date(session.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${session.score >= 700 ? 'text-green-400' : session.score >= 400 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {session.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{session.accuracy_percent}%</td>
                      <td className="px-4 py-3 text-center">{session.time_spent_seconds}s</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${session.completed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                          {session.completed ? 'Completed' : 'Incomplete'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Answers Breakdown */}
          {data.answers.filter((a: any) => 
            selectedStudentTimeline.some((s: any) => s.id === a.session_id)
          ).length > 0 && (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
                <h4 className="font-semibold">Answer Breakdown</h4>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {data.answers
                  .filter((a: any) => selectedStudentTimeline.some((s: any) => s.id === a.session_id))
                  .map((answer: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg ${answer.is_correct ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
                      <div className="text-sm font-medium mb-1">{answer.question_text}</div>
                      <div className="text-xs text-gray-400">Student: {answer.student_answer}</div>
                      <div className="text-xs text-gray-400">Correct: {answer.correct_answer}</div>
                      <div className="text-xs mt-1">
                        <span className={answer.is_correct ? 'text-green-400' : 'text-red-400'}>
                          {answer.is_correct ? '✅ Correct' : '❌ Incorrect'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
