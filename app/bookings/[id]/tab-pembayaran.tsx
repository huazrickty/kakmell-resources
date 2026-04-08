'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { formatRM, formatTarikh } from './booking-tabs'
import type { Booking } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface PembayaranTabProps {
  booking: Booking
  onAddPayment: (date: string, amount: number, note: string) => Promise<void>
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export function PembayaranTab({ booking, onAddPayment }: PembayaranTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [payDate, setPayDate] = useState(todayISO())
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [saving, setSaving] = useState(false)

  function openModal() {
    setPayDate(todayISO())
    setPayAmount('')
    setPayNote('')
    setModalOpen(true)
  }

  async function handleSave() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) {
      toast.error('Sila masukkan jumlah bayaran yang sah.')
      return
    }
    setSaving(true)
    await onAddPayment(payDate, amount, payNote.trim())
    setSaving(false)
    setModalOpen(false)
    toast.success('Bayaran berjaya direkod.')
  }

  // Calculate derived values
  const paymentsArr = booking.payments ?? []
  const sumPaymentsArr = paymentsArr.reduce((s, p) => s + p.amount, 0)
  const initialDeposit = booking.deposit_paid - sumPaymentsArr
  const total = booking.total_amount
  const depositPaid = booking.deposit_paid
  const balance = booking.balance ?? (total != null ? total - depositPaid : null)

  const progressPct = total && total > 0 ? Math.min(100, (depositPaid / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Summary card */}
      {total == null ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 text-center">Jumlah tidak ditetapkan — kemaskini harga pakej dalam tab Butiran.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {/* Balance / Lunas */}
          <div className="text-center py-2">
            {(balance ?? 0) > 0 ? (
              <>
                <p className="text-2xl font-bold text-red-600 tabular-nums">{formatRM(balance)}</p>
                <p className="text-sm text-red-500 font-medium mt-0.5">BAKI BELUM BAYAR</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-green-600">LUNAS ✓</p>
                <p className="text-sm text-green-500 font-medium mt-0.5">Semua bayaran telah dijelaskan</p>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 text-center">
              {formatRM(depositPaid)} / {formatRM(total)} dibayar ({progressPct.toFixed(0)}%)
            </p>
          </div>
        </div>
      )}

      {/* Payment timeline */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2 px-1">Sejarah Pembayaran</p>
        <div className="space-y-2">

          {/* Initial deposit row */}
          {initialDeposit > 0 && (
            <div className="bg-white border-l-4 border-green-500 border border-gray-100 rounded-lg px-4 py-3 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-gray-800">Bayaran Awal</p>
                <p className="text-xs text-gray-400 mt-0.5">—</p>
              </div>
              <p className="text-sm font-bold text-green-600 tabular-nums">{formatRM(initialDeposit)}</p>
            </div>
          )}

          {/* Payment history */}
          {paymentsArr.map((p, i) => (
            <div
              key={i}
              className="bg-white border-l-4 border-green-400 border border-gray-100 rounded-lg px-4 py-3 flex justify-between items-start"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {p.note ? p.note : `Bayaran ${i + 1}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.date ? formatTarikh(p.date) : '—'}
                </p>
              </div>
              <p className="text-sm font-bold text-green-600 tabular-nums">{formatRM(p.amount)}</p>
            </div>
          ))}

          {/* Empty state */}
          {initialDeposit <= 0 && paymentsArr.length === 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-6 text-center">
              <p className="text-sm text-gray-400">Tiada rekod bayaran lagi.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add payment button */}
      <button
        onClick={openModal}
        className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        + Rekod Bayaran Baru
      </button>

      {/* Add payment modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rekod Bayaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarikh Bayaran</label>
              <input
                type="date"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
                className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (RM)</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota (optional)</label>
              <input
                type="text"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="Cth: Bayaran kedua, deposit tambahan…"
                className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <button className="flex-1 sm:flex-none min-h-[48px] px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" />
              }
            >
              Batal
            </DialogClose>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none min-h-[48px] px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
