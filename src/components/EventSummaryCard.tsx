import { format } from 'date-fns'
import { Sun, Moon, MapPin, Users } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import type { EventDoc } from '@/hooks/useEvents'

interface Props {
  event: EventDoc
  onClick?: () => void
}

const STATUS_STYLES = {
  upcoming:  'bg-red-50 text-red-700 border border-red-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const DATE_STYLES = {
  upcoming:  'text-red-600',
  completed: 'text-gray-400',
  cancelled: 'text-gray-300 line-through',
}

const BORDER_STYLES = {
  upcoming:  'border-l-4 border-red-600',
  completed: 'border-l-4 border-gray-200',
  cancelled: 'border-l-4 border-gray-100',
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

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden',
        onClick && 'cursor-pointer',
        BORDER_STYLES[event.status]
      )}
    >
      {/* Date stamp */}
      <div className={cn('flex flex-col items-center justify-center w-16 shrink-0 py-4', DATE_STYLES[event.status])}>
        <span className="text-2xl font-bold leading-none">{day}</span>
        <span className="text-[10px] font-semibold tracking-widest mt-0.5">{month}</span>
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-100 my-3" />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1.5">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
          {event.nama_majlis}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {event.hall_name && (
            <span className="flex items-center gap-1">
              <MapPin size={11} strokeWidth={1.8} />
              {event.hall_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            {event.sesi === 'siang' ? (
              <Sun size={11} strokeWidth={1.8} className="text-amber-500" />
            ) : (
              <Moon size={11} strokeWidth={1.8} className="text-indigo-400" />
            )}
            {t(event.sesi === 'siang' ? 'events.sessionMorning' : 'events.sessionEvening')}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} strokeWidth={1.8} />
            {event.pax} pax
          </span>
        </div>

        <span
          className={cn(
            'self-start text-[10px] font-semibold px-2 py-0.5 rounded-full',
            STATUS_STYLES[event.status]
          )}
        >
          {t(STATUS_LABEL_KEYS[event.status])}
        </span>
      </div>
    </div>
  )
}
