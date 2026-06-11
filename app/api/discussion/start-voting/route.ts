import { mergeDiscussionLaunchConfigPhase, parseDiscussionLaunchConfig } from '@/lib/discussion/launch-config'
import { authorizeTeacherDiscussionAction } from '@/lib/discussion/teacher-auth'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, teacher_id, activity_instance_id } = body

    if (!room_id || !teacher_id || !activity_instance_id) {
      return NextResponse.json(
        { error: 'room_id, teacher_id, and activity_instance_id are required' },
        { status: 400 }
      )
    }

    const auth = await authorizeTeacherDiscussionAction(
      supabase,
      room_id,
      teacher_id,
      activity_instance_id
    )
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const currentConfig = parseDiscussionLaunchConfig(auth.instance.launch_config)
    if (!currentConfig) {
      return NextResponse.json({ error: 'Invalid discussion configuration' }, { status: 500 })
    }
    if (currentConfig.phase !== 'collecting') {
      return NextResponse.json({ error: 'Voting can only start from the collecting phase' }, { status: 409 })
    }

    const { count, error: countError } = await supabase
      .from('discussion_responses')
      .select('id', { count: 'exact', head: true })
      .eq('activity_instance_id', activity_instance_id)

    if (countError) throw countError
    if ((count ?? 0) < 2) {
      return NextResponse.json(
        { error: 'At least 2 responses are required to start voting' },
        { status: 400 }
      )
    }

    const updatedConfig = mergeDiscussionLaunchConfigPhase(auth.instance.launch_config, 'voting')
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
      phase: updatedConfig.phase,
      launch_config: updatedConfig,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Start voting failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
