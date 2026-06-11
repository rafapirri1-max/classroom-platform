'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { DiscussionComparisonSide, DiscussionVotePairPayload } from './types'

type DiscussionVotingPanelProps = {
  roomId: string
  activityInstanceId: string
  studentId: string
  question: string
  anonymous?: boolean
}

type VoteCardProps = {
  response: DiscussionComparisonSide
  disabled: boolean
  selected: boolean
  onSelect: () => void
}

function VoteResponseCard({ response, disabled, selected, onSelect }: VoteCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'group relative w-full min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] rounded-2xl text-left',
        'p-8',
        'cursor-pointer touch-manipulation transition-all duration-200 ease-out',
        'border-2 bg-[#1c1834]/95',
        'shadow-[0_8px_28px_rgba(0,0,0,0.28)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0d18]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'scale-[1.01] border-violet-400 bg-violet-500/25 shadow-[0_0_40px_rgba(139,92,246,0.4)]'
          : [
              'border-white/20',
              'hover:-translate-y-1 hover:border-violet-400/50 hover:bg-[#221e3f]/95',
              'hover:shadow-[0_12px_36px_rgba(139,92,246,0.28)]',
              'active:scale-[0.99] active:translate-y-0 active:border-violet-400/60',
            ].join(' '),
      ].join(' ')}
    >
      <p className="text-xs font-medium text-indigo-300/70 mb-3 uppercase tracking-wide">
        {response.display_label}
      </p>
      <p className="text-xl sm:text-2xl lg:text-[1.65rem] text-white font-semibold leading-relaxed whitespace-pre-wrap">
        {response.response_text}
      </p>
    </button>
  )
}

function maxUniqueComparisons(responseCount: number): number {
  if (responseCount < 2) return 0
  return (responseCount * (responseCount - 1)) / 2
}

type ContextPanelProps = {
  question: string
  anonymous?: boolean
  comparisonNumber: number
  maxComparisons: number
}

function DiscussionContextPanel({
  question,
  anonymous,
  comparisonNumber,
  maxComparisons,
}: ContextPanelProps) {
  const progressLabel =
    maxComparisons > 0
      ? `Comparison ${comparisonNumber} of ${maxComparisons}`
      : `Comparison ${comparisonNumber}`

  return (
    <aside className="w-full min-w-0">
      <div className="rounded-2xl border border-white/20 bg-[#15122a]/95 backdrop-blur-sm p-6 sm:p-7 lg:p-8 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
        <p className="text-xs font-semibold text-violet-300/80 uppercase tracking-wide">Discussion · Voting</p>
        <p className="mt-4 text-lg sm:text-xl lg:text-[1.35rem] text-white font-semibold leading-relaxed">
          {question}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-indigo-100 tabular-nums">
            {progressLabel}
          </span>
          {anonymous ? (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-indigo-300/70">
              Anonymous
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export function DiscussionVotingPanel({
  roomId,
  activityInstanceId,
  studentId,
  question,
  anonymous = false,
}: DiscussionVotingPanelProps) {
  const [pair, setPair] = useState<DiscussionVotePairPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [votesCast, setVotesCast] = useState(0)
  const [maxComparisons, setMaxComparisons] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const res = await fetch(
          `/api/discussion/responses?activity_instance_id=${encodeURIComponent(activityInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error && Array.isArray(json.responses)) {
          setMaxComparisons(maxUniqueComparisons(json.responses.length))
        }
      } catch {
        // progress total is optional display
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activityInstanceId])

  const loadPair = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        room_id: roomId,
        activity_instance_id: activityInstanceId,
        student_id: studentId,
      })
      const res = await fetch(`/api/discussion/vote-pair?${params}`)
      let json: { error?: string; code?: string; details?: string; hint?: string } = {}
      try {
        json = (await res.json()) as typeof json
      } catch {
        throw new Error(`Could not load comparison (HTTP ${res.status})`)
      }
      if (!res.ok || json.error) {
        const parts = [json.error || `Could not load comparison (HTTP ${res.status})`]
        if (json.code) parts.push(`code=${json.code}`)
        if (json.details) parts.push(String(json.details))
        if (json.hint) parts.push(String(json.hint))
        throw new Error(parts.join(' | '))
      }
      setPair(json as DiscussionVotePairPayload)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not load comparison'
      setError(message)
      setPair(null)
    } finally {
      setLoading(false)
    }
  }, [roomId, activityInstanceId, studentId])

  useEffect(() => {
    void loadPair()
  }, [loadPair])

  async function handleCardVote(selectedResponseId: string) {
    if (!pair || voting) return

    setPickedId(selectedResponseId)
    setVoting(true)
    setError('')

    await new Promise((resolve) => setTimeout(resolve, 280))

    try {
      const res = await fetch('/api/discussion/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          activity_instance_id: activityInstanceId,
          student_id: studentId,
          left_response_id: pair.left.id,
          right_response_id: pair.right.id,
          selected_response_id: selectedResponseId,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Vote failed')
      }
      setVotesCast((count) => count + 1)
      setPickedId(null)
      await loadPair()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vote failed'
      setError(message)
      setPickedId(null)
    } finally {
      setVoting(false)
    }
  }

  const comparisonNumber = votesCast + 1

  const layoutShell = (comparison: ReactNode) => (
    <main className="mx-auto w-full max-w-[1200px]">
      <div className="grid grid-cols-1 gap-5 sm:grid sm:grid-cols-[minmax(300px,35%)_minmax(0,1fr)] sm:items-start sm:gap-6 lg:gap-8">
        <DiscussionContextPanel
          question={question}
          anonymous={anonymous}
          comparisonNumber={comparisonNumber}
          maxComparisons={maxComparisons}
        />
        <div className="min-w-0 flex flex-col justify-start gap-3">
          {comparison}
        </div>
      </div>
    </main>
  )

  if (loading && !pair) {
    return layoutShell(
      <p className="text-center sm:text-left text-indigo-200/75 text-sm py-10">Loading comparison...</p>
    )
  }

  if (!pair) {
    return layoutShell(
      <div className="text-center sm:text-left space-y-3 py-6">
        <p className="text-amber-200/90 text-sm">{error || 'No comparison available right now.'}</p>
        <button
          type="button"
          onClick={() => void loadPair()}
          className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15"
        >
          Try again
        </button>
      </div>
    )
  }

  return layoutShell(
    <>
      <VoteResponseCard
        response={pair.left}
        disabled={voting}
        selected={pickedId === pair.left.id}
        onSelect={() => void handleCardVote(pair.left.id)}
      />

      <p className="text-center text-xs font-medium text-indigo-400/50 uppercase tracking-[0.2em] py-1 select-none" aria-hidden>
        vs
      </p>

      <VoteResponseCard
        response={pair.right}
        disabled={voting}
        selected={pickedId === pair.right.id}
        onSelect={() => void handleCardVote(pair.right.id)}
      />

      {error && <p className="text-center sm:text-left text-red-300/90 text-xs sm:text-sm pt-1">{error}</p>}
    </>
  )
}
