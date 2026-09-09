import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { ArrowLeft, FileDown, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { generateInvoicePDF, buildInvoiceFilename, fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { getLogoBase64 } from '@/lib/pdf-common'
import { logActivity } from '@/lib/activity-logger'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui-kit'
import { nextDocumentNumber } from '@/lib/document-number.firestore'
import { useLineItems, newBlankItem, type FormItem } from '@/hooks/useLineItems'
import { LineItemsEditor } from '@/components/LineItemsEditor'

// A row counts only when it has a description and a positive unit price
const isFilled = (li: FormItem) => li.description.trim() !== '' && parseFloat(li.unit_price) > 0

export default function NewCustomInvoice() {
  const navigate          = useNavigate()
  const { user, userDoc } = useAuth()
  const { t }             = useLanguage()
  const isAdmin           = userDoc?.role === 'admin'

  const [billedTo, setBilledTo]     = useState('')
  const [reference, setReference]   = useState('')
  const { items, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems } = useLineItems(
    [newBlankItem('r1'), newBlankItem('r2'), newBlankItem('r3')],
    { minItems: 1 },
  )
  const [gajiToggle, setGajiToggle] = useState(false)
  const [gajiAmount, setGajiAmount] = useState('')
  const [saving, setSaving]         = useState(false)

  const gajiNum = gajiToggle ? (parseFloat(gajiAmount) || 0) : 0
  const total   = subtotal - gajiNum

  async function save(andDownload = false) {
    if (!user) return
    if (!billedTo.trim()) { toast.error(t('invoice.validation.billedTo')); return }
    const activeItems = items.filter(isFilled)
    if (activeItems.length === 0) { toast.error(t('invoice.validation.items')); return }

    setSaving(true)
    try {
      // Year from the document date. This form has no date field yet (invoice_date
      // is serverTimestamp()), so "now" IS the document date — pass it explicitly.
      const invoiceNo = await nextDocumentNumber('invoice', new Date().getFullYear())
      const lineItems = toLineItems(isFilled)

      const docRef = await addDoc(collection(db, 'invoices'), {
        event_id:     null,
        type:         'custom',
        reference:    reference.trim(),
        invoice_no:   invoiceNo,
        invoice_date: serverTimestamp(),
        billed_to:    billedTo.trim(),
        line_items:   lineItems,
        subtotal,
        gaji_pekerja: gajiNum,
        total,
        status:       'draft',
        created_at:   serverTimestamp(),
      })

      if (andDownload) {
        const inv: InvoiceDoc = {
          id:           docRef.id,
          event_id:     null,
          type:         'custom',
          reference:    reference.trim(),
          invoice_no:   invoiceNo,
          invoice_date: new Date(),
          billed_to:    billedTo.trim(),
          line_items:   lineItems,
          subtotal,
          gaji_pekerja: gajiNum,
          total,
          status:       'draft',
          created_at:   new Date(),
        }
        const logoBase64 = await getLogoBase64()
        const filename = buildInvoiceFilename({
          type: 'custom',
          billedTo: billedTo.trim(),
          reference: reference.trim(),
          date: new Date(),
        })
        await generateInvoicePDF(inv, reference.trim(), logoBase64, filename)
      }

      logActivity({
        action: 'invoice_created',
        category: 'invoice',
        description: `Invois custom ${invoiceNo} dicipta untuk ${billedTo.trim()}`,
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

  if (!isAdmin) return <Navigate to="/dashboard" replace />

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
          <h1 className="text-xl font-bold text-ink">{t('invoice.customTitle')}</h1>
          <p className="text-sm text-ink-soft">{t('invoice.customSubtitle')}</p>
        </div>
      </div>

      {/* FROM — read-only */}
      <div className="bg-ink rounded-xl px-5 py-4 mb-5">
        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1.5">{t('invoice.from')}</p>
        <p className="text-white font-bold text-sm">KAKMELL RESOURCES</p>
        <p className="text-white/60 text-xs mt-0.5">
          NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI, 81700 PASIR GUDANG, JOHOR
        </p>
        <p className="text-white/60 text-xs">Phone: +6018-397 0769</p>
      </div>

      {/* BILL TO + REFERENCE */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
            {t('invoice.billedTo')}
          </label>
          <input
            type="text"
            value={billedTo}
            onChange={e => setBilledTo(e.target.value)}
            placeholder={t('invoice.billToPlaceholder')}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/25 placeholder:font-normal placeholder:text-ink-soft"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5">
            {t('invoice.referenceLabel')}{' '}
            <span className="text-ink-soft/50 font-normal normal-case">{t('invoice.optional')}</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder={t('invoice.referencePlaceholder')}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/25 placeholder:text-ink-soft"
          />
        </div>
      </div>

      {/* Line items table */}
      <LineItemsEditor
        items={items}
        onUpdate={updateItem}
        onRemove={removeItem}
        onAdd={addItem}
        canRemove={canRemove}
        addButtonVariant="compact"
      />

      {/* Gaji Pekerja toggle */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGajiToggle(prev => !prev)}
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
              gajiToggle
                ? 'bg-ink border-ink'
                : 'border-line bg-surface'
            )}
          >
            {gajiToggle && (
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <span className="text-sm text-ink font-medium">{t('invoice.addStaffWages')}</span>
        </div>

        {gajiToggle && (
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-sm text-ink-soft">{t('invoice.staffWagesHint')}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-ink-soft">RM</span>
              <input
                type="number"
                value={gajiAmount}
                onChange={e => setGajiAmount(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="w-28 text-right border border-line rounded-lg px-2.5 py-1.5 text-sm font-semibold text-danger focus:outline-none focus:border-ink tabular-nums"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-surface rounded-xl border border-line shadow-sm px-4 py-4 mb-6">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-semibold text-ink tabular-nums">{fmtRM(subtotal)}</span>
          </div>
          {gajiToggle && gajiNum > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{t('invoice.gajiPerkerja')}</span>
              <span className="font-semibold text-danger tabular-nums">({fmtRM(gajiNum)})</span>
            </div>
          )}
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
            {saving ? t('invoice.saving') : t('invoice.saveDownload')}
          </Button>
        </div>
      </div>
    </div>
  )
}
