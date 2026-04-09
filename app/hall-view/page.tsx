import { supabaseAdmin } from '@/lib/supabase'
import { LogOut, CalendarDays, MapPin, ClipboardList } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
// IMPORTANT: pax, menu_selection, package_price, payments are intentionally
// excluded — hall staff must not see catering cost or ingredient data.

interface HallEvent {
  id: string
  client_name: string
  event_date: string
  hall_name: string | null
  tentative: string | null
  status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTarikh(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Disahkan',   className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Selesai',    className: 'bg-green-100  text-green-700'  },
  cancelled: { label: 'Dibatalkan', className: 'bg-gray-100   text-gray-500'   },
}

// ── Logout (inline server action inside form) ─────────────────────────────────

async function LogoutForm() {
  async function doLogout() {
    'use server'
    await logoutAction()
    redirect('/login')
  }

  return (
    <form action={doLogout}>
      <button
        type="submit"
        className="flex items-center gap-2 px-3 min-h-[48px] text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Log Keluar</span>
      </button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HallViewPage() {
  const today = new Date().toISOString().split('T')[0]

  // SELECT only the columns hall staff are permitted to see.
  // Never fetch: pax, package_price, addons, total_amount, deposit_paid,
  //              payments, menu_selection — those are Kakmell internal data.
  const { data: upcomingData } = await supabaseAdmin
    .from('bookings')
    .select('id, client_name, event_date, hall_name, tentative, status')
    .gte('event_date', today)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(60)

  const upcoming = (upcomingData ?? []) as HallEvent[]

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data: pastData } = await supabaseAdmin
    .from('bookings')
    .select('id, client_name, event_date, hall_name, tentative, status')
    .gte('event_date', thirtyDaysAgo)
    .lt('event_date', today)
    .order('event_date', { ascending: false })
    .limit(20)

  const past = (pastData ?? []) as HallEvent[]

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 lg:px-8 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg shrink-0">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Jadual Acara</p>
              <p className="text-xs text-gray-400">KAKMELL RESOURCES</p>
            </div>
          </div>
          <LogoutForm />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-5 space-y-8">

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
            <p className="text-2xl font-bold text-gray-900">{upcoming.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Acara Akan Datang</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
            <p className="text-2xl font-bold text-green-700">
              {upcoming.filter(e => e.status === 'confirmed').length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Disahkan</p>
          </div>
        </div>

        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
            Acara Akan Datang
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <CalendarDays size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Tiada acara akan datang.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Past 30 days */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">
              Acara Lepas (30 hari)
            </h2>
            <div className="space-y-3 opacity-60">
              {past.map(event => (
                <EventCard key={event.id} event={event} muted />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event, muted = false }: { event: HallEvent; muted?: boolean }) {
  const statusCfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.confirmed

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${muted ? 'border-gray-100' : 'border-gray-200'}`}>

      {/* Date header */}
      <div className={`px-4 py-2.5 border-b border-gray-100 ${muted ? 'bg-gray-50' : 'bg-green-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${muted ? 'text-gray-500' : 'text-green-800'}`}>
            {formatTarikh(event.event_date)}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Body — only safe fields */}
      <div className="px-4 py-4 space-y-2.5">
        <h3 className="font-bold text-gray-900 text-base">{event.client_name}</h3>

        {event.hall_name && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            {event.hall_name}
          </div>
        )}

        {/* Tentative / event flow — explicitly allowed for hall roles */}
        {event.tentative && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-3">
            <div className="flex items-start gap-2">
              <ClipboardList size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">Atur Cara / Tentative</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                  {event.tentative}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
