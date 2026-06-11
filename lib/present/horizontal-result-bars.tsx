/**
 * Platform Presentation Rule (Presentation + Student views only — not Teacher Analytics):
 * Aggregated results use horizontal bar charts where bar length encodes value:
 *
 *   Option A   ████████████ 12
 *   Option B   ████████ 8
 *
 * - label left, filled bar, count immediately after the bar
 * - sorted highest → lowest
 * - large labels and counts, dark-mode / projector friendly
 */

export type ResultBarItem = {
  id: string
  label: string
  count: number
}

export type HorizontalResultBarsProps = {
  items: ResultBarItem[]
  /**
   * Denominator for bar length. When set (e.g. poll total votes), bars show share of total.
   * Otherwise bars scale to the highest count in the set.
   */
  total?: number
  /** Sort by count descending before render. Default true. */
  sortDescending?: boolean
  /** When set, each row becomes clickable. */
  onItemClick?: (id: string) => void
  className?: string
}

export function sortResultBarsDesc(items: ResultBarItem[]): ResultBarItem[] {
  return [...items].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function scaleMaxForItems(items: ResultBarItem[], total?: number): number {
  if (typeof total === 'number' && total > 0) return total
  const peak = items.reduce((max, item) => Math.max(max, item.count), 0)
  return peak > 0 ? peak : 1
}

function barLengthPercent(count: number, scaleMax: number): number {
  if (scaleMax <= 0 || count <= 0) return 0
  return (count / scaleMax) * 100
}

type ResultBarRowProps = {
  item: ResultBarItem
  scaleMax: number
  onItemClick?: (id: string) => void
}

function ResultBarRow({ item, scaleMax, onItemClick }: ResultBarRowProps) {
  const lengthPercent = barLengthPercent(item.count, scaleMax)
  const hasBar = item.count > 0 && lengthPercent > 0

  const content = (
    <>
      <span
        className="shrink-0 w-32 sm:w-40 md:w-48 lg:w-56 text-xl md:text-2xl lg:text-3xl font-semibold text-white truncate"
        title={item.label}
      >
        {item.label}
      </span>

      <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3 lg:gap-4">
        {hasBar ? (
          <>
            <div
              className="h-10 sm:h-12 md:h-14 lg:h-16 rounded-md md:rounded-lg bg-violet-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] transition-[width] duration-500 ease-out"
              style={{ width: `${lengthPercent}%` }}
              aria-hidden
            />
            <span className="shrink-0 text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums leading-none">
              {item.count}
            </span>
          </>
        ) : (
          <span className="text-xl md:text-2xl lg:text-3xl font-semibold text-white/45 tabular-nums">
            0
          </span>
        )}
      </div>
    </>
  )

  if (onItemClick) {
    return (
      <button
        type="button"
        onClick={() => onItemClick(item.id)}
        className="flex w-full items-center gap-3 md:gap-5 lg:gap-6 rounded-xl px-2 py-2 -mx-2 text-left transition-colors hover:bg-white/5"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 md:gap-5 lg:gap-6">{content}</div>
  )
}

export function HorizontalResultBars({
  items,
  total,
  sortDescending = true,
  onItemClick,
  className = '',
}: HorizontalResultBarsProps) {
  const sorted = sortDescending ? sortResultBarsDesc(items) : items
  const scaleMax = scaleMaxForItems(sorted, total)

  return (
    <div className={`space-y-6 md:space-y-8 lg:space-y-10 ${className}`.trim()}>
      {sorted.map((item) => (
        <ResultBarRow
          key={item.id}
          item={item}
          scaleMax={scaleMax}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}
