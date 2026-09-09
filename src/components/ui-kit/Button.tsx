import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'md' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT: Record<Variant, string> = {
  // Red = primary action. Destructive shares the red but as outline, so a
  // screen never shows two solid-red buttons with opposite meanings.
  primary:     'bg-primary text-white hover:bg-primary-hi active:bg-primary-hi border border-transparent',
  secondary:   'bg-surface text-ink border border-ink hover:bg-ink/5 active:bg-ink/10',
  ghost:       'bg-transparent text-ink border border-transparent hover:bg-ink/5 active:bg-ink/10',
  destructive: 'bg-surface text-primary border border-primary hover:bg-primary/5 active:bg-primary/10',
}

const SIZE: Record<Size, string> = {
  md: 'h-12 px-5 text-sm',        // 48px — default, mobile-safe tap target
  sm: 'h-9 px-3 text-sm',         // 36px — desktop-dense contexts only
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  )
}
