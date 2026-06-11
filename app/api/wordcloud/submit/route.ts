import { validateWordCloudAnswer } from '@/lib/wordcloud/normalize'
import { loadWordCloudSubmitContext } from '@/lib/wordcloud/submit-context'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, activity_instance_id, student_id, answer_text } = body

    if (!room_id || !activity_instance_id || !student_id) {
      return NextResponse.json(
        { error: 'room_id, activity_instance_id, and student_id are required' },
        { status: 400 }
      )
    }

    if (typeof answer_text !== 'string') {
      return NextResponse.json({ error: 'answer_text must be a string' }, { status: 400 })
    }

    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .maybeSingle()

    if (studentError) throw studentError
    if (!studentRow) {
      return NextResponse.json(
        { error: 'You must be signed in as a student to submit an answer.' },
        { status: 403 }
      )
    }

    const ctx = await loadWordCloudSubmitContext(supabase, room_id, activity_instance_id)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const validated = validateWordCloudAnswer(
      answer_text,
      ctx.context.launchConfig.maxAnswerLength
    )
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('wordcloud_responses').insert({
      activity_instance_id,
      student_id,
      room_id,
      class_id: ctx.context.room.class_id,
      answer_text: validated.answer,
      normalized_text: validated.normalized,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already submitted an answer' }, { status: 409 })
      }
      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'Word cloud responses table is not available. Apply wordcloud migrations in Supabase.',
          },
          { status: 503 }
        )
      }
      if (insertError.code === '42501') {
        return NextResponse.json(
          {
            error:
              'Word cloud submission was blocked by database permissions. Apply wordcloud_responses access migration.',
          },
          { status: 500 }
        )
      }
      throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submit failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
