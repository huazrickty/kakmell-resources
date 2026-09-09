import { useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, FileDown, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvent } from '@/hooks/useEvent'
import type { EventDoc } from '@/hooks/useEvents'
import { useQuotation } from '@/hooks/useQuotations'
import { nextDocumentNumber } from '@/lib/document-number.firestore'
import { getLogoBase64 } from '@/lib/pdf-common'
import { generateQuotationPDF } from '@/lib/quotation-pdf'
import {
  buildQuotationFilename, defaultValidUntil, computeTotals,
  type QuotationDoc, type QuotationCustomer,
} from '@/lib/quotations'
import { getKateringUnitPrice, getBerkatSuggestion, fmtUnitPriceInput, MAKAN_BERADAB_PRICE } from '@/lib/pricing'
import { fmtRM } from '@/lib/invoice-pdf'
import { logActivity } from '@/lib/activity-logger'
import { useLineItems, newBlankItem, fromLineItems, isActive, type FormItem } from '@/hooks/useLineItems'
import { LineItemsEditor } from '@/components/LineItemsEditor'
import { Button, Input, Textarea } from '@/components/ui-kit'

// ── Date helpers (form uses yyyy-MM-dd strings; parse as LOCAL dates) ──────

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const toInput = (d: Date) => format(d, 'yyyy-MM-dd')

// ── Initial form values (built once the async sources have loaded) ─────────

interface FormInitial {
  eventId: string | null
  eventName: string
  eventHall: string
  eventDate: Date | null
  pax: number
  customer: QuotationCustomer
  items: FormItem[]
  discount: string
  notes: string
  revisionOf: string | null
  revisionOfNo: string
}

function presetItemsForEvent(hall: string, pax: number): FormItem[] {
  return [
    {
      id: 'katering',
      description: `Katering — ${hall} — ${pax} pax`,
      qty: String(pax),
      unit_price: fmtUnitPriceInput(getKateringUnitPrice(pax)),
      protected: true,
      toggled: true,
      qtyLocked: true,
    },
    {
      id: 'makanberadab',
      description: 'Makan Beradab',
      qty: '1',
      unit_price: String(MAKAN_BERADAB_PRICE),
      protected: true,
      toggled: true,
      toggleable: true,
    },
    { id: 'berkat', description: 'Berkat', qty: '1', unit_price: String(getBerkatSuggestion(pax)), toggled: true },
  ]
}

function initialFromEvent(ev: EventDoc): FormInitial {
  return {
    eventId: ev.id, eventName: ev.nama_majlis, eventHall: ev.hall_name,
    eventDate: ev.tarikh?.toDate ? ev.tarikh.toDate() : null, pax: ev.pax,
    customer: { name: '', phone: '', address: '' },
    items: presetItemsForEvent(ev.hall_name, ev.pax),
    discount: '', notes: '', revisionOf: null, revisionOfNo: '',
  }
}

function initialFromRevision(q: QuotationDoc): FormInitial {
  return {
    eventId: q.event_id, eventName: q.event_name, eventHall: '', eventDate: null, pax: q.pax,
    customer: { name: q.customer.name, phone: q.customer.phone ?? '', address: q.customer.address ?? '' },
    items: fromLineItems(q.line_items, 'rev'),
    discount: q.discount ? fmtUnitPriceInput(q.discount) : '',
    notes: q.notes ?? '',
    revisionOf: q.id, revisionOfNo: q.quotation_no,
  }
}

const BLANK: FormInitial = {
  eventId: null, eventName: '', eventHall: '', eventDate: null, pax: 0,
  customer: { name: '', phone: '', address: '' },
  items: [newBlankItem('r1'), newBlankItem('r2'), newBlankItem('r3')],
  discount: '', notes: '', revisionOf: null, revisionOfNo: '',
}

// ── Page: resolves ?eventId / ?revisionOf, then mounts the form once ────────

export default function NewQuotation() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const eventId     = params.get('eventId') ?? ''
  const revisionOf  = params.get('revisionOf') ?? ''
  const { userDoc } = useAuth()
  const { t }       = useLanguage()
  const isAdmin     = userDoc?.role === 'admin'

  const { event, loading: eventLoading }         = useEvent(eventId || '__none__')
  const { quotation: parent, loading: parentLoading } = useQuotation(revisionOf || null)

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const waiting = (eventId && eventLoading) || (revisionOf && parentLoading)
  if (waiting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" />
      </div>
    )
  }

  if (eventId && !event) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-ink-soft">{t('quotation.eventNotFound')}</p>
        <button onClick={() => navigate('/quotations')} className="mt-4 text-ink text-sm font-medium hover:underline">
          ← {t('quotation.title')}
        </button>
      </div>
    )
  }
  if (revisionOf && !parent) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-ink-soft">{t('quotation.notFound')}</p>
        <button onClick={() => navigate('/quotations')} className="mt-4 text-ink text-sm font-medium hover:underline">
          ← {t('quotation.title')}
        </button>
      </div>
    )
  }

  const initial = parent ? initialFromRevision(parent) : event ? initialFromEvent(event) : BLANK
  // key forces a fresh form if the user navigates between ?eventId / ?revisionOf targets
  return <QuotationForm key={`${eventId}|${revisionOf}`} initial={initial} />
}

// ── Form ───────────────────────────────────────────────────────────────────

function QuotationForm({ initial }: { initial: FormInitial }) {
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()

  const today = new Date()
  const [customerName, setCustomerName]       = useState(initial.customer.name)
  const [customerPhone, setCustomerPhone]     = useState(initial.customer.phone ?? '')
  const [customerAddress, setCustomerAddress] = useState(initial.customer.address ?? '')
  const [quotationDate, setQuotationDate]     = useState(toInput(today))
  const [validUntil, setValidUntil]           = useState(toInput(defaultValidUntil(today)))
  const [validTouched, setValidTouched]       = useState(false)
  const [pax, setPax]                         = useState(initial.pax ? String(initial.pax) : '')
  const [discount, setDiscount]               = useState(initial.discount)
  const [notes, setNotes]                     = useState(initial.notes)
  const [saving, setSaving]                   = useState(false)

  const { items, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems } =
    useLineItems(initial.items, { minItems: 1 })

  const totals = computeTotals(subtotal, parseFloat(discount) || 0)

  function onQuotationDateChange(v: string) {
    setQuotationDate(v)
    if (!validTouched && v) setValidUntil(toInput(defaultValidUntil(parseLocalDate(v))))
  }

  // A row counts only when it has a description and a non-zero price
  const isFilled = (li: FormItem) => isActive(li) && li.description.trim() !== '' && (parseFloat(li.unit_price) || 0) !== 0

  async function save(andDownload = false) {
    if (!user) return
    if (!customerName.trim()) { toast.error(t('quotation.validation.customer')); return }
    const activeItems = items.filter(isFilled)
    if (activeItems.length === 0) { toast.error(t('quotation.validation.items')); return }
    const qDate = parseLocalDate(quotationDate)
    const vDate = parseLocalDate(validUntil)
    if (!(vDate.getTime() > qDate.getTime())) { toast.error(t('quotation.validation.validUntil')); return }

    setSaving(true)
    try {
      // Year from the DOCUMENT date (form field), never the clock
      const quotationNo = await nextDocumentNumber('quotation', qDate.getFullYear())
      const lineItems   = toLineItems(isFilled)
      const customer: QuotationCustomer = { name: customerName.trim() }
      if (customerPhone.trim())   customer.phone   = customerPhone.trim()
      if (customerAddress.trim()) customer.address = customerAddress.trim()

      const payload = {
        quotation_no:   quotationNo,
        quotation_date: Timestamp.fromDate(qDate),
        valid_until:    Timestamp.fromDate(vDate),
        event_id:       initial.eventId,
        event_name:     initial.eventName,
        pax:            parseInt(pax, 10) || 0,
        customer,
        line_items:     lineItems,
        subtotal:       totals.subtotal,
        discount:       totals.discount,
        total:          totals.total,
        status:         'draft' as const,
        ...(initial.revisionOf && { revision_of: initial.revisionOf }),
        ...(notes.trim() && { notes: notes.trim() }),
        created_by:     user.uid,
        created_at:     serverTimestamp(),
        updated_at:     serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, 'quotations'), payload)

      if (andDownload) {
        const q: QuotationDoc = {
          ...payload, id: docRef.id,
          quotation_date: qDate, valid_until: vDate, created_at: new Date(), updated_at: new Date(),
        }
        const logo = await getLogoBase64()
        await generateQuotationPDF(q, logo, buildQuotationFilename(q))
      }

      logActivity({
        action: 'quotation_created',
        category: 'quotation',
        description: initial.revisionOf
          ? `Sebut harga ${quotationNo} (revisi ${initial.revisionOfNo}) dicipta untuk ${customer.name}`
          : `Sebut harga ${quotationNo} dicipta untuk ${customer.name}`,
        entity_id: docRef.id,
        entity_name: quotationNo,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('quotation.toast.saved'))
      navigate(`/quotations/${docRef.id}`)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
      setSaving(false)
    }
  }

  const label = 'block text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-28 md:pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-ink-soft hover:text-ink transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink">{t('quotation.new')}</h1>
          <p className="text-sm text-ink-soft">
            {initial.revisionOf
              ? `${t('quotation.revisionOf')} ${initial.revisionOfNo}`
              : initial.eventName || t('quotation.standalone')}
          </p>
        </div>
      </div>

      {/* Event banner (snapshot) */}
      {initial.eventName && (
        <div className="bg-ink rounded-xl px-5 py-3.5 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="text-white font-bold text-sm">{initial.eventName}</span>
          {initial.eventHall && <span className="text-white/60 text-xs">{initial.eventHall}</span>}
          {initial.eventDate && <span className="text-white/60 text-xs">{format(initial.eventDate, 'd MMM yyyy')}</span>}
          {initial.pax > 0 && <span className="text-white/60 text-xs">{initial.pax} pax</span>}
        </div>
      )}

      {/* Customer */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4 space-y-3">
        <div>
          <label className={label}>{t('quotation.customerName')}</label>
          <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('quotation.customerNamePlaceholder')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>{t('quotation.customerPhone')} <span className="text-ink-soft/50 font-normal normal-case">{t('invoice.optional')}</span></label>
            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} inputMode="tel" />
          </div>
          {!initial.eventId && (
            <div>
              <label className={label}>{t('quotation.pax')} <span className="text-ink-soft/50 font-normal normal-case">{t('invoice.optional')}</span></label>
              <Input type="number" value={pax} onChange={e => setPax(e.target.value)} inputMode="numeric" />
            </div>
          )}
        </div>
        <div>
          <label className={label}>{t('quotation.customerAddress')} <span className="text-ink-soft/50 font-normal normal-case">{t('invoice.optional')}</span></label>
          <Textarea rows={2} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
        </div>
      </div>

      {/* Dates */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('quotation.quotationDate')}</label>
          <Input type="date" value={quotationDate} onChange={e => onQuotationDateChange(e.target.value)} />
        </div>
        <div>
          <label className={label}>{t('quotation.validUntil')}</label>
          <Input type="date" value={validUntil} min={quotationDate} onChange={e => { setValidTouched(true); setValidUntil(e.target.value) }} />
        </div>
      </div>

      {/* Line items */}
      <LineItemsEditor
        items={items}
        onUpdate={updateItem}
        onRemove={removeItem}
        onAdd={addItem}
        canRemove={canRemove}
        addButtonVariant="compact"
      />

      {/* Discount + notes */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">{t('quotation.discount')} <span className="text-ink-soft/50">{t('invoice.optional')}</span></span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-ink-soft">RM</span>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-28 text-right border border-line rounded-lg px-2.5 py-1.5 text-sm font-semibold text-danger focus:outline-none focus:border-ink tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className={label}>{t('quotation.notes')} <span className="text-ink-soft/50 font-normal normal-case">{t('invoice.optional')}</span></label>
          <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('quotation.notesPlaceholder')} />
        </div>
      </div>

      {/* Totals */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-6">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">{t('invoice.subtotal')}</span>
            <span className="font-semibold text-ink tabular-nums">{fmtRM(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{t('quotation.discount')}</span>
              <span className="font-semibold text-danger tabular-nums">({fmtRM(totals.discount)})</span>
            </div>
          )}
          <div className="h-px bg-ink/5" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink text-base">{t('invoice.totalLabel')}</span>
            <span className="font-black text-xl text-ink tabular-nums">{fmtRM(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed md:sticky left-0 right-0 md:left-auto md:right-auto bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 bg-bg/95 backdrop-blur border-t border-line px-4 py-3 md:mt-6 md:-mx-6 md:px-6 z-40">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => save(false)}>
            <Save size={15} />
            {t('quotation.saveDraft')}
          </Button>
          <Button className="flex-1" disabled={saving} onClick={() => save(true)}>
            <FileDown size={15} />
            {saving ? t('quotation.saving') : t('quotation.saveDownload')}
          </Button>
        </div>
      </div>
    </div>
  )
}
