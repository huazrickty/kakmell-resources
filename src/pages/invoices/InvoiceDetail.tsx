import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { ArrowLeft, Download, Send, CheckCheck, Building2, Trash2, MoreHorizontal } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { generateInvoicePDF, buildInvoiceFilename, fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { getLogoBase64 } from '@/lib/pdf-common'
import { tsToDate, fmtDateDMY } from '@/lib/date-utils'
import { getStatusMeta } from '@/lib/document-status'
import { logActivity } from '@/lib/activity-logger'
import { Button, BottomSheet, ListRow } from '@/components/ui-kit'
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge'
import { cn } from '@/lib/utils'

export default function InvoiceDetail() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { user, userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'

  const [invoice, setInvoice]       = useState<InvoiceDoc | null>(null)
  const [eventName, setEventName]   = useState('')
  const [eventHallName, setEventHallName] = useState('')
  const [eventTarikh, setEventTarikh]     = useState<Date | null>(null)
  const [eventSesi, setEventSesi]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [busy, setBusy]             = useState(false)
  const [actionsOpen, setActionsOpen]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (!id) return
    const unsub = onSnapshot(doc(db, 'invoices', id), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as InvoiceDoc
        setInvoice(data)
        if (data.event_id) {
          const evSnap = await getDoc(doc(db, 'events', data.event_id))
          if (evSnap.exists()) {
            const ev = evSnap.data()
            setEventName(ev.nama_majlis ?? '')
            setEventHallName(ev.hall_name ?? '')
            setEventSesi(ev.sesi ?? '')
            if (ev.tarikh?.toDate) setEventTarikh(ev.tarikh.toDate())
          }
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
      const invoiceNo = invoice?.invoice_no ?? ''
      await deleteDoc(doc(db, 'invoices', id))
      logActivity({
        action: 'invoice_deleted',
        category: 'invoice',
        description: `Invois dipadam: ${invoiceNo}`,
        entity_id: id,
        entity_name: invoiceNo,
        performed_by: user?.uid ?? '',
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('invoice.toast.deleted'))
      navigate('/invoices')
    } catch {
      toast.error(t('common.error'))
      setDeleting(false)
    }
  }

  async function updateStatus(status: 'sent' | 'paid') {
    if (!id) return
    setBusy(true)
    try {
      await updateDoc(doc(db, 'invoices', id), { status })
      logActivity({
        action: 'invoice_status_changed',
        category: 'invoice',
        description: `Status invois ${invoice?.invoice_no ?? ''} ditukar ke '${status}'`,
        entity_id: id,
        entity_name: invoice?.invoice_no ?? '',
        performed_by: user?.uid ?? '',
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('invoice.toast.statusUpdated'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function downloadPdf() {
    if (!invoice) return
    const logo = await getLogoBase64()
    const invDate = tsToDate(invoice.invoice_date)
    const filename = invoice.type === 'custom'
      ? buildInvoiceFilename({ type: 'custom', billedTo: invoice.billed_to, reference: invoice.reference, date: invDate })
      : buildInvoiceFilename({ type: 'regular', hallName: eventHallName, eventDate: eventTarikh ?? invDate, sesi: eventSesi, eventName })
    await generateInvoicePDF(invoice, eventName, logo, filename)
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-ink-soft">{t('invoice.notFound')}</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 text-ink text-sm font-semibold underline underline-offset-2"
        >
          ← {t('invoice.title')}
        </button>
      </div>
    )
  }

  const invDate    = tsToDate(invoice.invoice_date)
  const statusKey  = invoice.status as 'draft' | 'sent' | 'paid'

  const regularItems = invoice.line_items.filter(li => !li.is_deduction)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Navigation + status + overflow */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-1.5 min-h-11 text-ink-soft hover:text-ink text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          {t('invoice.title')}
        </button>
        <div className="flex items-center gap-2">
          <DocumentStatusBadge kind="invoice" status={invoice.status} />
          <button
            onClick={() => { setActionsOpen(true); setDeleteConfirm(false) }}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
            aria-label={t('common.actions')}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* ── Invoice document ──────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden mb-5">
        <div className={cn('h-1', getStatusMeta('invoice', invoice.status).strip)} />

        <div className="p-6 md:p-8">
          {/* Header block */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
            <div>
              <p className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
                KAKMELL RESOURCES
              </p>
              <p className="text-xs text-ink-soft leading-5">
                NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,<br />
                81700 PASIR GUDANG, JOHOR<br />
                +6018-397 0769
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <p className="text-xl font-bold text-ink leading-none mb-3 tracking-tight">INVOICE</p>
              <div className="space-y-1 text-xs">
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">Date:</span>
                  <span className="text-ink tabular-nums">{fmtDateDMY(invDate)}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">Invoice #:</span>
                  <span className="font-bold text-ink tabular-nums">{invoice.invoice_no}</span>
                </div>
                <div className="flex sm:justify-end gap-2">
                  <span className="text-ink-soft">Customer ID:</span>
                  <span className="text-ink">CUST-001</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-line mb-5" />

          {/* Bill To */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
              {t('invoice.billedTo')}
            </p>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 size={13} strokeWidth={1.5} className="text-ink-soft shrink-0" />
              <span className="font-bold text-ink">{invoice.billed_to || 'ZB GROUP SDN BHD'}</span>
            </div>
            {eventName && (
              <p className="text-xs text-ink-soft ml-[21px]">Event: {eventName}</p>
            )}
          </div>

          {/* Line items */}
          <div className="mb-6 -mx-2 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead>
                <tr className="bg-ink text-white">
                  <th className="text-left text-xs font-bold tracking-wide py-2.5 px-3 w-10 rounded-tl-lg">
                    {t('invoice.item')}
                  </th>
                  <th className="text-left text-xs font-bold tracking-wide py-2.5 px-3">
                    {t('invoice.description')}
                  </th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-14">
                    {t('invoice.qty')}
                  </th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-28">
                    {t('invoice.unitPrice')}
                  </th>
                  <th className="text-center text-xs font-bold tracking-wide py-2.5 px-3 w-12">
                    {t('invoice.tax')}
                  </th>
                  <th className="text-right text-xs font-bold tracking-wide py-2.5 px-3 w-28 rounded-tr-lg">
                    {t('invoice.total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {regularItems.map((li, i) => (
                  <tr
                    key={i}
                    className={cn('border-b border-line/60', i % 2 === 1 && 'bg-ink/[0.02]')}
                  >
                    <td className="py-2.5 px-3 text-ink-soft text-xs tabular-nums">{i + 1}</td>
                    <td className="py-2.5 px-3 text-ink">{li.description}</td>
                    <td className="py-2.5 px-3 text-right text-ink-soft tabular-nums">{li.qty}</td>
                    <td className="py-2.5 px-3 text-right text-ink-soft tabular-nums">{fmtRM(li.unit_price)}</td>
                    <td className="py-2.5 px-3 text-center text-ink-soft">-</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-ink tabular-nums">{fmtRM(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals — subtotal / deduction / TOTAL hierarchy */}
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
                  <span className="text-ink-soft text-xs">{label}</span>
                  <span className="text-ink-soft tabular-nums text-xs">{val}</span>
                </div>
              ))}
              {invoice.gaji_pekerja > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft text-xs">GAJI PEKERJA:</span>
                  <span className="text-danger font-semibold tabular-nums text-xs">
                    ({fmtRM(invoice.gaji_pekerja)})
                  </span>
                </div>
              )}
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-bold text-ink">TOTAL:</span>
                <span className="font-bold text-xl text-ink tabular-nums">{fmtRM(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer — mirrors the PDF's payment block */}
          <div className="border-t border-line pt-4 space-y-1">
            <p className="text-xs font-bold text-ink">Thank You For Your Business!</p>
            <p className="text-xs text-ink-soft leading-relaxed">
              KAKMELL RESOURCES<br />
              32601052091<br />
              HONG LEONG BANK
            </p>
          </div>
        </div>
      </div>

      {/* ── Actions sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        open={actionsOpen}
        onClose={() => { setActionsOpen(false); setDeleteConfirm(false) }}
        title={invoice.invoice_no}
      >
        {!deleteConfirm ? (
          <div className="pb-2 -mx-4 divide-y divide-line">
            <ListRow
              leading={<Download size={18} />}
              label={t('invoice.downloadPdf')}
              chevron={false}
              onClick={async () => { setActionsOpen(false); await downloadPdf() }}
            />
            {statusKey === 'draft' && (
              <ListRow
                leading={<Send size={18} />}
                label={t('invoice.markSent')}
                chevron={false}
                onClick={() => { if (!busy) { setActionsOpen(false); updateStatus('sent') } }}
              />
            )}
            {(statusKey === 'draft' || statusKey === 'sent') && (
              <ListRow
                leading={<CheckCheck size={18} />}
                label={t('invoice.markPaid')}
                chevron={false}
                onClick={() => { if (!busy) { setActionsOpen(false); updateStatus('paid') } }}
              />
            )}
            <ListRow
              leading={<Trash2 size={18} className="text-danger" />}
              label={<span className="text-danger">{t('invoice.delete')}</span>}
              chevron={false}
              onClick={() => setDeleteConfirm(true)}
            />
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            <p className="text-sm text-ink-soft">{t('invoice.deleteConfirmText')}</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(false)}>
                {t('common.cancel')}
              </Button>
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
