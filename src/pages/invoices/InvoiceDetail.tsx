import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { ArrowLeft, Download, Send, CheckCheck, Building2, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { generateInvoicePDF, getLogoBase64, fmtRM, tsToDate, type InvoiceDoc } from '@/lib/invoice-pdf'
import { cn } from '@/lib/utils'

// ── Status styles ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent:  'bg-amber-50 text-amber-700 border-amber-200',
  paid:  'bg-green-50 text-green-700 border-green-200',
}

const STATUS_STRIP: Record<string, string> = {
  draft: '#D1D5DB',
  sent:  '#F59E0B',
  paid:  '#10B981',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function InvoiceDetail() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'

  const [invoice, setInvoice]     = useState<InvoiceDoc | null>(null)
  const [eventName, setEventName] = useState('')
  const [loading, setLoading]     = useState(true)
  const [busy, setBusy]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    if (!id) return
    const unsub = onSnapshot(doc(db, 'invoices', id), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as InvoiceDoc
        setInvoice(data)
        if (data.event_id) {
          const evSnap = await getDoc(doc(db, 'events', data.event_id))
          if (evSnap.exists()) setEventName(evSnap.data().nama_majlis ?? '')
        }
      } else {
        setInvoice(null)
      }
      setLoading(false)
    })
    return unsub
  }, [id])

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'invoices', id))
      toast.success('Invois berjaya dipadam.')
      navigate('/invoices')
    } catch {
      toast.error('Ralat. Cuba lagi.')
      setDeleting(false)
    }
  }

  async function updateStatus(status: 'sent' | 'paid') {
    if (!id) return
    setBusy(true)
    try {
      await updateDoc(doc(db, 'invoices', id), { status })
      toast.success('Status dikemaskini.')
    } catch {
      toast.error('Ralat. Cuba lagi.')
    } finally {
      setBusy(false)
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B4332]" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-gray-400">Invois tidak ditemui.</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 text-[#1B4332] text-sm font-medium hover:underline"
        >
          ← Invois
        </button>
      </div>
    )
  }

  const invDate    = tsToDate(invoice.invoice_date)
  const statusKey  = invoice.status as 'draft' | 'sent' | 'paid'
  const statusLabel = {
    draft: t('invoice.statusDraft'),
    sent:  t('invoice.statusSent'),
    paid:  t('invoice.statusPaid'),
  }[statusKey]

  const regularItems = invoice.line_items.filter(li => !li.is_deduction)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Invois
        </button>
        <span className={cn('text-[11px] font-bold px-3 py-1.5 rounded-full border', STATUS_BADGE[statusKey])}>
          {statusLabel}
        </span>
      </div>

      {/* ── Invoice document ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        {/* Status color strip */}
        <div className="h-1" style={{ backgroundColor: STATUS_STRIP[statusKey] }} />

        <div className="p-6 md:p-8">

          {/* Header block */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
            {/* Left: Company */}
            <div>
              <p className="text-[17px] font-black text-[#1B4332] tracking-tight leading-none mb-1.5">
                KAKMELL RESOURCES
              </p>
              <p className="text-xs text-gray-500 leading-5">
                NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,<br />
                81700 PASIR GUDANG, JOHOR<br />
                +6018-397 0769
              </p>
            </div>

            {/* Right: Invoice meta */}
            <div className="sm:text-right shrink-0">
              <p className="text-2xl font-black text-gray-900 leading-none mb-3 tracking-tight">INVOICE</p>
              <div className="space-y-1 text-xs">
                <div className="flex sm:justify-end gap-2">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-gray-700">{fmtDate(invDate)}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-gray-400">Invoice #:</span>
                  <span className="font-bold text-gray-900">{invoice.invoice_no}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-gray-400">Customer ID:</span>
                  <span className="text-gray-700">CUST-001</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hairline */}
          <div className="h-px bg-[#1B4332]/15 mb-5" />

          {/* Bill To */}
          <div className="mb-6">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {t('invoice.billedTo')}
            </p>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 size={13} strokeWidth={1.5} className="text-gray-400 shrink-0" />
              <span className="font-bold text-gray-900">ZB GROUP SDN BHD</span>
            </div>
            {eventName && (
              <p className="text-xs text-gray-500 ml-[21px]">Event: {eventName}</p>
            )}
          </div>

          {/* Line items table */}
          <div className="mb-6 -mx-2 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left text-[9px] font-bold tracking-widest py-2.5 px-3 w-10 rounded-tl-lg">
                    {t('invoice.item')}
                  </th>
                  <th className="text-left text-[9px] font-bold tracking-widest py-2.5 px-3">
                    {t('invoice.description')}
                  </th>
                  <th className="text-right text-[9px] font-bold tracking-widest py-2.5 px-3 w-14">
                    {t('invoice.qty')}
                  </th>
                  <th className="text-right text-[9px] font-bold tracking-widest py-2.5 px-3 w-28">
                    {t('invoice.unitPrice')}
                  </th>
                  <th className="text-center text-[9px] font-bold tracking-widest py-2.5 px-3 w-12">
                    {t('invoice.tax')}
                  </th>
                  <th className="text-right text-[9px] font-bold tracking-widest py-2.5 px-3 w-28 rounded-tr-lg">
                    {t('invoice.total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {regularItems.map((li, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-gray-50',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    )}
                  >
                    <td className="py-2.5 px-3 text-gray-400 font-mono text-xs tabular-nums">{i + 1}</td>
                    <td className="py-2.5 px-3 text-gray-800">{li.description}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600 tabular-nums">{li.qty}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{fmtRM(li.unit_price)}</td>
                    <td className="py-2.5 px-3 text-center text-gray-400">-</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900 tabular-nums">{fmtRM(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals block */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-[260px] space-y-1.5">
              {([
                ['SUBTOTAL:',  fmtRM(invoice.subtotal)],
                ['TAXABLE:',   '-'],
                ['TAX RATE:',  '0.000%'],
                ['TAX:',       '-'],
                ['S & H:',     '-'],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{label}</span>
                  <span className="text-gray-600 tabular-nums text-xs">{val}</span>
                </div>
              ))}
              {invoice.gaji_pekerja > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">GAJI PEKERJA:</span>
                  <span className="text-red-600 font-semibold tabular-nums text-xs">
                    ({fmtRM(invoice.gaji_pekerja)})
                  </span>
                </div>
              )}
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-bold text-gray-900">TOTAL:</span>
                <span className="font-black text-xl text-[#1B4332] tabular-nums">{fmtRM(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Invoice footer */}
          <div className="border-t border-gray-100 pt-4 space-y-1">
            <p className="text-xs font-bold text-gray-700">Thank You For Your Business!</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              If you have any questions about this invoice, please contact<br />
              NORMILA (018-3970769)<br />
              Make all checks payable to KAKMELL RESOURCES
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Delete — left side */}
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 border border-red-200 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={14} />
              Padam Invois
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex-1">
              <span className="text-xs text-red-700 font-medium flex-1">
                Padam invois ini? Tindakan ini tidak boleh dibatalkan.
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {deleting ? '...' : 'Ya, Padam'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors shrink-0"
              >
                Batal
              </button>
            </div>
          )}

          {/* Right side actions */}
          <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={async () => { const logo = await getLogoBase64(); await generateInvoicePDF(invoice, eventName, logo) }}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Download size={14} />
            {t('invoice.downloadPdf')}
          </button>

          {statusKey === 'draft' && (
            <button
              onClick={() => updateStatus('sent')}
              disabled={busy}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {t('invoice.markSent')}
            </button>
          )}

          {(statusKey === 'draft' || statusKey === 'sent') && (
            <button
              onClick={() => updateStatus('paid')}
              disabled={busy}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <CheckCheck size={14} />
              {t('invoice.markPaid')}
            </button>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
