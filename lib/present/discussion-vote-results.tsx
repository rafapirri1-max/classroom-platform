'use client'

import type { ReactNode } from 'react'
import { RoomQrCode } from './room-qr-code'

export type DiscussionVoteLeaderboardItem = {
  id: string
  label: string
  voteCount: number
}

export type DiscussionVoteResultsPresentProps = {
  question: string
  totalVotesCast: number
  items: DiscussionVoteLeaderboardItem[]
  statusLabel?: string
  roomId: string
  roomCode: string
  onItemClick?: (id: string) => void
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const
const RANK_PLACE_LABELS = ['First place', 'Second place', 'Third place'] as const

function sortByVotesDesc(items: DiscussionVoteLeaderboardItem[]): DiscussionVoteLeaderboardItem[] {
  return [...items].sort((a, b) => b.voteCount - a.voteCount || a.label.localeCompare(b.label))
}

function peakVoteCount(items: DiscussionVoteLeaderboardItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.voteCount), 0)
}

function barFillPercent(voteCount: number, peak: number): number {
  if (peak <= 0 || voteCount <= 0) return 0
  return (voteCount / peak) * 100
}

type LeaderboardRowProps = {
  item: DiscussionVoteLeaderboardItem
  rank: number
  peak: number
  onItemClick?: (id: string) => void
}

function LeaderboardRow({ item, rank, peak, onItemClick }: LeaderboardRowProps) {
  const fillPercent = barFillPercent(item.voteCount, peak)
  const hasVotes = item.voteCount > 0
  const medal = rank < 3 ? RANK_MEDALS[rank] : null
  const placeLabel = rank < 3 ? RANK_PLACE_LABELS[rank] : null

  const row = (
    <div className="w-full text-left">
      <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
        {medal ? (
          <span className="text-3xl md:text-4xl leading-none shrink-0" aria-hidden>
            {medal}
          </span>
        ) : null}
        <div className="min-w-0">
          {placeLabel ? (
            <p className="text-sm md:text-base font-medium text-violet-300/90 mb-1">{placeLabel}</p>
          ) : null}
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight truncate">
            {item.label}
          </p>
        </div>
      </div>

      <div className="w-full h-9 md:h-11 lg:h-12 rounded-lg md:rounded-xl bg-white/[0.1] border border-white/10 overflow-hidden">
        {hasVotes ? (
          <div
            className="h-full rounded-lg md:rounded-xl bg-violet-400 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-[width] duration-500 ease-out"
            style={{ width: `${fillPercent}%`, minWidth: '0.75rem' }}
          />
        ) : null}
      </div>

      <p className="mt-2 md:mt-3 text-lg md:text-xl lg:text-2xl text-indigo-200/90">
        <span className="font-bold text-white tabular-nums">{item.voteCount}</span>
        <span className="ml-1.5">{item.voteCount === 1 ? 'vote' : 'votes'}</span>
      </p>
    </div>
  )

  if (onItemClick) {
    return (
      <button
        type="button"
        onClick={() => onItemClick(item.id)}
        className="w-full rounded-2xl px-3 py-4 md:px-4 md:py-5 -mx-3 md:-mx-4 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {row}
      </button>
    )
  }

  return <div className="px-1">{row}</div>
}

function PresentationShell({
  question,
  totalVotesCast,
  statusLabel,
  roomId,
  roomCode,
  children,
}: {
  question: string
  totalVotesCast: number
  statusLabel?: string
  roomId: string
  roomCode: string
  children: ReactNode
}) {
  return (
    <div className="relative flex h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full flex-col min-h-0">
      <div className="mx-auto w-full max-w-[1320px] flex-1 min-h-0 flex flex-col px-6 sm:px-10 md:px-12 lg:px-14 py-6 md:py-8">
        <header className="shrink-0 flex items-start justify-between gap-6 mb-8 md:mb-10">
          <div className="min-w-0 flex-1" />
          <div className="flex items-center gap-2 shrink-0 opacity-60">
            <span className="hidden sm:inline text-xs font-medium tracking-[0.18em] text-white/45">
              {roomCode}
            </span>
            <RoomQrCode roomId={roomId} roomCode={roomCode} variant="micro" />
          </div>
        </header>

        <section className="shrink-0 text-center mb-8 md:mb-10">
          {statusLabel ? (
            <p className="text-base md:text-lg font-semibold text-violet-300 mb-4">{statusLabel}</p>
          ) : null}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-white leading-tight text-balance">
            {question}
          </h1>
          <p className="mt-6 md:mt-8 text-xl md:text-2xl lg:text-3xl text-indigo-200/90">
            <span className="font-bold text-white tabular-nums">{totalVotesCast}</span>
            {' '}
            {totalVotesCast === 1 ? 'vote cast' : 'votes cast'}
          </p>
        </section>

        <section className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-6 [scrollbar-width:thin]">
          {children}
        </section>
      </div>
    </div>
  )
}

function VotingWaitingState() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[200px]">
      <p className="text-xl md:text-2xl lg:text-3xl font-medium text-indigo-200/85 text-center">
        Waiting for student votes…
      </p>
    </div>
  )
}

export function DiscussionVoteResultsPresent({
  question,
  totalVotesCast,
  items,
  statusLabel,
  roomId,
  roomCode,
  onItemClick,
}: DiscussionVoteResultsPresentProps) {
  const isLiveVoting = Boolean(statusLabel)
  const showWaitingState = isLiveVoting && totalVotesCast === 0

  if (showWaitingState) {
    return (
      <PresentationShell
        question={question}
        totalVotesCast={totalVotesCast}
        statusLabel={statusLabel}
        roomId={roomId}
        roomCode={roomCode}
      >
        <VotingWaitingState />
      </PresentationShell>
    )
  }

  const sorted = sortByVotesDesc(items)
  const peak = peakVoteCount(sorted)

  return (
    <PresentationShell
      question={question}
      totalVotesCast={totalVotesCast}
      statusLabel={statusLabel}
      roomId={roomId}
      roomCode={roomCode}
    >
      {totalVotesCast > 0 && sorted.length > 0 ? (
        <div className="space-y-8 md:space-y-10 lg:space-y-12 max-w-[1200px] mx-auto">
          {sorted.map((item, index) => (
            <LeaderboardRow
              key={item.id}
              item={item}
              rank={index}
              peak={peak}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center min-h-[200px]">
          <p className="text-xl md:text-2xl text-indigo-200/80 text-center">No votes recorded.</p>
        </div>
      )}
    </PresentationShell>
  )
}
