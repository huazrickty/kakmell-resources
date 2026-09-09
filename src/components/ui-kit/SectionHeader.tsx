import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  children: ReactNode
  /** Optional right-aligned slot (count, small action) */
  action?: ReactNode
  className?: string
}

/** The one in-page section title pattern: uppercase xs, ink-soft, wide tracking. */
export function SectionHeader({ children, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {children}
      </p>
      {action}
    </div>
  )
}
