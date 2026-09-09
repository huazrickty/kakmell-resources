import { useState } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import {
  ArrowLeft, Download, Send, CheckCheck, XCircle, Copy, Receipt, Trash2, MoreHorizontal, User, Phone, MapPin,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useQuotation, useRevisionChildren } from '@/hooks/useQuotations'
import { effectiveStatus, quoteToInvoicePayload, buildQuotationFilename, type QuotationStatus } from '@/lib/quotations'
import { generateQuotationPDF } from '@/lib/quotation-pdf'
import { getLogoBase64 } from '@/lib/pdf-common'
import { fmtRM } from '@/lib/invoice-pdf'
import { tsToDate, fmtDateDMY } from '@/lib/date-utils'
import { getStatusMeta } from '@/lib/document-status'
import { logActivity } from '@/lib/activity-logger'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { Button, BottomSheet, ListRow, Badge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

export default function QuotationDetail() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { user, userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'

  const { quotation, loading } = useQuotation(id)
  const { children: revisions } = useRevisionChildren(id)

  const [busy, setBusy]                   = useState(false)
  const [actionsOpen, setActionsOpen]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  async function updateStatus(status: Exclude<QuotationStatus, 'expired'>) {
    if (!id || !quotation) return
    setBusy(true)
    try {
      await updateDoc(doc(db, 'quotations', id), { status, updated_at: serverTimestamp() })
      logActivity({
        action: 'quotation_status_changed',
        category: 'quotation',
        description: `Status sebut harga ${quotation.quotation_no} ditukar ke '${status}'`,
        entity_id: id,
        entity_name: quotation.quotation_no,
        performed_by: user?.uid ?? '',
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('quotation.toast.statusUpdated'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!id || !quotation) return
    if (quotation.status === 'accepted' || quotation.converted_invoice_id) {
      toast.error(t('quotation.deleteBlocked'))
      return
    }
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'quotations', id))
      logActivity({
        action: 'quotation_deleted',
        category: 'quotation',
        description: `Sebut harga dipadam: ${quotation.quotation_no}`,
        entity_id: id,
        entity_name: quotation.quotation_no,
        performed_by: user?.uid ?? '',
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('quotation.toast.deleted'))
      navigate('/quotations')
    } catch {
      toast.error(t('common.error'))
      setDeleting(false)
    }
  }

  async function downloadPdf() {
    if (!quotation) return
    const logo = await getLogoBase64()
    await generateQuotationPDF(quotation, logo, buildQuotationFilename(quotation))
  }

  function convertToInvoice() {
    if (!quotation) return
    const p = quoteToInvoicePayload(quotation)
    navigate(p.target + p.search)
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-ink-soft">{t('quotation.notFound')}</p>
        <button onClick={() => navigate('/quotations')} className="mt-4 text-ink text-sm font-semibold underline underline-offset-2">
          ← {t('quotation.title')}
        </button>
      </div>
    )
  }

  const q          = quotation
  const status     = effectiveStatus(q)
  const qDate      = tsToDate(q.quotation_date)
  const validDate  = tsToDate(q.valid_until)
  const canConvert = q.status === 'accepted' && !q.converted_invoice_id
  const canDelete  = q.status !== 'accepted' && !q.converted_invoice_id
  const discount   = q.discount ?? 0
  const items      = q.line_items.filter(li => !li.is_deduction)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Navigation + status + overflow */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-1.5 min-h-11 text-ink-soft hover:text-ink text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          {t('quotation.title')}
        </button>
        <div className="flex items-center gap-2">
          <DocumentStatusBadge kind="quotation" status={status} />
          <button
            onClick={() => { setActionsOpen(true); setDeleteConfirm(false) }}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
            aria-label={t('common.actions')}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Relationship banners */}
      {(q.revision_of || revisions.length > 0 || q.converted_invoice_id) && (
        <div className="mb-4 space-y-2">
          {q.revision_of && (
            <Link to={`/quotations/${q.revision_of}`} className="block text-xs text-ink-soft hover:text-ink">
              ↩ {t('quotation.revisionOf')} <span className="font-semibold text-ink">{t('quotation.title')} #{q.revision_of.slice(0, 6)}</span>
            </Link>
          )}
          {revisions.map(r => (
            <Link key={r.id} to={`/quotations/${r.id}`} className="flex items-center gap-2 text-xs">
              <Badge status="warn">{t('quotation.hasNewerRevision')}</Badge>
              <span className="font-semibold text-ink tabular-nums">{r.quotation_no}</span>
            </Link>
          ))}
          {q.converted_invoice_id && (
            <Link to={`/invoices/${q.converted_invoice_id}`} className="flex items-center gap-2 text-xs">
              <Badge status="ok">{t('quotation.converted')}</Badge>
              <span className="text-ink-soft hover:text-ink">{t('quotation.viewInvoice')} →</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Document ──────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden mb-5">
        <div className={cn('h-1', getStatusMeta('quotation', status).strip)} />

        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
            <div>
              <p className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">KAKMELL RESOURCES</p>
              <p className="text-xs text-ink-soft leading-5">
                NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,<br />
                81700 PASIR GUDANG, JOHOR<br />
                +6018-397 0769
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-xl font-bold text-ink leading-none mb-0.5 tracking-tight">SEBUT HARGA</p>
              <p className="text-[10px] text-ink-soft uppercase tracking-widest mb-3">Quotation</p>
              <div className="space-y-1 text-xs">
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">{t('quotation.quotationDate')}:</span>
                  <span className="text-ink tabular-nums">{fmtDateDMY(qDate)}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">{t('quotation.quotationNo')}:</span>
                  <span className="font-bold text-ink tabular-nums">{q.quotation_no}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">{t('quotation.validUntil')}:</span>
                  <span className={cn('tabular-nums', status === 'expired' ? 'text-danger font-semibold' : 'text-ink')}>{fmtDateDMY(validDate)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-line mb-5" />

          {/* Customer */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">{t('quotation.customer')}</p>
            <div className="flex items-center gap-2 mb-0.5">
              <User size={13} strokeWidth={1.5} className="text-ink-soft shrink-0" />
              <span className="font-bold text-ink">{q.customer.name}</span>
            </div>
            {q.customer.phone && (
              <p className="flex items-center gap-2 text-xs text-ink-soft"><Phone size={11} className="shrink-0" />{q.customer.phone}</p>
            )}
            {q.customer.address && (
              <p className="flex items-start gap-2 text-xs text-ink-soft"><MapPin size={11} className="shrink-0 mt-0.5" />{q.customer.address}</p>
            )}
            {q.event_name && (
              <p className="text-xs text-ink-soft ml-[21px] mt-1">
                {t('quotation.event')}: {q.event_name}{q.pax ? ` — ${q.pax} pax` : ''}
              </p>
            )}
          </div>

          {/* Line items */}
          <div className="mb-6 -mx-2 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead>
                <tr className="bg-ink text-white">
                  <th className="text-left text-xs font-bold tracking-wide py-2.5 px-3 w-10 rounded-tl-lg">{t('invoice.item')}</th>
                  <th className="text-left text-xs font-bold tracking-wide py-2.5 px-3">{t('invoice.description')}</th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-14">{t('invoice.qty')}</th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-28">{t('invoice.unitPrice')}</th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-28 rounded-tr-lg">{t('invoice.total')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li, i) => (
                  <tr key={i} className={cn('border-b border-line/60', i % 2 === 1 && 'bg-ink/[0.02]')}>
                    <td className="py-2.5 px-3 text-ink-soft text-xs tabular-nums">{i + 1}</td>
                    <td className="py-2.5 px-3 text-ink">{li.description}</td>
                    <td className="py-2.5 px-3 text-right text-ink-soft tabular-nums">{li.qty}</td>
                    <td className="py-2.5 px-3 text-right text-ink-soft tabular-nums">{fmtRM(li.unit_price)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-ink tabular-nums">{fmtRM(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-[260px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft text-xs">SUBTOTAL:</span>
                <span className="text-ink-soft tabular-nums text-xs">{fmtRM(q.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft text-xs">DISKAUN:</span>
                  <span className="text-danger font-semibold tabular-nums text-xs">({fmtRM(discount)})</span>
                </div>
              )}
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-bold text-ink">JUMLAH / TOTAL:</span>
                <span className="font-bold text-xl text-ink tabular-nums">{fmtRM(q.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes + validity footer — mirrors the PDF */}
          {q.notes && (
            <div className="mb-4">
              <p className="text-xs font-bold text-ink mb-1">{t('quotation.notes')}</p>
              <p className="text-xs text-ink-soft whitespace-pre-line leading-relaxed">{q.notes}</p>
            </div>
          )}
          <div className="border-t border-line pt-4 space-y-1">
            <p className="text-xs font-bold text-ink">Sah sehingga {fmtDateDMY(validDate)}</p>
            <p className="text-xs text-ink-soft leading-relaxed">
              Harga tertakluk pada perubahan tanpa notis.<br />
              Sebut harga ini bukan invois.
            </p>
          </div>
        </div>
      </div>

      {/* ── Actions sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        open={actionsOpen}
        onClose={() => { setActionsOpen(false); setDeleteConfirm(false) }}
        title={q.quotation_no}
      >
        {!deleteConfirm ? (
          <div className="pb-2 -mx-4 divide-y divide-line">
            <ListRow
              leading={<Download size={18} />}
              label={t('quotation.downloadPdf')}
              chevron={false}
              onClick={async () => { setActionsOpen(false); await downloadPdf() }}
            />
            {q.status === 'draft' && (
              <ListRow
                leading={<Send size={18} />}
                label={t('quotation.markSent')}
                chevron={false}
                onClick={() => { if (!busy) { setActionsOpen(false); updateStatus('sent') } }}
              />
            )}
            {(q.status === 'draft' || q.status === 'sent') && (
              <>
                <ListRow
                  leading={<CheckCheck size={18} />}
                  label={t('quotation.markAccepted')}
                  chevron={false}
                  onClick={() => { if (!busy) { setActionsOpen(false); updateStatus('accepted') } }}
                />
                <ListRow
                  leading={<XCircle size={18} />}
                  label={t('quotation.markRejected')}
                  chevron={false}
                  onClick={() => { if (!busy) { setActionsOpen(false); updateStatus('rejected') } }}
                />
              </>
            )}
            <ListRow
              leading={<Copy size={18} />}
              label={t('quotation.makeRevision')}
              chevron={false}
              onClick={() => { setActionsOpen(false); navigate(`/quotations/new?revisionOf=${q.id}`) }}
            />
            {canConvert && (
              <ListRow
                leading={<Receipt size={18} />}
                label={t('quotation.convertToInvoice')}
                chevron={false}
                onClick={() => { setActionsOpen(false); convertToInvoice() }}
              />
            )}
            {q.converted_invoice_id && (
              <ListRow
                leading={<Receipt size={18} />}
                label={t('quotation.viewInvoice')}
                chevron={false}
                onClick={() => { setActionsOpen(false); navigate(`/invoices/${q.converted_invoice_id}`) }}
              />
            )}
            {canDelete && (
              <ListRow
                leading={<Trash2 size={18} className="text-danger" />}
                label={<span className="text-danger">{t('quotation.delete')}</span>}
                chevron={false}
                onClick={() => setDeleteConfirm(true)}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            <p className="text-sm text-ink-soft">{t('quotation.deleteConfirmText')}</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>
                <Trash2 size={15} />
                {deleting ? '...' : t('common.deleteConfirmAction')}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
