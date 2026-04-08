'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Booking } from '@/lib/types'
import { ButiranTab } from './tab-butiran'
import { BahanMentahTab } from './tab-bahan-mentah'
import { PembayaranTab } from './tab-pembayaran'
import { InvoisTab } from './tab-invois'

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────
export function formatTarikh(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ms-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatRM(n: number | null): string {
  if (n == null) return '—'
  return `RM ${n.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface BookingTabsProps {
  booking: Booking
  halls: string[]
  existingInvoice: { id: string; invoice_no: string; status: string } | null
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export function BookingTabs({ booking: initialBooking, halls, existingInvoice }: BookingTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('butiran')
  const [booking, setBooking] = useState<Booking>(initialBooking)

  // ── UPDATE booking ──────────────────────────────────────────
  async function handleUpdateBooking(updates: Partial<Booking>) {
    const supabase = createSupabaseBrowserClient()

    // Optimistic update
    setBooking(prev => ({ ...prev, ...updates }))

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking.id)

    if (error) {
      toast.error('Gagal kemaskini booking. Cuba lagi.')
      // Rollback
      setBooking(initialBooking)
      return
    }

    toast.success('Booking berjaya dikemaskini.')
    router.refresh()
  }

  // ── DELETE booking ──────────────────────────────────────────
  async function handleDeleteBooking() {
    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)

    if (error) {
      toast.error('Gagal padam booking. Cuba lagi.')
      return
    }

    toast.success('Booking berjaya dipadam.')
    router.push('/dashboard')
  }

  // ── ADD payment ─────────────────────────────────────────────
  async function handleAddPayment(date: string, amount: number, note: string) {
    const supabase = createSupabaseBrowserClient()

    const newPayment = { date, amount, ...(note ? { note } : {}) }
    const updatedPayments = [...(booking.payments ?? []), newPayment]
    const newDepositPaid = booking.deposit_paid + amount

    // Optimistic update
    setBooking(prev => ({
      ...prev,
      payments: updatedPayments,
      deposit_paid: newDepositPaid,
    }))

    const { error } = await supabase
      .from('bookings')
      .update({
        payments: updatedPayments,
        deposit_paid: newDepositPaid,
      })
      .eq('id', booking.id)

    if (error) {
      toast.error('Gagal rekod bayaran. Cuba lagi.')
      // Rollback
      setBooking(prev => ({
        ...prev,
        payments: booking.payments,
        deposit_paid: booking.deposit_paid,
      }))
      return
    }

    toast.success('Bayaran berjaya direkod.')
    router.refresh()
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
      {/* Tab list — full width on mobile, auto on desktop */}
      <TabsList className="w-full lg:w-auto mb-5 no-print">
        <TabsTrigger value="butiran" className="flex-1 lg:flex-none min-h-[48px]">
          <span className="hidden sm:inline">Butiran</span>
          <span className="sm:hidden">Info</span>
        </TabsTrigger>
        <TabsTrigger value="bahan-mentah" className="flex-1 lg:flex-none min-h-[48px]">
          <span className="hidden sm:inline">Bahan Mentah</span>
          <span className="sm:hidden">Bahan</span>
        </TabsTrigger>
        <TabsTrigger value="pembayaran" className="flex-1 lg:flex-none min-h-[48px]">
          <span className="hidden sm:inline">Pembayaran</span>
          <span className="sm:hidden">Bayar</span>
        </TabsTrigger>
        <TabsTrigger value="invois" className="flex-1 lg:flex-none min-h-[48px]">
          <span className="hidden sm:inline">Invois</span>
          <span className="sm:hidden">Invois</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="butiran">
        <ButiranTab
          booking={booking}
          halls={halls}
          onUpdate={handleUpdateBooking}
          onDelete={handleDeleteBooking}
        />
      </TabsContent>

      <TabsContent value="bahan-mentah">
        <BahanMentahTab booking={booking} />
      </TabsContent>

      <TabsContent value="pembayaran">
        <PembayaranTab booking={booking} onAddPayment={handleAddPayment} />
      </TabsContent>

      <TabsContent value="invois">
        <InvoisTab booking={booking} existingInvoice={existingInvoice} />
      </TabsContent>
    </Tabs>
  )
}
