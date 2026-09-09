import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Mobile action container sliding up from the bottom edge. On md+ screens it
 * centers as a dialog. Replaces small centered modals on mobile.
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    // Layering: scrim above all page chrome (bottom nav is z-50), sheet above scrim
    <div className="fixed inset-0 z-[70] flex items-end md:items-center md:justify-center">
      {/* Frosted scrim — ink 40% + blur; tap closes */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet body — SOLID surface, nothing may show through */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-surface shadow-elevated animate-sheet-up',
          'rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]',
          'md:max-w-md md:rounded-xl md:pb-4 md:animate-fade-in',
          className,
        )}
      >
        {/* Drag handle (mobile affordance) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line md:hidden" />

        {(title !== undefined) && (
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 md:pt-4">
            <p className="text-base font-bold text-ink">{title}</p>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="px-4 pt-1">{children}</div>
      </div>
    </div>
  )
}
