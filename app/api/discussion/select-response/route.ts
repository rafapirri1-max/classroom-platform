import { mergeDiscussionLaunchConfigSelectedResponse } from '@/lib/discussion/launch-config'
import { DISCUSSION_ACTIVITY_ID } from '@/lib/discussion/types'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, teacher_id, activity_instance_id, response_id, selectedResponseId: selectedFromBody } =
      body

    if (!room_id || !teacher_id || !activity_instance_id) {
      return NextResponse.json(
        { error: 'room_id, teacher_id, and activity_instance_id are required' },
        { status: 400 }
      )
    }

    const rawSelection = response_id !== undefined ? response_id : selectedFromBody

    const selectedResponseId =
      rawSelection === null || rawSelection === undefined
        ? null
        : typeof rawSelection === 'string'
          ? rawSelection
          : null

    if (rawSelection !== null && rawSelection !== undefined && typeof rawSelection !== 'string') {
      return NextResponse.json(
        { error: 'response_id / selectedResponseId must be a string or null' },
        { status: 400 }
      )
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, teacher_id, active_activity_instance_id')
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
    if (room.active_activity_instance_id !== activity_instance_id) {
      return NextResponse.json({ error: 'This discussion is not the active launch' }, { status: 409 })
    }

    const { data: instance, error: instanceError } = await supabase
      .from('activity_instances')
      .select('id, activity_id, status, launch_config')
      .eq('id', activity_instance_id)
      .maybeSingle()

    if (instanceError) throw instanceError
    if (!instance) {
      return NextResponse.json({ error: 'Discussion launch not found' }, { status: 404 })
    }
    if (instance.activity_id !== DISCUSSION_ACTIVITY_ID) {
      return NextResponse.json({ error: 'Not a discussion launch' }, { status: 400 })
    }
    if (instance.status !== 'active') {
      return NextResponse.json({ error: 'Discussion has ended' }, { status: 409 })
    }

    if (selectedResponseId) {
      const { data: responseRow, error: responseError } = await supabase
        .from('discussion_responses')
        .select('id')
        .eq('id', selectedResponseId)
        .eq('activity_instance_id', activity_instance_id)
        .maybeSingle()

      if (responseError) throw responseError
      if (!responseRow) {
        return NextResponse.json({ error: 'Response not found for this discussion' }, { status: 404 })
      }
    }

    const updatedConfig = mergeDiscussionLaunchConfigSelectedResponse(
      instance.launch_config,
      selectedResponseId
    )
    if (!updatedConfig) {
      return NextResponse.json({ error: 'Invalid discussion configuration' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('activity_instances')
      .update({ launch_config: updatedConfig })
      .eq('id', activity_instance_id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      selectedResponseId: updatedConfig.selectedResponseId,
      launch_config: updatedConfig,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Select failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
