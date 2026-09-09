import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove the default padding (e.g. for list cards using divide-y rows) */
  flush?: boolean
}

export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-line rounded-xl shadow-card',
        !flush && 'p-4 md:p-5',
        className,
      )}
      {...props}
    />
  )
}
