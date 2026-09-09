import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

/** Toggle option pill — selected = ink on white text. Red never marks selection. */
export function Pill({ selected = false, className, type = 'button', ...props }: PillProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center min-h-11 px-4 rounded-lg border text-sm font-medium transition-colors text-left',
        selected
          ? 'bg-ink text-white border-ink'
          : 'bg-surface text-ink border-line hover:border-ink/30 active:bg-ink/5',
        className,
      )}
      {...props}
    />
  )
}
