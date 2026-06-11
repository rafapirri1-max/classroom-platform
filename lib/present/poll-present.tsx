'use client'

import { useEffect, useMemo, useState } from 'react'
import { ResultsLadder, type ResultsLadderItem } from './results-ladder'
import type { PollLaunchConfig } from '@/lib/poll/types'
import type { PollResultsPayload } from '@/lib/poll/results'

type PollPresentProps = {
  launchConfig: PollLaunchConfig
  activityInstanceId: string
}

export function PollPresent({ launchConfig, activityInstanceId }: PollPresentProps) {
  const [results, setResults] = useState<PollResultsPayload | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadResults() {
      try {
        const res = await fetch(
          `/api/poll/results?activity_instance_id=${encodeURIComponent(activityInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setResults(json as PollResultsPayload)
        }
      } catch {
        // ignore refresh errors on projector
      }
    }

    void loadResults()
    const interval = setInterval(loadResults, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activityInstanceId])

  const ladderItems: ResultsLadderItem[] = useMemo(() => {
    const options =
      results?.options ??
      launchConfig.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        count: 0,
        percent: 0,
      }))
    return options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      value: opt.count,
    }))
  }, [results?.options, launchConfig.options])

  const totalVotes = results?.total_votes ?? 0

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6 py-6 md:py-10">
      <header className="mx-auto w-full max-w-[1100px] text-center mb-10 md:mb-12 lg:mb-14">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight text-balance mb-5 md:mb-6">
          {launchConfig.question}
        </h1>
        <p className="text-lg md:text-xl text-indigo-200/90">
          <span className="text-3xl md:text-4xl font-bold text-white tabular-nums">{totalVotes}</span>
          <span className="ml-2">
            vote{totalVotes === 1 ? '' : 's'}
          </span>
        </p>
      </header>

      <ResultsLadder items={ladderItems} />
    </div>
  )
}
