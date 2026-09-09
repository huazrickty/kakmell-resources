import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeStatus = 'ok' | 'warn' | 'danger' | 'neutral'

export interface BadgeProps {
  status?: BadgeStatus
  children: ReactNode
  className?: string
}

const STATUS: Record<BadgeStatus, string> = {
  ok:      'bg-ok/10 text-ok',
  warn:    'bg-warn/10 text-warn',
  danger:  'bg-danger/10 text-danger',
  neutral: 'bg-ink/5 text-ink-soft',
}

/** THE status pill — done/paid = ok, pending/attention = warn, critical = danger. */
export function Badge({ status = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap',
        STATUS[status],
        className,
      )}
    >
      {children}
    </span>
  )
}
