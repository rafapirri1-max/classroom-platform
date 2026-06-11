import { loadDiscussionRespondContext } from '@/lib/discussion/respond-context'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MAX_RESPONSE_LENGTH = 2000

function formatSupabaseError(error: {
  message?: string
  code?: string
  details?: string
  hint?: string
}) {
  const parts = [error.message, error.code && `code=${error.code}`, error.details, error.hint].filter(
    Boolean
  )
  return parts.join(' | ')
}

export async function POST(request: NextRequest) {
  let roomId: string | undefined
  let activityInstanceId: string | undefined
  let studentId: string | undefined
  let hasResponseText = false

  try {
    const body = await request.json()
    const { room_id, activity_instance_id, student_id, response_text } = body

    roomId = typeof room_id === 'string' ? room_id : undefined
    activityInstanceId =
      typeof activity_instance_id === 'string' ? activity_instance_id : undefined
    studentId = typeof student_id === 'string' ? student_id : undefined
    hasResponseText = typeof response_text === 'string' && response_text.trim().length > 0

    console.info('[discussion/respond] request', {
      roomId,
      activityInstanceId,
      hasStudentId: Boolean(studentId),
      hasResponseText,
    })

    if (!roomId || !activityInstanceId || !studentId) {
      return NextResponse.json(
        {
          error: 'room_id, activity_instance_id, and student_id are required',
          code: 'missing_fields',
        },
        { status: 400 }
      )
    }

    if (typeof response_text !== 'string') {
      return NextResponse.json(
        { error: 'response_text must be a string', code: 'invalid_response_text' },
        { status: 400 }
      )
    }

    const trimmed = response_text.trim()
    if (trimmed.length < 1) {
      return NextResponse.json(
        { error: 'Response cannot be empty', code: 'empty_response' },
        { status: 400 }
      )
    }
    if (trimmed.length > MAX_RESPONSE_LENGTH) {
      return NextResponse.json(
        {
          error: `Response must be ${MAX_RESPONSE_LENGTH} characters or less`,
          code: 'response_too_long',
        },
        { status: 400 }
      )
    }

    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle()

    if (studentError) {
      console.error('[discussion/respond] student lookup failed', {
        roomId,
        activityInstanceId,
        studentId,
        error: formatSupabaseError(studentError),
      })
      return NextResponse.json(
        { error: 'Could not verify student profile', code: studentError.code ?? 'student_lookup_failed' },
        { status: 500 }
      )
    }

    if (!studentRow) {
      console.warn('[discussion/respond] student profile missing', {
        roomId,
        activityInstanceId,
        studentId,
      })
      return NextResponse.json(
        {
          error: 'You must be signed in as a student to submit a response.',
          code: 'student_profile_not_found',
        },
        { status: 403 }
      )
    }

    const ctx = await loadDiscussionRespondContext(supabase, roomId, activityInstanceId)
    if (!ctx.ok) {
      console.warn('[discussion/respond] context rejected', {
        roomId,
        activityInstanceId,
        studentId,
        error: ctx.error,
        status: ctx.status,
      })
      return NextResponse.json({ error: ctx.error, code: 'invalid_discussion_context' }, { status: ctx.status })
    }

    console.info('[discussion/respond] inserting', {
      roomId,
      activityInstanceId: ctx.context.instance.id,
      activeActivityInstanceId: ctx.context.room.active_activity_instance_id,
      studentId,
      classId: ctx.context.room.class_id,
    })

    const { error: insertError } = await supabase.from('discussion_responses').insert({
      activity_instance_id: activityInstanceId,
      student_id: studentId,
      room_id: roomId,
      class_id: ctx.context.room.class_id,
      response_text: trimmed,
    })

    if (insertError) {
      console.error('[discussion/respond] insert failed', {
        roomId,
        activityInstanceId,
        studentId,
        error: formatSupabaseError(insertError),
      })

      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted a response', code: 'duplicate_response' },
          { status: 409 }
        )
      }

      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'Discussion responses table is not available. Apply the discussion_responses migration in Supabase.',
            code: insertError.code,
          },
          { status: 500 }
        )
      }

      if (insertError.code === '23503') {
        return NextResponse.json(
          {
            error: 'Student profile is invalid for this submission. Sign in again as a student.',
            code: insertError.code,
          },
          { status: 400 }
        )
      }

      if (insertError.code === '42501') {
        return NextResponse.json(
          {
            error:
              'Discussion submission was blocked by database permissions. Apply discussion_responses access migration.',
            code: insertError.code,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          error: insertError.message || 'Failed to save response',
          code: insertError.code ?? 'insert_failed',
          details: insertError.details ?? null,
          hint: insertError.hint ?? null,
        },
        { status: 500 }
      )
    }

    console.info('[discussion/respond] success', { roomId, activityInstanceId, studentId })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submit failed'
    console.error('[discussion/respond] unhandled error', {
      roomId,
      activityInstanceId,
      studentId,
      hasResponseText,
      message,
    })
    return NextResponse.json({ error: message, code: 'unhandled_error' }, { status: 500 })
  }
}
