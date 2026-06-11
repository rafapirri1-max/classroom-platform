import { canonicalPair } from '@/lib/discussion/pair-selection'
import { loadDiscussionVoteContext } from '@/lib/discussion/vote-context'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      room_id,
      activity_instance_id,
      student_id,
      left_response_id,
      right_response_id,
      selected_response_id,
    } = body

    if (!room_id || !activity_instance_id || !student_id) {
      return NextResponse.json(
        { error: 'room_id, activity_instance_id, and student_id are required' },
        { status: 400 }
      )
    }
    if (
      typeof left_response_id !== 'string' ||
      typeof right_response_id !== 'string' ||
      typeof selected_response_id !== 'string'
    ) {
      return NextResponse.json({ error: 'Response ids must be strings' }, { status: 400 })
    }
    if (left_response_id === right_response_id) {
      return NextResponse.json({ error: 'Cannot compare a response with itself' }, { status: 400 })
    }
    if (selected_response_id !== left_response_id && selected_response_id !== right_response_id) {
      return NextResponse.json({ error: 'Selected response must be one of the pair' }, { status: 400 })
    }

    const ctx = await loadDiscussionVoteContext(supabase, room_id, activity_instance_id)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .maybeSingle()

    if (studentError) throw studentError
    if (!studentRow) {
      return NextResponse.json(
        { error: 'You must be signed in as a student to vote' },
        { status: 403 }
      )
    }

    const responseIds = new Set([left_response_id, right_response_id, selected_response_id])
    const { data: responseRows, error: responseError } = await supabase
      .from('discussion_responses')
      .select('id')
      .eq('activity_instance_id', activity_instance_id)
      .in('id', Array.from(responseIds))

    if (responseError) throw responseError
    if ((responseRows || []).length !== responseIds.size) {
      return NextResponse.json({ error: 'Invalid response for this discussion' }, { status: 400 })
    }

    const [canonicalLeftId, canonicalRightId] = canonicalPair(left_response_id, right_response_id)

    const { error: insertError } = await supabase.from('discussion_votes').insert({
      activity_instance_id,
      student_id,
      left_response_id: canonicalLeftId,
      right_response_id: canonicalRightId,
      selected_response_id,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted on this comparison' },
          { status: 409 }
        )
      }
      throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vote failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
