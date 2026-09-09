import { format } from 'date-fns'
import { MapPin, Sun, Moon } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { Badge, type BadgeStatus } from '@/components/ui-kit'
import { resolveMenuType, MENU_TYPE_LABELS_BM } from '@/lib/menu-types'
import { cn } from '@/lib/utils'
import type { EventDoc } from '@/hooks/useEvents'

interface Props {
  event: EventDoc
  onClick?: () => void
}

const STATUS_BADGE: Record<EventDoc['status'], BadgeStatus> = {
  upcoming:  'warn',
  completed: 'ok',
  cancelled: 'neutral',
}

const STATUS_LABEL_KEYS = {
  upcoming:  'events.statusUpcoming',
  completed: 'events.statusCompleted',
  cancelled: 'events.statusCancelled',
} as const

export default function EventSummaryCard({ event, onClick }: Props) {
  const { t } = useLanguage()
  const date = event.tarikh.toDate()
  const day = format(date, 'd')
  const month = format(date, 'MMM').toUpperCase()
  const menuType = resolveMenuType(event.menu_type)
  const isPast = event.status !== 'upcoming'

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex bg-surface rounded-xl shadow-card border border-line overflow-hidden',
        onClick && 'cursor-pointer hover:border-ink/20 active:bg-ink/[0.02] transition-colors',
      )}
    >
      {/* Date stamp */}
      <div className={cn(
        'flex flex-col items-center justify-center w-16 shrink-0 py-4',
        isPast ? 'text-ink-soft/50' : 'text-ink',
        event.status === 'cancelled' && 'line-through',
      )}>
        <span className="text-xl font-bold leading-none tabular-nums">{day}</span>
        <span className="text-xs font-semibold tracking-wide mt-0.5">{month}</span>
      </div>

      <div className="w-px bg-line my-3" />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1">
        <p className="font-bold text-ink text-sm leading-snug truncate">
          {event.nama_majlis}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {event.hall_name && (
            <span className="flex items-center gap-1">
              <MapPin size={11} strokeWidth={1.8} />
              {event.hall_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            {event.sesi === 'siang'
              ? <Sun size={11} strokeWidth={1.8} />
              : <Moon size={11} strokeWidth={1.8} />}
            {t(event.sesi === 'siang' ? 'events.sessionMorning' : 'events.sessionEvening')}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge status={STATUS_BADGE[event.status]}>{t(STATUS_LABEL_KEYS[event.status])}</Badge>
          {menuType !== 'kahwin' && (
            <Badge status="neutral">{MENU_TYPE_LABELS_BM[menuType]}</Badge>
          )}
        </div>
      </div>

      {/* Pax — right-aligned, big tabular */}
      <div className="flex flex-col items-end justify-center pr-4 shrink-0">
        <span className="text-lg font-bold text-ink tabular-nums leading-none">{event.pax}</span>
        <span className="text-xs text-ink-soft mt-0.5">pax</span>
      </div>
    </div>
  )
}
