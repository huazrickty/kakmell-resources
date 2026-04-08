'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { formatRM, formatTarikh } from './booking-tabs'
import type { Booking } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface InvoisTabProps {
  booking: Booking
  existingInvoice: { id: string; invoice_no: string; status: string } | null
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function todayFormatted(): string {
  const d = new Date()
  return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentYear(): number {
  return new Date().getFullYear()
}

// ──────────────────────────────────────────────────────────────
// PDF generation
// ──────────────────────────────────────────────────────────────
async function generatePDF(booking: Booking, invoiceNo: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20

  let y = margin

  // ── Header ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('INVOIS / INVOICE', margin, y)

  // Invoice no (right-aligned)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(invoiceNo, pageW - margin, y, { align: 'right' })

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('KAKMELL RESOURCES', margin, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Perkhidmatan Katering', margin, y)

  // Issued date (right)
  doc.text(`Tarikh: ${todayFormatted()}`, pageW - margin, y, { align: 'right' })

  y += 8
  // Divider
  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  // ── Client details ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Kepada / To:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(booking.client_name, margin + 35, y)

  y += 5.5
  doc.setFont('helvetica', 'bold')
  doc.text('Tarikh Majlis / Event Date:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatTarikh(booking.event_date), margin + 55, y)

  y += 5.5
  if (booking.hall_name) {
    doc.setFont('helvetica', 'bold')
    doc.text('Dewan / Hall:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(booking.hall_name, margin + 35, y)
    y += 5.5
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Bilangan Pax:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(booking.pax), margin + 35, y)

  y += 8
  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 7

  // ── Items table ────────────────────────────────────────────
  const colDesc = margin
  const colAmt = pageW - margin

  // Table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('BUTIRAN / DESCRIPTION', colDesc, y)
  doc.text('JUMLAH / AMOUNT', colAmt, y, { align: 'right' })
  y += 2
  doc.setDrawColor(100, 100, 100)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')

  // Package price
  if (booking.package_price != null) {
    const label = 'Pakej Katering'
    doc.text(label, colDesc, y)
    doc.text(formatRM(booking.package_price), colAmt, y, { align: 'right' })
    y += 6
  }

  // Addons
  for (const addon of (booking.addons ?? [])) {
    doc.text(addon.name, colDesc, y)
    doc.text(formatRM(addon.price), colAmt, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── Totals ─────────────────────────────────────────────────
  function totalRow(label: string, value: string, bold = false) {
    if (bold) doc.setFont('helvetica', 'bold')
    else doc.setFont('helvetica', 'normal')
    doc.text(label, colDesc, y)
    doc.text(value, colAmt, y, { align: 'right' })
    y += 6
  }

  totalRow('JUMLAH / TOTAL', formatRM(booking.total_amount), true)
  totalRow('Deposit Dibayar', formatRM(booking.deposit_paid))

  y += 1
  doc.setDrawColor(100, 100, 100)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BAKI / BALANCE', colDesc, y)
  doc.text(formatRM(booking.balance), colAmt, y, { align: 'right' })
  y += 10

  // ── Footer ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('Terima kasih atas kepercayaan anda. / Thank you for your trust.', pageW / 2, y, { align: 'center' })
  y += 5
  doc.text('KAKMELL RESOURCES — Perkhidmatan Katering', pageW / 2, y, { align: 'center' })

  // Download
  const filename = `${invoiceNo}-${booking.client_name.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export function InvoisTab({ booking, existingInvoice }: InvoisTabProps) {
  const year = currentYear()
  const [invoiceNo, setInvoiceNo] = useState<string>(
    existingInvoice?.invoice_no ?? `INV-${year}-001`
  )
  const [generating, setGenerating] = useState(false)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(existingInvoice?.id ?? null)

  // Compute next invoice number if no existing invoice
  useEffect(() => {
    if (existingInvoice) return

    async function fetchNextNo() {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('invoices')
        .select('invoice_no')
        .like('invoice_no', `INV-${year}-%`)
        .order('invoice_no', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!data) {
        setInvoiceNo(`INV-${year}-001`)
        return
      }

      const parts = (data as { invoice_no: string }).invoice_no.split('-')
      const lastNum = parseInt(parts[parts.length - 1] ?? '0', 10)
      const next = String(lastNum + 1).padStart(3, '0')
      setInvoiceNo(`INV-${year}-${next}`)
    }

    fetchNextNo()
  }, [existingInvoice, year])

  async function handleGeneratePDF() {
    setGenerating(true)

    try {
      const supabase = createSupabaseBrowserClient()

      // Save or update invoice record
      if (!savedInvoiceId) {
        const lineItems = [
          ...(booking.package_price != null
            ? [{ description: 'Pakej Katering', amount: booking.package_price }]
            : []),
          ...(booking.addons ?? []).map(a => ({ description: a.name, amount: a.price })),
        ]

        const { data: inv, error } = await supabase
          .from('invoices')
          .insert({
            booking_id: booking.id,
            invoice_no: invoiceNo,
            issued_date: todayISO(),
            items: lineItems,
            subtotal: booking.total_amount,
            total: booking.total_amount,
            status: 'sent',
          })
          .select('id')
          .single()

        if (error) {
          console.error('Invoice save error:', error)
          toast.error('Gagal simpan rekod invois.')
        } else if (inv) {
          setSavedInvoiceId(inv.id)
        }
      } else {
        // Update status to sent
        await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('id', savedInvoiceId)
      }

      // Generate the PDF
      await generatePDF(booking, invoiceNo)
      toast.success(`Invois ${invoiceNo} berjaya dijana dan dimuat turun.`)
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Gagal jana PDF. Cuba lagi.')
    } finally {
      setGenerating(false)
    }
  }

  const addons = booking.addons ?? []

  return (
    <div className="space-y-4">
      {/* Invoice preview card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Invoice header */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-base font-bold text-gray-900">INVOIS / INVOICE</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">KAKMELL RESOURCES</p>
              <p className="text-xs text-gray-500">Perkhidmatan Katering</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{invoiceNo}</p>
              <p className="text-xs text-gray-400 mt-0.5">{todayFormatted()}</p>
            </div>
          </div>
        </div>

        {/* Client details */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-1.5">
          <div className="flex gap-3 text-sm">
            <span className="text-gray-500 w-28 shrink-0">Kepada / To:</span>
            <span className="font-medium text-gray-900">{booking.client_name}</span>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-500 w-28 shrink-0">Tarikh / Date:</span>
            <span className="text-gray-800">{formatTarikh(booking.event_date)}</span>
          </div>
          {booking.hall_name && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-500 w-28 shrink-0">Dewan / Hall:</span>
              <span className="text-gray-800">{booking.hall_name}</span>
            </div>
          )}
          <div className="flex gap-3 text-sm">
            <span className="text-gray-500 w-28 shrink-0">Pax:</span>
            <span className="text-gray-800">{booking.pax}</span>
          </div>
        </div>

        {/* Line items */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            <span>Butiran / Description</span>
            <span>Jumlah</span>
          </div>

          {booking.package_price != null && (
            <div className="flex justify-between text-sm py-1.5">
              <span className="text-gray-700">Pakej Katering</span>
              <span className="font-medium tabular-nums">{formatRM(booking.package_price)}</span>
            </div>
          )}

          {addons.map((addon, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5">
              <span className="text-gray-700">{addon.name}</span>
              <span className="font-medium tabular-nums">{formatRM(addon.price)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-semibold">JUMLAH / TOTAL</span>
            <span className="font-semibold tabular-nums">{formatRM(booking.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Deposit Dibayar</span>
            <span className="text-green-600 tabular-nums">{formatRM(booking.deposit_paid)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
            <span className={`font-bold ${(booking.balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              BAKI / BALANCE
            </span>
            <span className={`font-bold tabular-nums ${(booking.balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatRM(booking.balance)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-400 text-center italic">
            Terima kasih atas kepercayaan anda. / Thank you for your trust.
          </p>
        </div>
      </div>

      {/* Invoice number edit */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombor Invois</label>
        <input
          type="text"
          value={invoiceNo}
          onChange={e => setInvoiceNo(e.target.value)}
          className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
          placeholder="INV-2026-001"
        />
      </div>

      {/* Generate PDF button */}
      <button
        onClick={handleGeneratePDF}
        disabled={generating}
        className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {generating ? 'Menjana PDF…' : '📄 Jana PDF'}
      </button>

      {/* Status info */}
      {existingInvoice && (
        <p className="text-xs text-gray-400 text-center">
          Invois {existingInvoice.invoice_no} — status: <span className="font-medium">{existingInvoice.status}</span>
        </p>
      )}
    </div>
  )
}
