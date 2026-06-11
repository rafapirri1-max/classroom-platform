import { getBuiltinDefaultContent } from '@/lib/bias-detective/default-set'
import { parseBiasDetectiveLaunchConfig } from '@/lib/bias-detective/launch-config'
import { validateBiasDetectiveSet } from '@/lib/bias-detective/validate-set'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const activityInstanceId = request.nextUrl.searchParams.get('activity_instance_id')
    if (!activityInstanceId) {
      return NextResponse.json({ error: 'activity_instance_id is required' }, { status: 400 })
    }

    const { data: instance, error } = await supabase
      .from('activity_instances')
      .select('activity_id, launch_config, status')
      .eq('id', activityInstanceId)
      .maybeSingle()

    if (error) throw error
    if (!instance) {
      return NextResponse.json({ error: 'Activity instance not found' }, { status: 404 })
    }
    if (instance.activity_id !== 'bias-detective') {
      return NextResponse.json({ error: 'Not a Bias Detective activity' }, { status: 400 })
    }

    const config = parseBiasDetectiveLaunchConfig(instance.launch_config)
    if (!config || config.questionSetId === 'default') {
      return NextResponse.json({
        title: 'Built-in Default Set',
        content: getBuiltinDefaultContent(),
        source: 'default',
      })
    }

    if (config.content) {
      const validated = validateBiasDetectiveSet(config.content)
      if (validated.ok) {
        return NextResponse.json({
          title: config.title ?? 'Custom question set',
          content: validated.content,
          source: 'launch_config',
        })
      }
    }

    return NextResponse.json({
      title: config.title ?? 'Built-in Default Set',
      content: getBuiltinDefaultContent(),
      source: 'fallback',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load game data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
