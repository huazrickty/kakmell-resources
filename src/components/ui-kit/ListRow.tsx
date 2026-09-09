import { type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ListRowProps {
  label: ReactNode
  /** Secondary line under the label */
  sublabel?: ReactNode
  /** Right-aligned value / element (before the chevron) */
  value?: ReactNode
  /** Leading icon / avatar slot */
  leading?: ReactNode
  onClick?: () => void
  /** Chevron shown by default when the row is tappable */
  chevron?: boolean
  className?: string
}

/** Standard tappable row for settings & lists — 48px minimum tap target. */
export function ListRow({ label, sublabel, value, leading, onClick, chevron, className }: ListRowProps) {
  const showChevron = chevron ?? !!onClick
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 min-h-12 text-left',
        onClick && 'hover:bg-ink/[0.03] active:bg-ink/5 transition-colors',
        className,
      )}
    >
      {leading && <span className="shrink-0 text-ink-soft">{leading}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-ink truncate">{label}</span>
        {sublabel && <span className="block text-xs text-ink-soft truncate mt-0.5">{sublabel}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-ink-soft tabular-nums">{value}</span>}
      {showChevron && <ChevronRight size={16} className="shrink-0 text-ink-soft/60" />}
    </Tag>
  )
}
