import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, FileDown, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvent } from '@/hooks/useEvent'
import { generateInvoicePDF, buildInvoiceFilename, fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { getLogoBase64 } from '@/lib/pdf-common'
import { logActivity } from '@/lib/activity-logger'
import { Button } from '@/components/ui-kit'
import { useLineItems, isActive } from '@/hooks/useLineItems'
import { LineItemsEditor } from '@/components/LineItemsEditor'
import { getKateringUnitPrice, getGajiPekerja, getBerkatSuggestion, fmtUnitPriceInput, MAKAN_BERADAB_PRICE } from '@/lib/pricing'
import { nextDocumentNumber } from '@/lib/document-number.firestore'

// ── Main ───────────────────────────────────────────────────────────────────

export default function NewInvoice() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const eventId  = params.get('eventId') ?? ''
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'

  const { event, loading: eventLoading } = useEvent(eventId)
  const [checkDone, setCheckDone]       = useState(false)
  const { items, setItems, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems } = useLineItems()
  const [gajiPerkerja, setGajiPerkerja] = useState('')
  const [saving, setSaving]             = useState(false)

  // Check for existing invoice — redirect if found
  useEffect(() => {
    if (!eventId) { navigate('/invoices'); return }
    getDocs(query(collection(db, 'invoices'), where('event_id', '==', eventId))).then((snap) => {
      if (!snap.empty) {
        toast.info(t('invoice.alreadyExists'))
        navigate(`/invoices/${snap.docs[0].id}`, { replace: true })
      } else {
        setCheckDone(true)
      }
    })
  }, [eventId])

  // Pre-populate from event once loaded
  useEffect(() => {
    if (!event || !checkDone) return
    setItems([
      {
        id: 'katering',
        description: `Katering — ${event.hall_name} — ${event.pax} pax`,
        qty: String(event.pax),
        // Tiered suggestion: < 300 pax → RM15.00, >= 300 pax → RM10.50 (editable)
        unit_price: fmtUnitPriceInput(getKateringUnitPrice(event.pax)),
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
      {
        id: 'berkat',
        description: 'Berkat',
        qty: '1',
        unit_price: String(getBerkatSuggestion(event.pax)),
        protected: false,
        toggled: true,
      },
    ])
    setGajiPerkerja(String(getGajiPekerja(event.pax)))
    // setItems is a useState setter (stable identity) re-exposed by useLineItems
  }, [event, checkDone, setItems])

  // Computed totals
  const gajiNum = parseFloat(gajiPerkerja) || 0
  const total   = subtotal - gajiNum

  async function save(andDownload = false) {
    if (!user || !event) return
    setSaving(true)
    try {
      // Year from the document date. This form has no date field yet (invoice_date
      // is serverTimestamp()), so "now" IS the document date — pass it explicitly.
      const invoiceNo  = await nextDocumentNumber('invoice', new Date().getFullYear())
      const lineItems  = toLineItems(isActive)

      const docRef = await addDoc(collection(db, 'invoices'), {
        event_id:     eventId,
        invoice_no:   invoiceNo,
        invoice_date: serverTimestamp(),
        billed_to:    'ZB GROUP SDN BHD',
        line_items:   lineItems,
        subtotal,
        gaji_pekerja: gajiNum,
        total,
        status:       'draft',
        created_at:   serverTimestamp(),
      })

      if (andDownload) {
        const inv: InvoiceDoc = {
          id: docRef.id, event_id: eventId, invoice_no: invoiceNo,
          invoice_date: new Date(), billed_to: 'ZB GROUP SDN BHD',
          line_items: lineItems, subtotal, gaji_pekerja: gajiNum, total,
          status: 'draft', created_at: new Date(),
        }
        const logoBase64 = await getLogoBase64()
        const filename = buildInvoiceFilename({
          type: 'regular',
          hallName: event.hall_name,
          eventDate: event.tarikh.toDate(),
          sesi: event.sesi,
          eventName: event.nama_majlis,
        })
        await generateInvoicePDF(inv, event.nama_majlis, logoBase64, filename)
      }

      logActivity({
        action: 'invoice_created',
        category: 'invoice',
        description: `Invois baharu ${invoiceNo} dicipta untuk ${event.nama_majlis}`,
        entity_id: docRef.id,
        entity_name: invoiceNo,
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('invoice.toast.saved'))
      navigate(`/invoices/${docRef.id}`)
    } catch (err) {
      console.error(err)
      toast.error(t('common.error'))
      setSaving(false)
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (eventLoading || !checkDone) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-ink-soft">{t('invoice.eventNotFound')}</p>
        <button onClick={() => navigate('/invoices')} className="mt-4 text-ink text-sm font-medium hover:underline">
          ← {t('invoice.title')}
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-28 md:pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink">{t('invoice.new')}</h1>
          <p className="text-sm text-ink-soft">{event.nama_majlis}</p>
        </div>
      </div>

      {/* Event banner */}
      <div className="bg-ink rounded-xl px-5 py-3.5 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="text-white font-bold text-sm">{event.nama_majlis}</span>
        <span className="text-white/60 text-xs">{event.hall_name}</span>
        <span className="text-white/60 text-xs">{format(event.tarikh.toDate(), 'd MMM yyyy')}</span>
        <span className="text-white/60 text-xs">{event.pax} pax</span>
      </div>

      {/* Line items table */}
      <LineItemsEditor
        items={items}
        onUpdate={updateItem}
        onRemove={removeItem}
        onAdd={addItem}
        canRemove={canRemove}
        addButtonVariant="row"
      />

      {/* Gaji Pekerja */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4">
        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">
          {t('invoice.gajiPerkerja')} <span className="text-ink-soft/50 font-normal">(tolakan)</span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">{t('invoice.staffWagesHint')}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-ink-soft">RM</span>
            <input
              type="number"
              value={gajiPerkerja}
              onChange={(e) => setGajiPerkerja(e.target.value)}
              step="0.01"
              className="w-28 text-right border border-line rounded-lg px-2.5 py-1.5 text-sm font-semibold text-danger focus:outline-none focus:border-ink tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-6">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-semibold text-ink tabular-nums">{fmtRM(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">{t('invoice.gajiPerkerja')}</span>
            <span className="font-semibold text-danger tabular-nums">({fmtRM(gajiNum)})</span>
          </div>
          <div className="h-px bg-ink/5" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink text-base">{t('invoice.totalLabel')}</span>
            <span className="font-black text-xl text-ink tabular-nums">{fmtRM(total)}</span>
          </div>
        </div>
      </div>

      {/* Sticky action bar — thumb-reachable, above the bottom nav */}
      <div className="fixed md:sticky left-0 right-0 md:left-auto md:right-auto bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 bg-bg/95 backdrop-blur border-t border-line px-4 py-3 md:mt-6 md:-mx-6 md:px-6 z-40">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => save(false)}>
            <Save size={15} />
            {t('invoice.saveDraft')}
          </Button>
          <Button className="flex-1" disabled={saving} onClick={() => save(true)}>
            <FileDown size={15} />
            {saving ? t('invoice.saving') : t('invoice.downloadPdf')}
          </Button>
        </div>
      </div>
    </div>
  )
}
