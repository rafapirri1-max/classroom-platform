import { isValidPollOptionId, loadPollVoteContext } from '@/lib/poll/vote-context'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, activity_instance_id, student_id, selected_option_id } = body

    if (!room_id || !activity_instance_id || !student_id || !selected_option_id) {
      return NextResponse.json(
        { error: 'room_id, activity_instance_id, student_id, and selected_option_id are required' },
        { status: 400 }
      )
    }

    if (typeof selected_option_id !== 'string') {
      return NextResponse.json({ error: 'selected_option_id must be a string' }, { status: 400 })
    }

    const ctx = await loadPollVoteContext(supabase, room_id, activity_instance_id)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    if (!isValidPollOptionId(ctx.context.launchConfig, selected_option_id)) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('poll_responses').insert({
      activity_instance_id,
      student_id,
      room_id,
      class_id: ctx.context.room.class_id,
      selected_option_ids: [selected_option_id],
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already voted in this poll' }, { status: 409 })
      }
      throw insertError
    }

    return NextResponse.json({
      success: true,
      selected_option_id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Vote failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
