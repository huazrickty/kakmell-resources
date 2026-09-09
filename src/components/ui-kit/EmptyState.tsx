import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: LucideIcon
  message: ReactNode
  /** Optional action button (pass a ui-kit <Button>) */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 px-6 text-center', className)}>
      <Icon size={32} strokeWidth={1.5} className="text-ink-soft/40" />
      <p className="text-sm text-ink-soft">{message}</p>
      {action}
    </div>
  )
}
