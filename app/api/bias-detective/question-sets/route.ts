import { countBiasDetectiveQuestions } from '@/lib/bias-detective/question-count'
import type { BiasQuestionSetSummary } from '@/lib/bias-detective/types'
import { validateBiasDetectiveSet, validateQuestionSetTitle } from '@/lib/bias-detective/validate-set'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const teacherId = request.nextUrl.searchParams.get('teacher_id')
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bias_question_sets')
      .select('id, title, description, question_count, created_at, updated_at')
      .eq('teacher_id', teacherId)
      .order('updated_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Question sets table is not available. Apply database migrations.' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ sets: (data ?? []) as BiasQuestionSetSummary[] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list question sets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teacher_id, title, description, content } = body

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 })
    }

    const titleValidated = validateQuestionSetTitle(typeof title === 'string' ? title : '')
    if (!titleValidated.ok) {
      return NextResponse.json({ error: titleValidated.error }, { status: 400 })
    }

    const validated = validateBiasDetectiveSet(content)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const desc =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim().slice(0, 500)
        : null

    const { data, error } = await supabase
      .from('bias_question_sets')
      .insert({
        teacher_id,
        title: titleValidated.title,
        description: desc,
        question_count: countBiasDetectiveQuestions(validated.content),
        content: validated.content,
        is_default: false,
      })
      .select('id, title, description, question_count, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Question sets table is not available. Apply database migrations.' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, set: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save question set'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
