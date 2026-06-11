'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  layoutWordCloudWords,
  wordCloudLayoutKey,
} from '@/lib/wordcloud/presentation-layout'
import type { WordCloudAggregatePayload } from '@/lib/wordcloud/types'

type WordCloudPresentProps = {
  activityInstanceId: string
}

export function WordCloudPresent({ activityInstanceId }: WordCloudPresentProps) {
  const [payload, setPayload] = useState<WordCloudAggregatePayload | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAggregate() {
      try {
        const res = await fetch(
          `/api/wordcloud/aggregate?activity_instance_id=${encodeURIComponent(activityInstanceId)}`
        )
        const json = await res.json()
        if (!cancelled && res.ok && !json.error) {
          setPayload(json as WordCloudAggregatePayload)
        }
      } catch {
        // ignore refresh errors on projector
      }
    }

    void loadAggregate()
    const interval = setInterval(loadAggregate, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activityInstanceId])

  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    const update = () => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight })
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [payload?.phase])

  const words = payload?.words ?? []
  const layoutKey = useMemo(() => wordCloudLayoutKey(words), [words])
  const placedWords = useMemo(
    () =>
      words.length > 0 && stageSize.width > 0 && stageSize.height > 0
        ? layoutWordCloudWords(words, stageSize)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey, stageSize.width, stageSize.height]
  )

  if (!payload) {
    return <div className="text-center text-2xl text-indigo-200">Loading word cloud...</div>
  }

  const isRevealed = payload.phase === 'revealed'
  const responseCount = payload.response_count ?? 0

  if (!isRevealed) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-6 sm:px-10 py-10">
        <div className="mx-auto w-full max-w-[1100px] text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight text-balance mb-8 md:mb-10">
            {payload.question}
          </h1>
          <p className="text-xl md:text-2xl text-indigo-200/90 mb-4">
            Responses are coming in...
          </p>
          <p className="text-3xl md:text-5xl font-bold text-white tabular-nums">
            {responseCount}
          </p>
          <p className="text-lg md:text-xl text-indigo-300/80 mt-2">
            response{responseCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-[85vh] flex flex-col px-4 sm:px-6 py-4 md:py-6">
      <header className="mx-auto w-full max-w-[1200px] text-center mb-3 md:mb-4 shrink-0">
        <p className="text-sm md:text-base uppercase tracking-[0.2em] text-indigo-300/70 mb-2">
          Question
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-indigo-100/90 leading-snug text-balance">
          {payload.question}
        </h1>
      </header>

      {words.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <p className="text-2xl md:text-3xl text-indigo-200/90">No responses yet.</p>
        </div>
      ) : (
        <div
          ref={stageRef}
          className="relative mx-auto w-full max-w-[1400px] flex-1 min-h-[65vh] md:min-h-[70vh] overflow-hidden"
        >
          {placedWords.map((word) => (
            <span
              key={word.text}
              className="absolute font-bold leading-none select-none whitespace-nowrap"
              style={{
                left: `${word.left}%`,
                top: `${word.top}%`,
                fontSize: `${word.fontSize}px`,
                color: word.color,
                transform: 'translate(-50%, -50%)',
                textShadow: '0 2px 18px rgba(0,0,0,0.45)',
              }}
              title={`${word.count} submission${word.count === 1 ? '' : 's'}`}
            >
              {word.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
