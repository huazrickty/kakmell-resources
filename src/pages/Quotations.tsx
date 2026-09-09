import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { doc, deleteDoc } from 'firebase/firestore'
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
import { useQuotations } from '@/hooks/useQuotations'
import { effectiveStatus, type QuotationDoc, type QuotationStatus } from '@/lib/quotations'
import { fmtRM } from '@/lib/invoice-pdf'
import { tsToDate } from '@/lib/date-utils'
import { logActivity } from '@/lib/activity-logger'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { Button, Card, Segmented, Input, EmptyState, BottomSheet, Badge } from '@/components/ui-kit'

type FilterType = 'all' | 'week' | 'month' | 'year' | 'range'
type StatusFilter = 'all' | QuotationStatus

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

export default function Quotations() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const eventId     = params.get('eventId') ?? ''
  const { user, userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'

  const { quotations, loading, atLimit } = useQuotations({ eventId: eventId || undefined })

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]               = useState(false)
  const [filter, setFilter]                   = useState<FilterType>('all')
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>('all')
  const [rangeFrom, setRangeFrom]             = useState('')
  const [rangeTo, setRangeTo]                 = useState('')
  const [appliedRange, setAppliedRange]       = useState<{ from: Date; to: Date } | null>(null)

  // ids that have a newer revision (computed from the loaded page)
  const revisionParents = useMemo(() => {
    const s = new Set<string>()
    for (const q of quotations) if (q.revision_of) s.add(q.revision_of)
    return s
  }, [quotations])

  async function handleDelete(q: QuotationDoc) {
    if (q.status === 'accepted' || q.converted_invoice_id) {
      toast.error(t('quotation.deleteBlocked'))
      setConfirmDeleteId(null)
      return
    }
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'quotations', q.id))
      logActivity({
        action: 'quotation_deleted',
        category: 'quotation',
        description: `Sebut harga dipadam: ${q.quotation_no}`,
        entity_id: q.id,
        entity_name: q.quotation_no,
        performed_by: user?.uid ?? '',
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('quotation.toast.deleted'))
      setConfirmDeleteId(null)
    } catch {
      toast.error(t('common.error'))
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

  const filtered = useMemo(() => {
    const now = new Date()
    let list = quotations
    switch (filter) {
      case 'week': {
        const start = startOfWeek(now, { weekStartsOn: 1 }), end = endOfWeek(now, { weekStartsOn: 1 })
        list = list.filter(q => isWithinInterval(tsToDate(q.quotation_date), { start, end })); break
      }
      case 'month': {
        const start = startOfMonth(now), end = endOfMonth(now)
        list = list.filter(q => isWithinInterval(tsToDate(q.quotation_date), { start, end })); break
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1), end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        list = list.filter(q => isWithinInterval(tsToDate(q.quotation_date), { start, end })); break
      }
      case 'range':
        if (appliedRange) list = list.filter(q => isWithinInterval(tsToDate(q.quotation_date), { start: appliedRange.from, end: appliedRange.to }))
        break
    }
    if (statusFilter !== 'all') list = list.filter(q => effectiveStatus(q, now) === statusFilter)
    return list
  }, [quotations, filter, appliedRange, statusFilter])

  const totalQuoted = filtered.reduce((s, q) => s + (q.total || 0), 0)
  const acceptedTot = filtered.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0)
  const pendingTot  = filtered.filter(q => effectiveStatus(q) === 'sent' || effectiveStatus(q) === 'draft').reduce((s, q) => s + (q.total || 0), 0)

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const deleteTarget = confirmDeleteId ? quotations.find(q => q.id === confirmDeleteId) : null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">{t('quotation.title')}</h1>
          {eventId && quotations[0]?.event_name && (
            <p className="text-xs text-ink-soft mt-0.5">{quotations[0].event_name}</p>
          )}
        </div>
        <Button size="sm" onClick={() => navigate(eventId ? `/quotations/new?eventId=${eventId}` : '/quotations/new')}>
          <Plus size={15} />
          {t('quotation.new')}
        </Button>
      </div>

      {!loading && quotations.length > 0 && (
        <Card className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label={t('quotation.countLabel')} value={String(filtered.length)} />
            <Stat label={t('quotation.totalQuoted')} value={fmtRM(totalQuoted)} />
            <Stat label={t('quotation.accepted')} value={fmtRM(acceptedTot)} />
            <Stat label={t('quotation.pending')} value={fmtRM(pendingTot)} />
          </div>
        </Card>
      )}

      {!loading && quotations.length > 0 && (
        <div className="mb-4 space-y-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all',   label: t('invoice.filterAll') },
              { value: 'week',  label: t('invoice.filterWeek') },
              { value: 'month', label: t('invoice.filterMonth') },
              { value: 'year',  label: t('invoice.filterYear') },
              { value: 'range', label: t('invoice.filterRange') },
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
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',      label: t('quotation.filterStatusAll') },
              { value: 'draft',    label: t('quotation.statusDraft') },
              { value: 'sent',     label: t('quotation.statusSent') },
              { value: 'accepted', label: t('quotation.statusAccepted') },
              { value: 'rejected', label: t('quotation.statusRejected') },
              { value: 'expired',  label: t('quotation.statusExpired') },
            ]}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">{[1, 2, 3].map(i => <Skeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <Card flush>
          <EmptyState
            icon={FileText}
            message={quotations.length === 0 ? t('quotation.noQuotations') : t('quotation.noQuotationsThisPeriod')}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((q) => {
            const date = tsToDate(q.quotation_date)
            const sub  = q.event_name ? `${q.customer.name} · ${q.event_name}` : q.customer.name
            return (
              <div
                key={q.id}
                className="flex bg-surface rounded-xl border border-line shadow-card overflow-hidden hover:border-ink/20 transition-colors"
              >
                <div className="flex-1 px-4 py-3 min-w-0 cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink tabular-nums">{q.quotation_no}</p>
                      <p className="text-xs text-ink-soft truncate mt-0.5">{sub}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <DocumentStatusBadge kind="quotation" status={effectiveStatus(q)} />
                        {revisionParents.has(q.id) && <Badge status="neutral">{t('quotation.hasNewerRevision')}</Badge>}
                        {q.converted_invoice_id && <Badge status="ok">{t('quotation.converted')}</Badge>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-ink tabular-nums">{fmtRM(q.total)}</p>
                      <p className="text-xs text-ink-soft mt-0.5 tabular-nums">{format(date, 'd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(q.id)}
                  className="px-3 flex items-center text-ink-soft/50 hover:text-danger border-l border-line hover:bg-danger/5 transition-colors shrink-0 min-w-12"
                  aria-label={t('quotation.delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          {atLimit && (
            <p className="text-xs text-ink-soft text-center pt-2">{t('quotation.showingLatest')}</p>
          )}
        </div>
      )}

      <BottomSheet open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title={deleteTarget?.quotation_no}>
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-soft">{t('quotation.deleteConfirmText')}</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" className="flex-1" disabled={deleting} onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              <Trash2 size={15} />
              {deleting ? '...' : t('common.deleteConfirmAction')}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
