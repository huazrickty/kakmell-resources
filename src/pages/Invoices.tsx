import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, doc, deleteDoc } from 'firebase/firestore'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  isWithinInterval,
} from 'date-fns'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import { fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { tsToDate } from '@/lib/date-utils'
import { Button, Card, Segmented, Input, EmptyState, BottomSheet } from '@/components/ui-kit'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'

type FilterType = 'all' | 'week' | 'month' | 'year' | 'range'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-lg font-bold leading-none text-ink tabular-nums truncate">{value}</span>
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  )
}

function Skeleton() {
  return <div className="h-[68px] bg-ink/5 rounded-xl animate-pulse" />
}

export default function Invoices() {
  const navigate    = useNavigate()
  const { userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'
  const { events }  = useEvents()

  const [invoices, setInvoices]               = useState<InvoiceDoc[]>([])
  const [loading, setLoading]                 = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]               = useState(false)

  const [filter, setFilter]         = useState<FilterType>('week')
  const [rangeFrom, setRangeFrom]   = useState('')
  const [rangeTo, setRangeTo]       = useState('')
  const [appliedRange, setAppliedRange] = useState<{ from: Date; to: Date } | null>(null)

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
      toast.success(t('invoice.toast.deleted'))
      setConfirmDeleteId(null)
    } catch {
      toast.error(t('invoice.toast.error'))
    } finally {
      setDeleting(false)
    }
  }

  function applyRange() {
    if (!rangeFrom || !rangeTo) return
    const from = new Date(rangeFrom)
    const to   = new Date(rangeTo)
    to.setHours(23, 59, 59, 999)
    setAppliedRange({ from, to })
  }

  const filteredInvoices = useMemo(() => {
    const now = new Date()
    switch (filter) {
      case 'week': {
        const start = startOfWeek(now, { weekStartsOn: 1 })
        const end   = endOfWeek(now, { weekStartsOn: 1 })
        return invoices.filter(inv => isWithinInterval(tsToDate(inv.invoice_date), { start, end }))
      }
      case 'month': {
        const start = startOfMonth(now)
        const end   = endOfMonth(now)
        return invoices.filter(inv => isWithinInterval(tsToDate(inv.invoice_date), { start, end }))
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1)
        const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        return invoices.filter(inv => isWithinInterval(tsToDate(inv.invoice_date), { start, end }))
      }
      case 'range':
        if (!appliedRange) return invoices
        return invoices.filter(inv =>
          isWithinInterval(tsToDate(inv.invoice_date), { start: appliedRange.from, end: appliedRange.to })
        )
      default:
        return invoices
    }
  }, [invoices, filter, appliedRange])

  const totalBilled = filteredInvoices.reduce((s, inv) => s + (inv.total || 0), 0)
  const paidTotal   = filteredInvoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + (inv.total || 0), 0)
  const outstanding = filteredInvoices.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + (inv.total || 0), 0)

  const filterSummary = useMemo(() => {
    const n = filteredInvoices.length
    const now = new Date()
    switch (filter) {
      case 'week':  return `${n} ${t('invoice.countLabel')} — ${t('invoice.filterWeek')}`
      case 'month': return `${n} ${t('invoice.countLabel')} — ${format(now, 'MMMM yyyy')}`
      case 'year':  return `${n} ${t('invoice.countLabel')} — ${now.getFullYear()}`
      case 'range':
        if (!appliedRange) return `${n} ${t('invoice.countLabel')}`
        return `${n} ${t('invoice.countLabel')} — ${format(appliedRange.from, 'd MMM')} – ${format(appliedRange.to, 'd MMM yyyy')}`
      default: return null
    }
  }, [filteredInvoices.length, filter, appliedRange, t])

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const deleteTarget = confirmDeleteId ? invoices.find(i => i.id === confirmDeleteId) : null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header — New Invoice is the one primary CTA on this screen */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('invoice.title')}</h1>
        <Button size="sm" onClick={() => navigate('/invoices/custom/new')}>
          <Plus size={15} />
          {t('invoice.newCustom')}
        </Button>
      </div>

      {/* Stats — plain tabular numbers */}
      {!loading && invoices.length > 0 && (
        <Card className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label={t('invoice.countLabel')} value={String(filteredInvoices.length)} />
            <Stat label={t('invoice.totalBilled')} value={fmtRM(totalBilled)} />
            <Stat label={t('invoice.statusPaid')} value={fmtRM(paidTotal)} />
            <Stat label={t('invoice.outstanding')} value={fmtRM(outstanding)} />
          </div>
        </Card>
      )}

      {/* Filter */}
      {!loading && invoices.length > 0 && (
        <div className="mb-4 space-y-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'week',  label: t('invoice.filterWeek') },
              { value: 'month', label: t('invoice.filterMonth') },
              { value: 'year',  label: t('invoice.filterYear') },
              { value: 'range', label: t('invoice.filterRange') },
              { value: 'all',   label: t('invoice.filterAll') },
            ]}
          />

          {filter === 'range' && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[130px]">
                <p className="text-xs text-ink-soft mb-1">{t('invoice.filterFrom')}</p>
                <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[130px]">
                <p className="text-xs text-ink-soft mb-1">{t('invoice.filterTo')}</p>
                <Input type="date" value={rangeTo} min={rangeFrom} onChange={e => setRangeTo(e.target.value)} />
              </div>
              <Button variant="secondary" disabled={!rangeFrom || !rangeTo} onClick={applyRange}>
                {t('invoice.filterApply')}
              </Button>
            </div>
          )}

          {filterSummary && (
            <p className="text-xs text-ink-soft">{filterSummary}</p>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <Skeleton key={i} />)}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card flush>
          <EmptyState
            icon={FileText}
            message={invoices.length === 0 ? t('invoice.noInvoices') : t('invoice.noInvoicesThisPeriod')}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredInvoices.map((inv) => {
            const date   = tsToDate(inv.invoice_date)
            const evName = inv.event_id ? (eventNameMap[inv.event_id] ?? '—') : (inv.reference || inv.billed_to || '—')

            return (
              <div
                key={inv.id}
                className="flex bg-surface rounded-xl border border-line shadow-card overflow-hidden hover:border-ink/20 transition-colors"
              >
                <div
                  className="flex-1 px-4 py-3 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink tabular-nums">{inv.invoice_no}</p>
                      <p className="text-xs text-ink-soft truncate mt-0.5">{evName}</p>
                      <div className="mt-1.5">
                        <DocumentStatusBadge kind="invoice" status={inv.status} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-ink tabular-nums">{fmtRM(inv.total)}</p>
                      <p className="text-xs text-ink-soft mt-0.5 tabular-nums">{format(date, 'd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmDeleteId(inv.id)}
                  className="px-3 flex items-center text-ink-soft/50 hover:text-danger border-l border-line hover:bg-danger/5 transition-colors shrink-0 min-w-12"
                  aria-label={t('invoice.delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm — BottomSheet destructive pattern */}
      <BottomSheet
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title={deleteTarget?.invoice_no}
      >
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-soft">{t('invoice.deleteConfirmText')}</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleting}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              <Trash2 size={15} />
              {deleting ? '...' : t('common.deleteConfirmAction')}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
