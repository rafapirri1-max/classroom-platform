import {
  HorizontalResultBars,
  type ResultBarItem,
  sortResultBarsDesc,
} from './horizontal-result-bars'

export type ResultsBarChartProps = {
  items: ResultBarItem[]
  title?: string
  subtitle?: string
  total?: number
  sortDescending?: boolean
  onItemClick?: (id: string) => void
  maxHeight?: string
  className?: string
}

export function ResultsBarChart({
  items,
  title,
  subtitle,
  total,
  sortDescending = true,
  onItemClick,
  maxHeight = 'min(60vh, 720px)',
  className = '',
}: ResultsBarChartProps) {
  const sorted = sortDescending ? sortResultBarsDesc(items) : items
  const showScroll = sorted.length > 8

  return (
    <section className={className}>
      {title && (
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">{title}</h2>
      )}
      {subtitle && <p className="text-lg md:text-xl text-indigo-200/80 mb-6 md:mb-8">{subtitle}</p>}
      <div
        className={showScroll ? 'overflow-y-auto pr-2 [scrollbar-width:thin]' : undefined}
        style={showScroll ? { maxHeight } : undefined}
      >
        <HorizontalResultBars
          items={items}
          total={total}
          sortDescending={sortDescending}
          onItemClick={onItemClick}
        />
      </div>
    </section>
  )
}

export type { ResultBarItem }
