'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AnalyticsData {
  sessions: any[]
  answers: any[]
  students: any[]
}

export default function ClassAnalytics({ classId, classCode }: { classId: string; classCode: string }) {
  const [data, setData] = useState<AnalyticsData>({ sessions: [], answers: [], students: [] })
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [classId])

  async function loadAnalytics() {
    // Get all game sessions for this class's room codes
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('*, students(name, email)')
      .eq('game_type', 'bias-detective')
      .order('created_at', { ascending: false })

    // Get all answers
    const { data: answers } = await supabase
      .from('question_attempts')
      .select('*, game_sessions(student_id, students(name))')
      .order('created_at', { ascending: false })

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('*, students(name, email)')
      .eq('class_id', classId)

    setData({
      sessions: sessions || [],
      answers: answers || [],
      students: enrollments?.map(e => e.students) || []
    })
    setLoading(false)
  }

  // Calculate statistics
  const studentScores = data.sessions.reduce((acc: any, session: any) => {
    const studentId = session.student_id
    const studentName = session.students?.name || 'Unknown'
    if (!acc[studentId]) {
      acc[studentId] = { name: studentName, sessions: [], totalScore: 0, totalAccuracy: 0, count: 0 }
    }
    acc[studentId].sessions.push(session)
    acc[studentId].totalScore += session.score || 0
    acc[studentId].totalAccuracy += session.accuracy_percent || 0
    acc[studentId].count += 1
    return acc
  }, {})

  const studentList = Object.values(studentScores).map((s: any) => ({
    ...s,
    avgScore: Math.round(s.totalScore / s.count),
    avgAccuracy: Math.round(s.totalAccuracy / s.count)
  }))

  // Most missed questions
  const questionStats = data.answers.reduce((acc: any, answer: any) => {
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

  // Download CSV
  function downloadCSV() {
    const headers = ['Student Name', 'Score', 'Accuracy %', 'Time (sec)', 'Date', 'Completed']
    const rows = data.sessions.map((s: any) => [
      s.students?.name || 'Unknown',
      s.score || 0,
      s.accuracy_percent || 0,
      s.time_spent_seconds || 0,
      new Date(s.created_at).toLocaleDateString(),
      s.completed ? 'Yes' : 'No'
    ])

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `class-analytics-${classCode}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download detailed answers CSV
  function downloadDetailedCSV() {
    const headers = ['Student Name', 'Question', 'Student Answer', 'Correct Answer', 'Correct?', 'Time (ms)', 'Date']
    const rows = data.answers.map((a: any) => [
      a.game_sessions?.students?.name || 'Unknown',
      a.question_text?.substring(0, 100) || '',
      a.student_answer?.substring(0, 100) || '',
      a.correct_answer?.substring(0, 100) || '',
      a.is_correct ? 'Yes' : 'No',
      a.time_taken_ms || 0,
      new Date(a.created_at).toLocaleDateString()
    ])

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `detailed-answers-${classCode}-${new Date().toISOString().split('T')[0]}.csv`
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
      {/* Header with download buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📊 Class Analytics</h2>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            disabled={data.sessions.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
          >
            📥 Download Scores CSV
          </button>
          <button
            onClick={downloadDetailedCSV}
            disabled={data.answers.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
          >
            📥 Download Answers CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{data.sessions.length}</div>
          <div className="text-gray-400 text-sm">Total Sessions</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{studentList.length}</div>
          <div className="text-gray-400 text-sm">Students Played</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{classAvgScore}</div>
          <div className="text-gray-400 text-sm">Avg Score</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{classAvgAccuracy}%</div>
          <div className="text-gray-400 text-sm">Avg Accuracy</div>
        </div>
      </div>

      {/* Student Scores Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
          <h3 className="font-semibold">👥 Student Scores</h3>
        </div>
        {studentList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No game data yet. Students haven't played the Bias Game.</p>
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
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {studentList.map((student: any) => (
                  <tr key={student.name} className="hover:bg-gray-700/30 transition">
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
                      <button
                        onClick={() => setSelectedStudent(selectedStudent === student.name ? null : student.name)}
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        {selectedStudent === student.name ? 'Hide' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Student Details */}
      {selectedStudent && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3">📋 {selectedStudent} - Session History</h3>
          <div className="space-y-2">
            {data.sessions
              .filter((s: any) => s.students?.name === selectedStudent)
              .map((session: any) => (
                <div key={session.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{new Date(session.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Room: {session.room_code}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-400">{session.score} pts</div>
                      <div className="text-xs text-gray-500">{session.accuracy_percent}% accuracy</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${session.completed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                      {session.completed ? 'Completed' : 'Incomplete'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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
  )
}
