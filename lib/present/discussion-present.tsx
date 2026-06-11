'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type {
  DiscussionResponseRow,
  DiscussionResponsesPayload,
  DiscussionVoteResultsPayload,
} from '@/lib/discussion/types'
import { DiscussionVoteResultsPresent } from './discussion-vote-results'
import { RoomQrCode } from './room-qr-code'

type DiscussionPresentProps = {
  roomId: string
  roomCode: string
  activityInstanceId: string
}

function TopBar({
  responseCount,
  roomCode,
  roomId,
  extra,
}: {
  responseCount: number
  roomCode: string
  roomId: string
  extra?: ReactNode
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 pb-5 md:pb-6">
      <div>
        <p className="text-lg md:text-xl font-semibold text-white tracking-tight">Discussion</p>
        <p className="mt-0.5 text-sm text-indigo-300/70 tabular-nums">
          {responseCount} {responseCount === 1 ? 'response' : 'responses'}
        </p>
        {extra}
      </div>
      <div className="flex items-center gap-2 md:gap-3 shrink-0 opacity-70">
        <span className="hidden sm:inline text-xs md:text-sm font-medium tracking-[0.18em] text-white/45">
          {roomCode}
        </span>
        <RoomQrCode roomId={roomId} roomCode={roomCode} variant="micro" />
      </div>
    </header>
  )
}

function ResponseCard({
  response,
  onSelect,
}: {
  response: DiscussionResponseRow
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[160px] w-full cursor-pointer flex-col gap-3 rounded-2xl bg-slate-900/55 p-5 md:p-6 text-left shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-colors hover:bg-slate-800/60"
    >
      <p className="text-xs md:text-sm font-medium text-indigo-300/80 truncate">{response.display_label}</p>
      <p className="text-base md:text-lg leading-snug text-white/92 line-clamp-3">{response.response_text}</p>
    </button>
  )
}

type ExpandedViewProps = {
  response: DiscussionResponseRow
  showOnScreenBadge: boolean
  onPrev: () => void
  onNext: () => void
  onBackToWall?: () => void
}

function ExpandedView({
  response,
  showOnScreenBadge,
  onPrev,
  onNext,
  onBackToWall,
}: ExpandedViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b0a12]">
      <div className="relative shrink-0 px-6 py-5 md:px-10 md:py-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
          <p className="text-lg font-semibold text-white">Discussion</p>
          {onBackToWall && (
            <button
              type="button"
              onClick={onBackToWall}
              className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Back
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 items-center">
        <div className="flex w-32 md:w-40 lg:w-48 shrink-0 items-center justify-center px-3 md:px-5">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-lg bg-white/10 px-3 py-2.5 text-sm md:text-base font-medium text-white transition hover:bg-white/20"
          >
            ← Previous
          </button>
        </div>

        <div className="flex flex-1 min-w-0 items-center justify-center px-2 py-6 md:py-8">
          <article className="w-full max-w-[1100px] max-h-[70vh] overflow-y-auto rounded-3xl bg-slate-900/70 px-10 py-12 md:px-14 md:py-14 lg:px-16 lg:py-16 shadow-[0_20px_70px_rgba(0,0,0,0.4)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
            {showOnScreenBadge && (
              <p className="mb-6 text-sm font-medium text-violet-300/90">On screen</p>
            )}
            <p className="mb-6 text-lg md:text-xl font-medium text-indigo-200/90">{response.display_label}</p>
            <blockquote className="text-3xl md:text-4xl lg:text-5xl font-medium leading-[1.2] text-white whitespace-pre-wrap">
              &ldquo;{response.response_text}&rdquo;
            </blockquote>
          </article>
        </div>

        <div className="flex w-32 md:w-40 lg:w-48 shrink-0 items-center justify-center px-3 md:px-5">
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-white/10 px-3 py-2.5 text-sm md:text-base font-medium text-white transition hover:bg-white/20"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

export function DiscussionPresent({
  roomId,
  roomCode,
  activityInstanceId,
}: DiscussionPresentProps) {
  const [payload, setPayload] = useState<DiscussionResponsesPayload | null>(null)
  const [voteResults, setVoteResults] = useState<DiscussionVoteResultsPayload | null>(null)
  const [localExpandedId, setLocalExpandedId] = useState<string | null>(null)
  const [browseIndex, setBrowseIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadResponses() {
      try {
        const res = await fetch(
          `/api/discussion/responses?activity_instance_id=${encodeURIComponent(activityInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setPayload(json as DiscussionResponsesPayload)
        }
      } catch {
        // ignore refresh errors on projector
      }
    }

    void loadResponses()
    const interval = setInterval(loadResponses, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activityInstanceId])

  const phase = payload?.phase ?? 'collecting'

  useEffect(() => {
    if (phase !== 'voting' && phase !== 'results') {
      setVoteResults(null)
      return
    }

    let cancelled = false

    async function loadVoteResults() {
      try {
        const res = await fetch(
          `/api/discussion/vote-results?activity_instance_id=${encodeURIComponent(activityInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setVoteResults(json as DiscussionVoteResultsPayload)
        }
      } catch {
        // ignore refresh errors on projector
      }
    }

    void loadVoteResults()
    const interval = setInterval(loadVoteResults, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activityInstanceId, phase])

  const question = payload?.question ?? 'Loading discussion...'
  const responses = payload?.responses ?? []
  const responseCount = responses.length
  const teacherSelectedId = payload?.selectedResponseId ?? null

  const teacherHasSelection = Boolean(
    teacherSelectedId && responses.some((r) => r.id === teacherSelectedId)
  )
  const isLocallyExpanded = Boolean(
    localExpandedId && responses.some((r) => r.id === localExpandedId)
  )
  const isExpanded = teacherHasSelection || isLocallyExpanded

  const syncIndexToId = useCallback(
    (id: string) => {
      const idx = responses.findIndex((r) => r.id === id)
      if (idx >= 0) setBrowseIndex(idx)
    },
    [responses]
  )

  useEffect(() => {
    if (teacherSelectedId) {
      syncIndexToId(teacherSelectedId)
    }
  }, [teacherSelectedId, syncIndexToId])

  useEffect(() => {
    if (!teacherSelectedId && !localExpandedId) {
      return
    }
    if (localExpandedId && !teacherSelectedId) {
      syncIndexToId(localExpandedId)
    }
  }, [localExpandedId, teacherSelectedId, syncIndexToId])

  useEffect(() => {
    if (browseIndex >= responseCount && responseCount > 0) {
      setBrowseIndex(responseCount - 1)
    }
  }, [browseIndex, responseCount])

  const displayedResponse = responses[browseIndex] ?? null

  const showOnScreenBadge = Boolean(
    teacherHasSelection && displayedResponse?.id === teacherSelectedId
  )

  const goPrev = useCallback(() => {
    if (responseCount === 0) return
    setBrowseIndex((i) => (i - 1 + responseCount) % responseCount)
  }, [responseCount])

  const goNext = useCallback(() => {
    if (responseCount === 0) return
    setBrowseIndex((i) => (i + 1) % responseCount)
  }, [responseCount])

  const backToWall = useCallback(() => {
    if (teacherHasSelection) return
    setLocalExpandedId(null)
  }, [teacherHasSelection])

  const openLocalExpanded = useCallback(
    (responseId: string) => {
      setLocalExpandedId(responseId)
      syncIndexToId(responseId)
    },
    [syncIndexToId]
  )

  useEffect(() => {
    if (!isExpanded || responseCount === 0) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'Escape' && !teacherHasSelection) {
        e.preventDefault()
        backToWall()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isExpanded, responseCount, goPrev, goNext, backToWall, teacherHasSelection])

  const leaderboardItems =
    voteResults?.results.map((row) => ({
      id: row.response_id,
      label: row.display_label,
      voteCount: row.vote_count,
    })) ?? []

  const totalVotesCast = voteResults?.total_votes_cast ?? 0

  if (isExpanded && displayedResponse && responseCount > 0) {
    return (
      <ExpandedView
        response={displayedResponse}
        showOnScreenBadge={showOnScreenBadge}
        onPrev={goPrev}
        onNext={goNext}
        onBackToWall={teacherHasSelection ? undefined : backToWall}
      />
    )
  }

  if (phase === 'voting') {
    return (
      <DiscussionVoteResultsPresent
        question={question}
        totalVotesCast={totalVotesCast}
        items={leaderboardItems}
        statusLabel="Voting in progress"
        roomId={roomId}
        roomCode={roomCode}
      />
    )
  }

  if (phase === 'results') {
    return (
      <DiscussionVoteResultsPresent
        question={question}
        totalVotesCast={totalVotesCast}
        items={leaderboardItems}
        roomId={roomId}
        roomCode={roomCode}
        onItemClick={openLocalExpanded}
      />
    )
  }

  const isEmpty = responseCount === 0

  return (
    <div className="relative flex h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full max-w-[1500px] mx-auto flex-col min-h-0">
      <TopBar responseCount={responseCount} roomCode={roomCode} roomId={roomId} />

      <section
        className={`relative shrink-0 flex justify-center ${isEmpty ? 'mb-10 md:mb-14' : 'mb-5 md:mb-6'}`}
      >
        <div className="w-full max-w-4xl">
          <div
            className={`rounded-2xl md:rounded-3xl bg-white/[0.04] text-center shadow-[0_16px_50px_rgba(0,0,0,0.3)] ${
              isEmpty
                ? 'px-8 py-12 md:px-14 md:py-16'
                : 'px-6 py-6 md:px-10 md:py-8'
            }`}
          >
            <h1
              className={`font-semibold text-white leading-tight text-balance ${
                isEmpty
                  ? 'text-4xl md:text-5xl lg:text-6xl'
                  : 'text-2xl md:text-3xl lg:text-[2rem]'
              }`}
            >
              {question}
            </h1>
          </div>
        </div>
      </section>

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl md:text-2xl font-medium text-indigo-200/75 text-center">
            Waiting for student responses…
          </p>
        </div>
      ) : (
        <section className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 pb-4">
              {responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  onSelect={() => openLocalExpanded(response.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
