import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ArrowLeft, Trash2, Plus, FileDown, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvent } from '@/hooks/useEvent'
import { generateInvoicePDF, buildInvoiceFilename, getLogoBase64, fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { logActivity } from '@/lib/activity-logger'
import { cn } from '@/lib/utils'

// ── Lookup tables ──────────────────────────────────────────────────────────

const GAJI_TABLE: [number, number][] = [
  [300, 530], [400, 590], [500, 850], [650, 910],
  [700, 970], [800, 1030], [1000, 1150], [1300, 1680], [1500, 2000],
]

function getGajiSuggestion(pax: number): number {
  for (const [bracket, gaji] of GAJI_TABLE) {
    if (pax <= bracket) return gaji
  }
  return 2000
}

function getBerkatSuggestion(pax: number): number {
  if (pax <= 500) return 100
  if (pax <= 800) return 200
  return 300
}

async function nextInvoiceNo(): Promise<string> {
  const snap = await getDocs(collection(db, 'invoices'))
  const num  = snap.size + 1
  return `INV-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FormItem {
  id: string
  description: string
  qty: string
  unit_price: string
  protected: boolean
  toggled: boolean
}

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
  const [items, setItems]               = useState<FormItem[]>([])
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
        unit_price: '10',
        protected: true,
        toggled: true,
      },
      {
        id: 'makanberadab',
        description: 'Makan Beradab',
        qty: '1',
        unit_price: '100',
        protected: true,
        toggled: true,
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
    setGajiPerkerja(String(getGajiSuggestion(event.pax)))
  }, [event, checkDone])

  // Computed totals
  const subtotal = useMemo(() =>
    items.filter(li => li.toggled).reduce((sum, li) => {
      return sum + (parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0)
    }, 0),
  [items])

  const gajiNum = parseFloat(gajiPerkerja) || 0
  const total   = subtotal - gajiNum

  function updateItem(id: string, field: keyof FormItem, value: string | boolean) {
    setItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li))
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      description: '',
      qty: '1',
      unit_price: '',
      protected: false,
      toggled: true,
    }])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(li => li.id !== id))
  }

  async function save(andDownload = false) {
    if (!user || !event) return
    setSaving(true)
    try {
      const invoiceNo  = await nextInvoiceNo()
      const lineItems  = items.filter(li => li.toggled).map(li => ({
        description: li.description,
        qty:         parseFloat(li.qty) || 0,
        unit_price:  parseFloat(li.unit_price) || 0,
        total:       (parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0),
        is_deduction: false,
      }))

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B4332]" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-sm text-gray-400">{t('invoice.eventNotFound')}</p>
        <button onClick={() => navigate('/invoices')} className="mt-4 text-[#1B4332] text-sm font-medium hover:underline">
          ← {t('invoice.title')}
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('invoice.new')}</h1>
          <p className="text-sm text-gray-500">{event.nama_majlis}</p>
        </div>
      </div>

      {/* Event banner */}
      <div className="bg-[#1B4332] rounded-xl px-5 py-3.5 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="text-white font-bold text-sm">{event.nama_majlis}</span>
        <span className="text-white/60 text-xs">{event.hall_name}</span>
        <span className="text-white/60 text-xs">{format(event.tarikh.toDate(), 'd MMM yyyy')}</span>
        <span className="text-white/60 text-xs">{event.pax} pax</span>
      </div>

      {/* Line items table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        {/* Table header */}
        <div className="grid items-center bg-gray-50 border-b border-gray-100 px-4 py-2.5"
          style={{ gridTemplateColumns: '24px 1fr 72px 96px 28px' }}>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('invoice.description')}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('invoice.qty')}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right pr-2">{t('invoice.unitPrice')}</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {items.map((li, i) => {
            const qty      = parseFloat(li.qty) || 0
            const unit     = parseFloat(li.unit_price) || 0
            const rowTotal = qty * unit
            return (
              <div
                key={li.id}
                className={cn(
                  'grid items-center px-4 py-2.5 gap-1',
                  !li.toggled && 'opacity-40'
                )}
                style={{ gridTemplateColumns: '24px 1fr 72px 96px 28px' }}
              >
                {/* Number / toggle checkbox */}
                <div className="shrink-0">
                  {li.id === 'makanberadab' ? (
                    <button
                      onClick={() => updateItem(li.id, 'toggled', !li.toggled)}
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                        li.toggled
                          ? 'bg-[#1B4332] border-[#1B4332]'
                          : 'border-gray-300 bg-white'
                      )}
                    >
                      {li.toggled && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono tabular-nums">{i + 1}</span>
                  )}
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => updateItem(li.id, 'description', e.target.value)}
                  disabled={li.protected}
                  placeholder={t('invoice.itemPlaceholder')}
                  className="text-sm text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none disabled:bg-transparent disabled:cursor-default w-full"
                />

                {/* Qty */}
                <input
                  type="number"
                  value={li.qty}
                  onChange={(e) => updateItem(li.id, 'qty', e.target.value)}
                  disabled={li.id === 'katering'}
                  className="text-sm text-right text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none w-full disabled:bg-transparent disabled:cursor-default tabular-nums"
                />

                {/* Unit price + row total */}
                <div>
                  <input
                    type="number"
                    value={li.unit_price}
                    onChange={(e) => updateItem(li.id, 'unit_price', e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="text-sm text-right text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none w-full tabular-nums"
                  />
                  {unit > 0 && qty > 0 && (
                    <p className="text-[10px] text-gray-400 text-right mt-0.5 pr-1.5 tabular-nums">
                      = {fmtRM(rowTotal)}
                    </p>
                  )}
                </div>

                {/* Delete */}
                <div className="flex justify-center">
                  {!li.protected && (
                    <button
                      onClick={() => removeItem(li.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add item */}
        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:text-[#163828] transition-colors"
          >
            <Plus size={13} />
            {t('invoice.addItem')}
          </button>
        </div>
      </div>

      {/* Gaji Pekerja */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('invoice.gajiPerkerja')} <span className="text-gray-300 font-normal">(tolakan)</span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">{t('invoice.staffWagesHint')}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-500">RM</span>
            <input
              type="number"
              value={gajiPerkerja}
              onChange={(e) => setGajiPerkerja(e.target.value)}
              step="0.01"
              className="w-28 text-right border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-600 focus:outline-none focus:border-[#1B4332] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-6">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-gray-900 tabular-nums">{fmtRM(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('invoice.gajiPerkerja')}</span>
            <span className="font-semibold text-red-600 tabular-nums">({fmtRM(gajiNum)})</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900 text-base">{t('invoice.totalLabel')}</span>
            <span className="font-black text-xl text-[#1B4332] tabular-nums">{fmtRM(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 justify-end">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          <Save size={14} />
          {t('invoice.saveDraft')}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <FileDown size={14} />
          {saving ? t('invoice.saving') : t('invoice.downloadPdf')}
        </button>
      </div>
    </div>
  )
}
