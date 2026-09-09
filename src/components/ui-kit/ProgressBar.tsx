import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  /** 0..1 */
  value: number
  className?: string
}

/** Thin progress bar — ink track, ok-green fill. */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-ink/10 overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-ok transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
