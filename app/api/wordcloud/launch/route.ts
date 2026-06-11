import { launchWordCloudActivity } from '@/lib/activity-instances'
import { validateWordCloudLaunchInput } from '@/lib/wordcloud/launch-config'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, teacher_id, question } = body

    if (!room_id || !teacher_id) {
      return NextResponse.json({ error: 'room_id and teacher_id are required' }, { status: 400 })
    }

    const validated = validateWordCloudLaunchInput(typeof question === 'string' ? question : '')
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

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

    const activityInstanceId = await launchWordCloudActivity(supabase, room, validated.config)

    return NextResponse.json({
      success: true,
      activity_instance_id: activityInstanceId,
      launch_config: validated.config,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Launch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
