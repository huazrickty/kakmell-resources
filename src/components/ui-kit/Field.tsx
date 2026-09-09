import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Focus ring is INK, not red — red means action, not focus.
const FIELD_BASE =
  'w-full rounded-lg border border-line bg-surface text-base text-ink ' +
  'placeholder:text-ink-soft/50 transition-colors ' +
  'focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/25 ' +
  'disabled:opacity-40 disabled:pointer-events-none'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, 'h-12 px-4', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, 'px-4 py-3 resize-none', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(FIELD_BASE, 'h-12 pl-4 pr-10 appearance-none', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
      />
    </div>
  )
}
