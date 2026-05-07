import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, doc, deleteDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import { fmtRM, tsToDate, type InvoiceDoc } from '@/lib/invoice-pdf'
import { cn } from '@/lib/utils'

// ── Status styles ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500 border-gray-200',
  sent:  'bg-amber-50 text-amber-700 border-amber-200',
  paid:  'bg-green-50 text-green-700 border-green-200',
}

const STATUS_BAR: Record<string, string> = {
  draft: 'bg-gray-300',
  sent:  'bg-amber-400',
  paid:  'bg-green-500',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse flex">
      <div className="w-1 shrink-0 bg-gray-200" />
      <div className="flex-1 px-4 py-4 space-y-2">
        <div className="h-3.5 bg-gray-100 rounded w-1/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="px-4 py-4 flex items-center">
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Invoices() {
  const navigate    = useNavigate()
  const { userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'
  const { events }  = useEvents()

  const [invoices, setInvoices]         = useState<InvoiceDoc[]>([])
  const [loading, setLoading]           = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Event id → name map for display
  const eventNameMap = Object.fromEntries(events.map(e => [e.id, e.nama_majlis]))

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'))
    return onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as InvoiceDoc)))
      setLoading(false)
    })
  }, [])

  async function handleDelete(invId: string) {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'invoices', invId))
      toast.success('Invois berjaya dipadam.')
      setConfirmDeleteId(null)
    } catch {
      toast.error('Ralat. Cuba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  // Stats
  const totalBilled   = invoices.reduce((s, inv) => s + (inv.total || 0), 0)
  const paidTotal     = invoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + (inv.total || 0), 0)
  const outstanding   = invoices.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + (inv.total || 0), 0)

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('invoice.title')}</h1>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {invoices.length} invois
        </span>
      </div>

      {/* Stats row */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Jumlah" value={String(invoices.length)} sub="invois" />
          <StatCard label={t('invoice.totalBilled')} value={fmtRM(totalBilled)} />
          <StatCard label={t('invoice.statusPaid')} value={fmtRM(paidTotal)} />
          <StatCard label={t('invoice.outstanding')} value={fmtRM(outstanding)} />
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <Skeleton key={i} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center">
          <FileText size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">{t('invoice.noInvoices')}</p>
          <p className="text-xs text-gray-300 mt-1">Buat invois dari halaman acara.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {invoices.map((inv) => {
            const statusKey   = inv.status as 'draft' | 'sent' | 'paid'
            const statusLabel = {
              draft: t('invoice.statusDraft'),
              sent:  t('invoice.statusSent'),
              paid:  t('invoice.statusPaid'),
            }[statusKey]
            const date   = tsToDate(inv.invoice_date)
            const evName = eventNameMap[inv.event_id] ?? '—'

            return (
              <div
                key={inv.id}
                className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all flex"
              >
                {/* Left status strip */}
                <div className={cn('w-1 shrink-0', STATUS_BAR[statusKey])} />

                {/* Main content — clickable */}
                <div
                  className="flex-1 px-4 py-3.5 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">{inv.invoice_no}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{evName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">{fmtRM(inv.total)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{format(date, 'd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div className="px-3 flex items-center shrink-0">
                  <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', STATUS_BADGE[statusKey])}>
                    {statusLabel}
                  </span>
                </div>

                {/* Delete */}
                {isAdmin && (
                  confirmDeleteId === inv.id ? (
                    <div className="flex items-center gap-2 px-3 border-l border-red-100 bg-red-50 shrink-0">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deleting}
                        className="text-[11px] font-bold text-red-700 whitespace-nowrap disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Padam'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] text-gray-500 hover:text-gray-700"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(inv.id)}
                      className="px-3 flex items-center text-gray-300 hover:text-red-500 border-l border-gray-50 hover:bg-red-50/50 transition-colors shrink-0"
                      aria-label="Padam invois"
                    >
                      <Trash2 size={13} />
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
