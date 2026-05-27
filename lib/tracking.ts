export async function startGameSession(student_id: string, game_type: string, mode: string, room_code?: string) {
  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start_session', data: { student_id, game_type, mode, room_code } })
  })
  const data = await res.json()
  return data.session_id
}

export async function recordAnswer(session_id: string, answerData: {
  question_id: string; question_text?: string; student_answer: string; correct_answer: string;
  is_correct: boolean; time_taken_ms: number; changed_answer?: boolean;
  confidence?: 'high' | 'medium' | 'low'; misconception_tag?: string
}) {
  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'record_answer', data: { session_id, ...answerData } })
  })
  return res.json()
}

export async function endGameSession(session_id: string, data: {
  student_id: string; score: number; accuracy_percent: number; time_spent_seconds: number;
  completed?: boolean; badges?: string[]; raw_data?: any
}) {
  const res = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'end_session', data: { session_id, ...data } })
  })
  return res.json()
}
