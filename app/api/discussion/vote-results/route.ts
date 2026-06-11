import { fetchDiscussionVoteResults } from '@/lib/discussion/vote-results'
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

    const payload = await fetchDiscussionVoteResults(supabase, activityInstanceId)
    if (!payload) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 })
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vote results failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
