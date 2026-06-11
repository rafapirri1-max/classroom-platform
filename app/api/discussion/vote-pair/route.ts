import { formatDiscussionDisplayLabel } from '@/lib/discussion/display'
import { pairKey, pickComparisonPair } from '@/lib/discussion/pair-selection'
import { loadDiscussionVoteContext } from '@/lib/discussion/vote-context'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

function countEligiblePairs(responseCount: number): number {
  if (responseCount < 2) return 0
  return (responseCount * (responseCount - 1)) / 2
}

function mapSupabaseErrorToUserMessage(
  error: { message?: string; code?: string; details?: string; hint?: string },
  table: 'discussion_votes' | 'discussion_responses' | 'students'
): string {
  const formatted = formatSupabaseError(error)

  if (error.code === '42P01') {
    if (table === 'discussion_votes') {
      return `discussion_votes table is not available. Apply migrations 20250605130000_discussion_v2_voting.sql and 20250605130001_discussion_votes_access.sql. (${formatted})`
    }
    return `${table} table is not available. (${formatted})`
  }

  if (error.code === '42501') {
    if (table === 'discussion_votes') {
      return `discussion_votes query blocked by database permissions. Apply migration 20250605130001_discussion_votes_access.sql. (${formatted})`
    }
    return `Database permissions blocked this request. (${formatted})`
  }

  return formatted || 'Vote pair failed'
}

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('room_id')
  const activityInstanceId = request.nextUrl.searchParams.get('activity_instance_id')
  const studentId = request.nextUrl.searchParams.get('student_id')

  console.info('[discussion/vote-pair] request', {
    roomId,
    activityInstanceId,
    studentId: studentId ? `${studentId.slice(0, 8)}…` : null,
  })

  try {
    if (!roomId || !activityInstanceId || !studentId) {
      return NextResponse.json(
        { error: 'room_id, activity_instance_id, and student_id are required' },
        { status: 400 }
      )
    }

    const ctx = await loadDiscussionVoteContext(supabase, roomId, activityInstanceId)
    if (!ctx.ok) {
      console.warn('[discussion/vote-pair] context rejected', {
        roomId,
        activityInstanceId,
        studentId,
        error: ctx.error,
        status: ctx.status,
      })
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    console.info('[discussion/vote-pair] context ok', {
      roomId,
      activityInstanceId,
      studentId,
      phase: ctx.context.launchConfig.phase,
      activeActivityInstanceId: ctx.context.room.active_activity_instance_id,
    })

    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle()

    if (studentError) {
      console.error('[discussion/vote-pair] student lookup failed', {
        roomId,
        activityInstanceId,
        studentId,
        error: formatSupabaseError(studentError),
      })
      return NextResponse.json(
        {
          error: mapSupabaseErrorToUserMessage(studentError, 'students'),
          code: studentError.code ?? null,
        },
        { status: 500 }
      )
    }

    if (!studentRow) {
      console.warn('[discussion/vote-pair] student profile missing', {
        roomId,
        activityInstanceId,
        studentId,
      })
      return NextResponse.json(
        { error: 'You must be signed in to vote.' },
        { status: 403 }
      )
    }

    const { data: rows, error: rowsError } = await supabase
      .from('discussion_responses')
      .select('id, student_id, response_text, created_at')
      .eq('activity_instance_id', activityInstanceId)
      .order('created_at', { ascending: true })

    if (rowsError) {
      console.error('[discussion/vote-pair] discussion_responses query failed', {
        roomId,
        activityInstanceId,
        studentId,
        error: formatSupabaseError(rowsError),
      })
      return NextResponse.json(
        {
          error: mapSupabaseErrorToUserMessage(rowsError, 'discussion_responses'),
          code: rowsError.code ?? null,
        },
        { status: 500 }
      )
    }

    const responseCount = rows?.length ?? 0
    const eligiblePairs = countEligiblePairs(responseCount)

    console.info('[discussion/vote-pair] responses loaded', {
      roomId,
      activityInstanceId,
      studentId,
      phase: ctx.context.launchConfig.phase,
      responseCount,
      eligiblePairs,
    })

    if (responseCount < 2) {
      return NextResponse.json(
        { error: 'Voting needs at least 2 responses.' },
        { status: 400 }
      )
    }

    const studentIds = Array.from(new Set(rows.map((row) => row.student_id as string)))
    const nameByStudentId = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: students } = await supabase.from('students').select('id, name').in('id', studentIds)
      for (const student of students || []) {
        nameByStudentId.set(student.id as string, (student.name as string) || 'Student')
      }
    }

    const responseById = new Map(
      rows.map((row, index) => {
        const responseNumber = index + 1
        const studentName = nameByStudentId.get(row.student_id as string) || 'Student'
        return [
          row.id as string,
          {
            id: row.id as string,
            response_number: responseNumber,
            display_label: formatDiscussionDisplayLabel(
              ctx.context.launchConfig.anonymous,
              responseNumber,
              studentName
            ),
            response_text: row.response_text as string,
          },
        ]
      })
    )

    const { data: priorVotes, error: votesError } = await supabase
      .from('discussion_votes')
      .select('left_response_id, right_response_id')
      .eq('activity_instance_id', activityInstanceId)
      .eq('student_id', studentId)

    if (votesError) {
      console.error('[discussion/vote-pair] discussion_votes query failed', {
        roomId,
        activityInstanceId,
        studentId,
        phase: ctx.context.launchConfig.phase,
        responseCount,
        eligiblePairs,
        error: formatSupabaseError(votesError),
      })
      return NextResponse.json(
        {
          error: mapSupabaseErrorToUserMessage(votesError, 'discussion_votes'),
          code: votesError.code ?? null,
          details: votesError.details ?? null,
          hint: votesError.hint ?? null,
        },
        { status: 500 }
      )
    }

    const completedPairKeys = new Set(
      (priorVotes || []).map((vote) =>
        pairKey(vote.left_response_id as string, vote.right_response_id as string)
      )
    )

    const comparison = pickComparisonPair(
      rows.map((row) => row.id as string),
      completedPairKeys
    )

    if (!comparison) {
      console.warn('[discussion/vote-pair] no comparison pair generated', {
        roomId,
        activityInstanceId,
        studentId,
        responseCount,
        eligiblePairs,
        priorVotesCount: priorVotes?.length ?? 0,
      })
      return NextResponse.json(
        { error: 'Voting needs at least 2 responses.' },
        { status: 400 }
      )
    }

    const left = responseById.get(comparison.displayLeftId)
    const right = responseById.get(comparison.displayRightId)
    if (!left || !right) {
      console.error('[discussion/vote-pair] pair mapping failed', {
        roomId,
        activityInstanceId,
        studentId,
        displayLeftId: comparison.displayLeftId,
        displayRightId: comparison.displayRightId,
      })
      return NextResponse.json({ error: 'Failed to build comparison pair' }, { status: 500 })
    }

    console.info('[discussion/vote-pair] success', {
      roomId,
      activityInstanceId,
      studentId,
      phase: ctx.context.launchConfig.phase,
      leftId: left.id,
      rightId: right.id,
      priorVotesCount: priorVotes?.length ?? 0,
    })

    return NextResponse.json({
      activity_instance_id: activityInstanceId,
      phase: ctx.context.launchConfig.phase,
      left,
      right,
      canonical_left_id: comparison.canonicalLeftId,
      canonical_right_id: comparison.canonicalRightId,
    })
  } catch (error: unknown) {
    const supabaseLike =
      error && typeof error === 'object'
        ? (error as { message?: string; code?: string; details?: string; hint?: string })
        : null
    const message =
      supabaseLike?.message != null
        ? formatSupabaseError(supabaseLike)
        : error instanceof Error
          ? error.message
          : 'Vote pair failed'

    console.error('[discussion/vote-pair] unhandled error', {
      roomId,
      activityInstanceId,
      studentId,
      message,
      code: supabaseLike?.code ?? null,
      details: supabaseLike?.details ?? null,
      hint: supabaseLike?.hint ?? null,
    })

    return NextResponse.json(
      {
        error: message,
        code: supabaseLike?.code ?? null,
      },
      { status: 500 }
    )
  }
}
