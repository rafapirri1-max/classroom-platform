import { mergeWordCloudLaunchConfigPhase, parseWordCloudLaunchConfig } from '@/lib/wordcloud/launch-config'
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
    const { room_id, teacher_id, activity_instance_id } = body

    if (!room_id || !teacher_id || !activity_instance_id) {
      return NextResponse.json(
        { error: 'room_id, teacher_id, and activity_instance_id are required' },
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

    const currentConfig = parseWordCloudLaunchConfig(auth.instance.launch_config)
    if (!currentConfig) {
      return NextResponse.json({ error: 'Invalid word cloud configuration' }, { status: 500 })
    }
    if (currentConfig.phase !== 'collecting') {
      return NextResponse.json(
        { error: 'Word cloud can only be revealed from the collecting phase' },
        { status: 409 }
      )
    }

    const updatedConfig = mergeWordCloudLaunchConfigPhase(auth.instance.launch_config, 'revealed')
    if (!updatedConfig) {
      return NextResponse.json({ error: 'Invalid word cloud configuration' }, { status: 500 })
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
    const message = error instanceof Error ? error.message : 'Reveal failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
