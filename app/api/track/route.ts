import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'start_session': {
        const { student_id, game_type, mode, room_code } = data
        const { data: session, error } = await supabase
          .from('game_sessions')
          .insert({ student_id, game_type, mode, room_code })
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ success: true, session_id: session.id })
      }

      case 'record_answer': {
        const { session_id, question_id, question_text, student_answer, correct_answer, is_correct, time_taken_ms, changed_answer, confidence, misconception_tag } = data
        let quality_score = is_correct ? 2 : 0
        if (is_correct && time_taken_ms < 3000) quality_score += 1
        if (changed_answer) quality_score -= 1
        quality_score = Math.max(0, Math.min(3, quality_score))
        const { error } = await supabase.from('question_attempts').insert({
          session_id, question_id, question_text, student_answer, correct_answer, is_correct,
          time_taken_ms, changed_answer: changed_answer || false, confidence: confidence || 'medium', quality_score, misconception_tag
        })
        if (error) throw error
        return NextResponse.json({ success: true, quality_score })
      }

      case 'end_session': {
        const { session_id, score, accuracy_percent, time_spent_seconds, completed, badges, raw_data } = data
        const { error } = await supabase.from('game_sessions')
          .update({ score, accuracy_percent, time_spent_seconds, completed: completed ?? true, raw_data })
          .eq('id', session_id)
        if (error) throw error
        if (badges && badges.length > 0) {
          for (const badgeName of badges) {
            const { data: badge } = await supabase.from('badges').select('id').eq('name', badgeName).single()
            if (badge) {
              await supabase.from('student_badges').upsert({
                student_id: data.student_id, badge_id: badge.id, session_id
              }, { onConflict: 'student_id,badge_id' })
            }
          }
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
