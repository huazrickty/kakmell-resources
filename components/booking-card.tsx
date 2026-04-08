import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Booking } from '@/lib/types'

function formatTarikh(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" from Postgres — parse as local date
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRM(amount: number | null): string {
  if (amount == null) return '—'
  return `RM ${amount.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`
}

const STATUS_CONFIG = {
  confirmed: { label: 'Disahkan',   className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Selesai',    className: 'bg-green-100  text-green-700  border-green-200' },
  cancelled: { label: 'Dibatalkan', className: 'bg-gray-100   text-gray-500   border-gray-200' },
}

export function BookingCard({ booking }: { booking: Booking }) {
  const status = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.confirmed
  const hasBalance = (booking.balance ?? 0) > 0

  return (
    <Link href={`/bookings/${booking.id}`} className="block group">
      <Card className="group-hover:shadow-md transition-shadow border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            {/* Left: main info */}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate text-base">
                {booking.client_name}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatTarikh(booking.event_date)}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
                {booking.hall_name && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400" />
                    {booking.hall_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-gray-400" />
                  {booking.pax} pax
                </span>
              </div>
            </div>

            {/* Right: badge + balance */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', status.className)}
              >
                {status.label}
              </Badge>
              {hasBalance && (
                <span className="text-sm font-semibold text-red-600">
                  {formatRM(booking.balance)} baki
                </span>
              )}
              {!hasBalance && booking.total_amount != null && (
                <span className="text-sm font-semibold text-green-600">Lunas</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
