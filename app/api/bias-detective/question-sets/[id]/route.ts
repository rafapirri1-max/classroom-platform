import { getBuiltinDefaultContent } from '@/lib/bias-detective/default-set'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacherId = request.nextUrl.searchParams.get('teacher_id')
    const setId = params.id

    if (setId === 'default') {
      return NextResponse.json({
        id: 'default',
        title: 'Built-in Default Set',
        content: getBuiltinDefaultContent(),
      })
    }

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bias_question_sets')
      .select('id, teacher_id, title, description, question_count, content, created_at, updated_at')
      .eq('id', setId)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Question sets table is not available. Apply database migrations.' },
          { status: 503 }
        )
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
    }

    if (data.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Not authorized to access this question set' }, { status: 403 })
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      description: data.description,
      question_count: data.question_count,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load question set'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
