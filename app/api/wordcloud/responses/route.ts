import { fetchWordCloudResponses } from '@/lib/wordcloud/responses'
import { authorizeTeacherWordCloudAction } from '@/lib/wordcloud/teacher-auth'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('room_id')
    const teacherId = request.nextUrl.searchParams.get('teacher_id')
    const activityInstanceId = request.nextUrl.searchParams.get('activity_instance_id')

    if (!roomId || !teacherId || !activityInstanceId) {
      return NextResponse.json(
        { error: 'room_id, teacher_id, and activity_instance_id are required' },
        { status: 400 }
      )
    }

    const auth = await authorizeTeacherWordCloudAction(
      supabase,
      roomId,
      teacherId,
      activityInstanceId
    )
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const payload = await fetchWordCloudResponses(supabase, activityInstanceId)
    if (!payload) {
      return NextResponse.json({ error: 'Word cloud not found' }, { status: 404 })
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Responses failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
