import { finalizeHubRawData, mergeHubMiniGameProgress } from '@/lib/mini-game-progress'
import { findReusableOpenSession } from '@/lib/session-lifecycle/server-reuse'
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
        const {
          student_id,
          game_type,
          mode,
          room_code,
          room_id,
          class_id: classIdFromClient,
          force_new: forceNew,
        } = data

        let class_id: string | null = classIdFromClient ?? null
        if (!class_id && room_id) {
          const { data: room } = await supabase
            .from('rooms')
            .select('class_id')
            .eq('id', room_id)
            .maybeSingle()
          class_id = room?.class_id ?? null
        }

        if (!forceNew && student_id && room_id && game_type) {
          const existingId = await findReusableOpenSession(supabase, {
            student_id,
            room_id,
            game_type,
          })
          if (existingId) {
            return NextResponse.json({ success: true, session_id: existingId, reused: true })
          }
        }

        const { data: session, error } = await supabase
          .from('game_sessions')
          .insert({
            student_id,
            game_type,
            mode,
            room_code,
            room_id: room_id ?? null,
            class_id,
          })
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

      case 'update_progress': {
        const { session_id, activity_id, required_mini_game_ids, mini_game } = data
        if (!session_id || !mini_game?.miniGameId) {
          return NextResponse.json({ error: 'session_id and mini_game required' }, { status: 400 })
        }

        const { data: session, error: fetchError } = await supabase
          .from('game_sessions')
          .select('raw_data, completed')
          .eq('id', session_id)
          .single()
        if (fetchError) throw fetchError
        if (session.completed === true) {
          return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
        }

        const merged = mergeHubMiniGameProgress(session.raw_data, {
          activityId: activity_id,
          requiredMiniGameIds: required_mini_game_ids,
          miniGame: mini_game,
        })

        const { error } = await supabase
          .from('game_sessions')
          .update({
            score: merged.score,
            accuracy_percent: merged.accuracy_percent,
            time_spent_seconds: merged.time_spent_seconds,
            completed: false,
            raw_data: merged.raw_data,
          })
          .eq('id', session_id)
        if (error) throw error
        return NextResponse.json({ success: true, raw_data: merged.raw_data })
      }

      case 'end_session': {
        const { session_id, score, accuracy_percent, time_spent_seconds, completed, badges, raw_data } = data
        const isCompleted = completed ?? true

        const { data: existing, error: fetchError } = await supabase
          .from('game_sessions')
          .select('raw_data')
          .eq('id', session_id)
          .single()
        if (fetchError) throw fetchError

        let finalRawData = existing?.raw_data
        if (isCompleted) {
          finalRawData = finalizeHubRawData(existing?.raw_data, raw_data)
        } else if (raw_data) {
          finalRawData = raw_data
        }

        const { error } = await supabase.from('game_sessions')
          .update({
            score,
            accuracy_percent,
            time_spent_seconds,
            completed: isCompleted,
            raw_data: finalRawData,
          })
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
