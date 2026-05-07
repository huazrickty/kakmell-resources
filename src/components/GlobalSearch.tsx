import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { Search, X, CalendarDays, Receipt } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'

interface EventResult {
  id: string
  nama_majlis: string
  hall_name: string
  tarikh: { toDate: () => Date } | null
  sesi: 'siang' | 'malam'
  status: string
}

interface InvoiceResult {
  id: string
  invoice_no: string
  billed_to: string
  total: number
  status: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
}

const STATUS_COLORS: Record<string, string> = {
  upcoming:  'bg-red-50 text-red-600 border-red-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  draft:     'bg-gray-100 text-gray-600 border-gray-200',
  sent:      'bg-amber-50 text-amber-700 border-amber-100',
  paid:      'bg-green-50 text-green-700 border-green-100',
}

function fmtRM(n: number): string {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function GlobalSearch({ isOpen, onClose, isAdmin }: GlobalSearchProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<EventResult[]>([])
  const [invoices, setInvoices] = useState<InvoiceResult[]>([])

  const eventsCache = useRef<EventResult[] | null>(null)
  const invoicesCache = useRef<InvoiceResult[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load data once on first open
  useEffect(() => {
    if (!isOpen) return
    if (eventsCache.current !== null) return // already loaded
    setLoading(true)
    const fetches: Promise<void>[] = [
      getDocs(collection(db, 'events')).then(snap => {
        eventsCache.current = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EventResult, 'id'>) }))
        setEvents(eventsCache.current)
      }),
    ]
    if (isAdmin) {
      fetches.push(
        getDocs(collection(db, 'invoices')).then(snap => {
          invoicesCache.current = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InvoiceResult, 'id'>) }))
          setInvoices(invoicesCache.current)
        })
      )
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false))
  }, [isOpen, isAdmin])

  // Auto-focus and reset query on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearchQuery('')
    }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const q = searchQuery.trim().toLowerCase()

  const filteredEvents = q.length < 2 ? [] : events.filter(e =>
    e.nama_majlis?.toLowerCase().includes(q) ||
    e.hall_name?.toLowerCase().includes(q)
  ).slice(0, 5)

  const filteredInvoices = q.length < 2 || !isAdmin ? [] : invoices.filter(i =>
    i.invoice_no?.toLowerCase().includes(q) ||
    i.billed_to?.toLowerCase().includes(q)
  ).slice(0, 5)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAdmin ? t('search.placeholder') : t('search.placeholderKitchen')}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#1B4332]" />
            </div>
          ) : q.length < 2 ? (
            <div className="px-4 py-10 text-center text-xs text-gray-400">
              {t('search.escToClose')}
            </div>
          ) : filteredEvents.length === 0 && filteredInvoices.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {t('search.noResults')}
            </div>
          ) : (
            <div className="py-2">
              {/* Events group */}
              {filteredEvents.length > 0 && (
                <div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('nav.events')}</span>
                    <span className="text-[10px] text-gray-300">({filteredEvents.length})</span>
                  </div>
                  {filteredEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => { navigate(`/events/${event.id}`); onClose() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <CalendarDays size={15} className="text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.nama_majlis}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {event.hall_name}
                          {event.tarikh?.toDate && ` · ${format(event.tarikh.toDate(), 'd MMM yyyy')}`}
                          {event.sesi && ` · ${event.sesi}`}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {event.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Invoices group — admin only */}
              {isAdmin && filteredInvoices.length > 0 && (
                <div className={filteredEvents.length > 0 ? 'border-t border-gray-50 mt-1' : ''}>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('nav.invoices')}</span>
                    <span className="text-[10px] text-gray-300">({filteredInvoices.length})</span>
                  </div>
                  {filteredInvoices.map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => { navigate(`/invoices/${inv.id}`); onClose() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Receipt size={15} className="text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{inv.invoice_no}</p>
                        <p className="text-xs text-gray-500 truncate">{inv.billed_to} · {fmtRM(inv.total)}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {inv.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
