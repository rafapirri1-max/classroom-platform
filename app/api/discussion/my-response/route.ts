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
        { error: 'activity_instance_id and student_id are required', code: 'missing_fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('discussion_responses')
      .select('id, response_text, created_at')
      .eq('activity_instance_id', activityInstanceId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) {
      console.error('[discussion/my-response] lookup failed', {
        activityInstanceId,
        studentId,
        message: error.message,
        code: error.code,
      })
      return NextResponse.json(
        { error: error.message, code: error.code ?? 'lookup_failed' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ submitted: false })
    }

    return NextResponse.json({
      submitted: true,
      id: data.id,
      response_text: data.response_text,
      created_at: data.created_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lookup failed'
    console.error('[discussion/my-response] unhandled error', message)
    return NextResponse.json({ error: message, code: 'unhandled_error' }, { status: 500 })
  }
}
