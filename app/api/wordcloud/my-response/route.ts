import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const activityInstanceId = request.nextUrl.searchParams.get('activity_instance_id')
    const studentId = request.nextUrl.searchParams.get('student_id')

    if (!activityInstanceId || !studentId) {
      return NextResponse.json(
        { error: 'activity_instance_id and student_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('wordcloud_responses')
      .select('id, answer_text, created_at')
      .eq('activity_instance_id', activityInstanceId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Word cloud responses table is not available. Apply wordcloud migrations.' },
          { status: 503 }
        )
      }
      throw error
    }

    if (!data) {
      return NextResponse.json({ response: null })
    }

    return NextResponse.json({
      response: {
        id: data.id,
        answer_text: data.answer_text,
        created_at: data.created_at,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
