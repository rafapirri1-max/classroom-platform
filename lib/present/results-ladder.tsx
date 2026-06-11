/**
 * Results Ladder — projector-friendly ranking for student/presentation surfaces.
 * Plain HTML/CSS divs only. No chart libraries, axes, or dashboard chrome.
 *
 *   Option A
 *   ████████████████████ 12
 *
 *   Option B
 *   ███████████ 7
 */

export type ResultsLadderItem = {
  id: string
  label: string
  value: number
}

export type ResultsLadderProps = {
  items: ResultsLadderItem[]
  title?: string
  subtitle?: string
  maxItems?: number
  className?: string
}

function sortLadderItems(items: ResultsLadderItem[]): ResultsLadderItem[] {
  return [...items].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}

function maxValue(items: ResultsLadderItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.value), 0)
}

/** Filled portion width inside the row track. Leader = 100%. */
function barWidthPercent(value: number, peak: number): number {
  if (peak <= 0 || value <= 0) return 0
  return (value / peak) * 100
}

/** Row track width — proportional to leader; zero rows get a small faint placeholder. */
function trackWidthPercent(value: number, peak: number): number {
  if (peak <= 0) return 100
  if (value > 0) return (value / peak) * 100
  return 16
}

type LadderRowProps = {
  item: ResultsLadderItem
  peak: number
}

function LadderRow({ item, peak }: LadderRowProps) {
  const fillPercent = barWidthPercent(item.value, peak)
  const trackPercent = trackWidthPercent(item.value, peak)
  const hasFill = fillPercent > 0

  return (
    <div className="w-full">
      <p
        className="mb-2 md:mb-2.5 text-xl md:text-2xl lg:text-[1.75rem] font-semibold text-white leading-snug"
        title={item.label}
      >
        {item.label}
      </p>

      <div className="flex items-center gap-2 md:gap-3">
        <div
          className="h-7 md:h-8 lg:h-9 shrink-0 rounded-md md:rounded-lg bg-white/[0.12] border border-white/15 overflow-hidden"
          style={{ width: `${trackPercent}%` }}
        >
          {hasFill ? (
            <div
              className="h-full rounded-md md:rounded-lg bg-violet-400 shadow-[0_0_0_1px_rgba(167,139,250,0.35)]"
              style={{ width: `${fillPercent}%`, minWidth: '0.75rem' }}
            />
          ) : null}
        </div>

        <span
          className={`shrink-0 text-2xl md:text-3xl lg:text-4xl font-bold tabular-nums leading-none ${
            hasFill ? 'text-white' : 'text-white/50'
          }`}
        >
          {item.value}
        </span>
      </div>
    </div>
  )
}

export function ResultsLadder({
  items,
  title,
  subtitle,
  maxItems,
  className = '',
}: ResultsLadderProps) {
  const sorted = sortLadderItems(items)
  const visible = typeof maxItems === 'number' ? sorted.slice(0, maxItems) : sorted
  const peak = maxValue(visible)

  return (
    <section
      className={`mx-auto w-full max-w-[1100px] px-6 sm:px-8 md:px-10 ${className}`.trim()}
    >
      {title ? (
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 text-center">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="text-lg md:text-xl text-indigo-200/85 mb-8 md:mb-10 text-center">{subtitle}</p>
      ) : null}

      <div className="space-y-6 md:space-y-7 lg:space-y-8">
        {visible.map((item) => (
          <LadderRow key={item.id} item={item} peak={peak} />
        ))}
      </div>
    </section>
  )
}
