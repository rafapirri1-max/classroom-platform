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
      .from('poll_responses')
      .select('selected_option_ids')
      .eq('activity_instance_id', activityInstanceId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ voted: false })
    }

    return NextResponse.json({
      voted: true,
      selected_option_ids: data.selected_option_ids,
      selected_option_id: data.selected_option_ids?.[0] ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
