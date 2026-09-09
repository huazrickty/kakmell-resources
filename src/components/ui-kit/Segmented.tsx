import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Ink segmented control — filters and mode switches. Active = ink, never red.
 * Overflow-safe: when the options are wider than the container the track
 * scrolls horizontally inside the control — it never stretches the page.
 */
export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-none rounded-lg border border-line bg-surface', className)}>
      {/* w-max lets the track grow past the viewport; min-w-full keeps short
          option sets stretched edge-to-edge */}
      <div className="flex w-max min-w-full p-1 gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 min-h-10 px-3 rounded-md text-sm font-semibold transition-colors whitespace-nowrap',
              value === opt.value
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:text-ink hover:bg-ink/5',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
