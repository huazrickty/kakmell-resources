import { supabaseAdmin } from '@/lib/supabase'
import { BookingCard } from '@/components/booking-card'
import { StatsRow } from '@/components/stats-row'
import { BottomNav } from '@/components/bottom-nav'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Booking } from '@/lib/types'

// TODO: replace supabaseAdmin with createSupabaseServerClient() once auth is set up

export default async function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]

  // Upcoming bookings: future dates, not cancelled, sorted nearest first
  const { data: upcomingBookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .gte('event_date', today)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })

  if (bookingsError) {
    console.error('Dashboard bookings fetch error:', bookingsError)
  }

  // Stats for current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const { data: monthBookings } = await supabaseAdmin
    .from('bookings')
    .select('total_amount, balance, status')
    .gte('event_date', monthStart)
    .lte('event_date', monthEnd)
    .neq('status', 'cancelled')

  // All bookings with outstanding balance (across all time)
  const { data: pendingBalances } = await supabaseAdmin
    .from('bookings')
    .select('balance')
    .gt('balance', 0)
    .neq('status', 'cancelled')

  const totalEventsThisMonth = monthBookings?.length ?? 0
  const totalRevenueThisMonth = monthBookings?.reduce(
    (sum, b) => sum + (b.total_amount ?? 0), 0
  ) ?? 0
  const totalPending = pendingBalances?.reduce(
    (sum, b) => sum + (b.balance ?? 0), 0
  ) ?? 0

  const bookings = (upcomingBookings ?? []) as Booking[]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-wide">
              KAKMELL RESOURCES
            </h1>
            <p className="text-xs text-gray-400">Pengurusan Katering</p>
          </div>
          <Link href="/bookings/new">
            <button className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold px-4 rounded-lg text-sm min-h-[48px] transition-colors">
              <Plus size={17} strokeWidth={2.5} />
              Tambah Booking
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Quick stats */}
        <StatsRow
          totalEvents={totalEventsThisMonth}
          totalRevenue={totalRevenueThisMonth}
          totalPending={totalPending}
        />

        {/* Upcoming events */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Acara Akan Datang
          </h2>

          {bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <p className="text-gray-400 text-sm">Tiada acara akan datang</p>
              <Link href="/bookings/new">
                <button className="mt-4 text-green-600 text-sm font-medium underline underline-offset-2">
                  Tambah booking baru
                </button>
              </Link>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
