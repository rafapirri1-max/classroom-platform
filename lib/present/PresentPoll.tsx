'use client'

import { useEffect, useState } from 'react'
import type { PollLaunchConfig } from '@/lib/poll/types'
import type { PollResultsPayload } from '@/lib/poll/results'

type PresentPollProps = {
  launchConfig: PollLaunchConfig
  activityInstanceId: string
}

export function PresentPoll({ launchConfig, activityInstanceId }: PresentPollProps) {
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
        // ignore refresh errors
      }
    }

    void loadResults()
    const interval = setInterval(loadResults, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activityInstanceId])

  const options =
    results?.options ??
    launchConfig.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      count: 0,
      percent: 0,
    }))

  const totalVotes = results?.total_votes ?? 0

  return (
    <div className="w-full max-w-5xl mx-auto px-8">
      <p className="text-2xl text-indigo-300 mb-4 text-center">📊 Quick Poll</p>
      <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12 leading-tight">
        {launchConfig.question}
      </h1>
      <div className="space-y-6">
        {options.map((opt) => (
          <div key={opt.id}>
            <div className="flex justify-between items-baseline gap-4 mb-2">
              <span className="text-2xl md:text-3xl text-white font-medium">{opt.label}</span>
              <span className="text-xl md:text-2xl text-indigo-200 shrink-0">
                {opt.count}{' '}
                <span className="text-indigo-400">({opt.percent}%)</span>
              </span>
            </div>
            <div className="h-4 md:h-5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${opt.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-2xl text-indigo-300 mt-12">
        <span className="text-4xl font-bold text-white">{totalVotes}</span> votes
      </p>
    </div>
  )
}
