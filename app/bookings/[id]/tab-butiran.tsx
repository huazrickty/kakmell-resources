'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { formatTarikh, formatRM } from './booking-tabs'
import type { Booking } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Status config
// ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  confirmed: { label: 'Disahkan',   className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Selesai',    className: 'bg-green-100  text-green-700  border-green-200' },
  cancelled: { label: 'Dibatalkan', className: 'bg-gray-100   text-gray-500   border-gray-200' },
}

// ──────────────────────────────────────────────────────────────
// Menu label helpers
// ──────────────────────────────────────────────────────────────
const MENU_LABELS: Record<string, string> = {
  nasi_briyani: 'Nasi Briyani',
  nasi_minyak: 'Nasi Minyak',
  nasi_jagung: 'Nasi Jagung',
  ayam_masak_merah: 'Ayam Masak Merah',
  daging_briyani: 'Daging Briyani',
  daging_black_pepper: 'Daging Black Pepper',
  daging_masak_hitam: 'Daging Masak Hitam',
  daging_kuzi: 'Daging Kuzi',
  daging_masak_kurma: 'Daging Masak Kurma',
  daging_masak_lemak_hitam: 'Daging Masak Lemak Hitam',
  paceri_nenas: 'Paceri Nenas',
  pencuk: 'Pencuk',
  bubur_pulut_hitam: 'Bubur Pulut Hitam',
  bubur_kacang_hijau: 'Bubur Kacang Hijau',
  bubur_jagung: 'Bubur Jagung',
}

function menuLabel(val: string | string[] | undefined | null): string {
  if (!val) return '—'
  if (Array.isArray(val)) {
    if (val.length === 0) return '—'
    return val.map(v => MENU_LABELS[v] ?? v).join(', ')
  }
  return MENU_LABELS[val] ?? val
}

// ──────────────────────────────────────────────────────────────
// InfoRow helper
// ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-right font-medium text-gray-800 ${valueClass ?? ''}`}>{value}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface ButiranTabProps {
  booking: Booking
  halls: string[]
  onUpdate: (updates: Partial<Booking>) => Promise<void>
  onDelete: () => Promise<void>
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export function ButiranTab({ booking, halls, onUpdate, onDelete }: ButiranTabProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form state
  const [clientName, setClientName] = useState(booking.client_name)
  const [eventDate, setEventDate] = useState(booking.event_date)
  const [hallName, setHallName] = useState(booking.hall_name ?? '')
  const [pax, setPax] = useState(String(booking.pax))
  const [status, setStatus] = useState(booking.status)
  const [notes, setNotes] = useState(booking.notes ?? '')
  const [packagePrice, setPackagePrice] = useState(String(booking.package_price ?? ''))
  const [depositPaid, setDepositPaid] = useState(String(booking.deposit_paid))

  function resetEditState() {
    setClientName(booking.client_name)
    setEventDate(booking.event_date)
    setHallName(booking.hall_name ?? '')
    setPax(String(booking.pax))
    setStatus(booking.status)
    setNotes(booking.notes ?? '')
    setPackagePrice(String(booking.package_price ?? ''))
    setDepositPaid(String(booking.deposit_paid))
  }

  async function handleSave() {
    setSaving(true)
    await onUpdate({
      client_name: clientName.trim(),
      event_date: eventDate,
      hall_name: hallName || null,
      pax: parseInt(pax) || booking.pax,
      status,
      notes: notes.trim() || null,
      package_price: packagePrice ? parseFloat(packagePrice) : null,
      deposit_paid: parseFloat(depositPaid) || 0,
    })
    setSaving(false)
    setMode('view')
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    setDeleteOpen(false)
  }

  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.confirmed
  const ms = booking.menu_selection

  // ── VIEW MODE ──────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div className="space-y-4">
        {/* Card 1: Butiran Majlis */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Butiran Majlis</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <InfoRow label="Tarikh Majlis" value={formatTarikh(booking.event_date)} />
            <InfoRow label="Nama Dewan" value={booking.hall_name ?? '—'} />
            <InfoRow label="Bilangan Pax" value={`${booking.pax} pax`} />
            <InfoRow
              label="Status"
              value={
                <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                  {statusCfg.label}
                </Badge>
              }
            />
            {booking.notes && (
              <div className="pt-3 border-t border-gray-50 mt-1">
                <p className="text-xs text-gray-400 mb-1">Catatan</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Pilihan Menu */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Pilihan Menu</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <InfoRow label="Nasi" value={menuLabel(ms?.nasi)} />
            <InfoRow label="Ayam" value={menuLabel(ms?.ayam)} />
            <InfoRow label="Daging" value={menuLabel(ms?.daging)} />
            <InfoRow label="Acar / Paceri" value={menuLabel(ms?.acar)} />
            <InfoRow label="Dalca" value="Standard (sentiasa ada)" />
            <InfoRow label="Bubur" value={menuLabel(ms?.bubur)} />
            <InfoRow label="Kuih" value={menuLabel(ms?.kuih)} />
            <InfoRow label="Air" value={menuLabel(ms?.air)} />
          </CardContent>
        </Card>

        {/* Card 3: Ringkasan Kewangan */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Ringkasan Kewangan</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {booking.package_price != null && (
              <InfoRow label="Harga Pakej" value={formatRM(booking.package_price)} />
            )}
            {(booking.addons ?? []).map((a, i) => (
              <InfoRow key={i} label={a.name} value={formatRM(a.price)} />
            ))}
            {booking.total_amount != null && (
              <div className="flex justify-between items-start gap-4 py-2 border-t border-gray-200 mt-1">
                <span className="text-sm font-semibold text-gray-700">Jumlah</span>
                <span className="text-sm font-semibold text-gray-900">{formatRM(booking.total_amount)}</span>
              </div>
            )}
            <InfoRow
              label="Deposit Dibayar"
              value={formatRM(booking.deposit_paid)}
              valueClass="text-green-600"
            />
            {booking.total_amount != null && (
              <div className="flex justify-between items-start gap-4 py-2 border-t border-gray-200 mt-1">
                <span className="text-sm font-bold text-gray-700">Baki</span>
                <span className={`text-sm font-bold ${(booking.balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatRM(booking.balance)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => { resetEditState(); setMode('edit') }}
            className="flex-1 min-h-[48px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex-1 min-h-[48px] border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Padam Booking
          </button>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteOpen} onOpenChange={(open) => setDeleteOpen(open)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Padam Booking?</DialogTitle>
              <DialogDescription>
                Tindakan ini tidak boleh dibatalkan. Booking <strong>{booking.client_name}</strong> akan dipadam.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={
                  <button className="flex-1 sm:flex-none min-h-[48px] px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" />
                }
              >
                Batal
              </DialogClose>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 sm:flex-none min-h-[48px] px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Memproses…' : 'Ya, Padam'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── EDIT MODE ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle>Edit Booking</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">

          {/* Nama Klien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Klien</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Tarikh Majlis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarikh Majlis</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Nama Dewan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Dewan</label>
            <select
              value={hallName}
              onChange={e => setHallName(e.target.value)}
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">— Pilih Dewan —</option>
              {halls.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Bilangan Pax */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bilangan Pax</label>
            <input
              type="number"
              value={pax}
              onChange={e => setPax(e.target.value)}
              min="1"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Booking['status'])}
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="confirmed">Disahkan</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Catatan tambahan (optional)"
            />
          </div>

          {/* Harga Pakej */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Pakej (RM)</label>
            <input
              type="number"
              value={packagePrice}
              onChange={e => setPackagePrice(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Deposit Dibayar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Dibayar (RM)</label>
            <input
              type="number"
              value={depositPaid}
              onChange={e => setDepositPaid(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save / Cancel */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          onClick={() => setMode('view')}
          disabled={saving}
          className="flex-1 min-h-[48px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  )
}
