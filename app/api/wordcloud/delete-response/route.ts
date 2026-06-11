import { deleteWordCloudResponse } from '@/lib/wordcloud/delete-response'
import { authorizeTeacherWordCloudAction } from '@/lib/wordcloud/teacher-auth'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, teacher_id, activity_instance_id, response_id } = body

    if (!room_id || !teacher_id || !activity_instance_id || !response_id) {
      return NextResponse.json(
        { error: 'room_id, teacher_id, activity_instance_id, and response_id are required' },
        { status: 400 }
      )
    }

    const auth = await authorizeTeacherWordCloudAction(
      supabase,
      room_id,
      teacher_id,
      activity_instance_id
    )
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const result = await deleteWordCloudResponse(
      supabase,
      activity_instance_id,
      response_id,
      auth.instance.launch_config
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
