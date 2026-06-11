import { launchBiasDetectiveActivity } from '@/lib/activity-instances'
import { buildBiasDetectiveLaunchConfig } from '@/lib/bias-detective/launch-config'
import { DEFAULT_BIAS_SET_TITLE } from '@/lib/bias-detective/default-set'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, teacher_id, question_set_id } = body

    if (!room_id || !teacher_id) {
      return NextResponse.json({ error: 'room_id and teacher_id are required' }, { status: 400 })
    }

    const setId =
      typeof question_set_id === 'string' && question_set_id.length > 0
        ? question_set_id
        : 'default'

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, current_activity, class_id, teacher_id, active_activity_instance_id')
      .eq('id', room_id)
      .maybeSingle()

    if (roomError) throw roomError
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (room.status !== 'active') {
      return NextResponse.json({ error: 'Room is not active' }, { status: 400 })
    }
    if (room.teacher_id !== teacher_id) {
      return NextResponse.json({ error: 'Not authorized for this room' }, { status: 403 })
    }

    let launchConfig: Record<string, unknown>

    if (setId === 'default') {
      launchConfig = buildBiasDetectiveLaunchConfig('default', {
        title: DEFAULT_BIAS_SET_TITLE,
      })
    } else {
      const { data: questionSet, error: setError } = await supabase
        .from('bias_question_sets')
        .select('id, teacher_id, title, content')
        .eq('id', setId)
        .maybeSingle()

      if (setError) {
        if (setError.code === '42P01') {
          return NextResponse.json(
            { error: 'Question sets table is not available. Apply database migrations.' },
            { status: 503 }
          )
        }
        throw setError
      }

      if (!questionSet) {
        return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
      }
      if (questionSet.teacher_id !== teacher_id) {
        return NextResponse.json({ error: 'Not authorized to use this question set' }, { status: 403 })
      }

      launchConfig = buildBiasDetectiveLaunchConfig(setId, {
        title: questionSet.title,
        content: questionSet.content,
      })
    }

    const activityInstanceId = await launchBiasDetectiveActivity(supabase, room, launchConfig)

    return NextResponse.json({
      success: true,
      activity_instance_id: activityInstanceId,
      launch_config: launchConfig,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Launch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
