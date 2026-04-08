import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BottomNav } from '@/components/bottom-nav'
import { SideNav } from '@/components/side-nav'
import type { Booking } from '@/lib/types'
import { BookingTabs } from './booking-tabs'

const STATUS_CONFIG = {
  confirmed: { label: 'Disahkan',   className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Selesai',    className: 'bg-green-100  text-green-700  border-green-200' },
  cancelled: { label: 'Dibatalkan', className: 'bg-gray-100   text-gray-500   border-gray-200' },
}

function formatTarikh(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface Props { params: Promise<{ id: string }> }

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params

  // Fetch booking
  const { data: bookingData, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (bookingError || !bookingData) notFound()

  const booking = bookingData as Booking
  const status = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.confirmed

  // Fetch halls from settings or use default list
  const { data: hallsData } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'halls')
    .single()

  const halls: string[] = hallsData?.value ?? ['Asmara Hall', 'Juwita Hall', 'Elham Hall']

  // Fetch existing invoice for this booking
  const { data: invoiceData } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_no, status')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const existingInvoice = invoiceData
    ? { id: invoiceData.id, invoice_no: invoiceData.invoice_no, status: invoiceData.status }
    : null

  return (
    <>
      <SideNav />

      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:pl-64">
        {/* Sticky header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-5xl mx-auto">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            >
              ←
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {booking.client_name}
              </h1>
              <p className="text-xs text-gray-400">{formatTarikh(booking.event_date)}</p>
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 lg:px-8 py-5 lg:py-8">
          <BookingTabs
            booking={booking}
            halls={halls}
            existingInvoice={existingInvoice}
          />
        </main>
      </div>

      <BottomNav />
    </>
  )
}
