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
  upcoming:  'bg-danger/5 text-danger border-danger/20',
  completed: 'bg-ok/10 text-ok border-ok/20',
  cancelled: 'bg-ink/5 text-ink-soft border-line',
  draft:     'bg-ink/5 text-ink-soft border-line',
  sent:      'bg-warn/10 text-warn border-warn/20',
  paid:      'bg-ok/10 text-ok border-ok/20',
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
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <Search size={18} className="text-ink-soft shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAdmin ? t('search.placeholder') : t('search.placeholderKitchen')}
            className="flex-1 text-sm text-ink placeholder-ink-soft/50 bg-transparent outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-ink-soft hover:text-ink">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[10px] font-medium text-ink-soft bg-ink/5 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
            </div>
          ) : q.length < 2 ? (
            <div className="px-4 py-10 text-center text-xs text-ink-soft">
              {t('search.escToClose')}
            </div>
          ) : filteredEvents.length === 0 && filteredInvoices.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-soft">
              {t('search.noResults')}
            </div>
          ) : (
            <div className="py-2">
              {/* Events group */}
              {filteredEvents.length > 0 && (
                <div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">{t('nav.events')}</span>
                    <span className="text-[10px] text-ink-soft/50">({filteredEvents.length})</span>
                  </div>
                  {filteredEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => { navigate(`/events/${event.id}`); onClose() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink/[0.03] transition-colors text-left"
                    >
                      <CalendarDays size={15} className="text-ink-soft shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{event.nama_majlis}</p>
                        <p className="text-xs text-ink-soft truncate">
                          {event.hall_name}
                          {event.tarikh?.toDate && ` · ${format(event.tarikh.toDate(), 'd MMM yyyy')}`}
                          {event.sesi && ` · ${event.sesi}`}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[event.status] ?? 'bg-ink/5 text-ink-soft'}`}>
                        {event.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Invoices group — admin only */}
              {isAdmin && filteredInvoices.length > 0 && (
                <div className={filteredEvents.length > 0 ? 'border-t border-line mt-1' : ''}>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">{t('nav.invoices')}</span>
                    <span className="text-[10px] text-ink-soft/50">({filteredInvoices.length})</span>
                  </div>
                  {filteredInvoices.map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => { navigate(`/invoices/${inv.id}`); onClose() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink/[0.03] transition-colors text-left"
                    >
                      <Receipt size={15} className="text-ink-soft shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{inv.invoice_no}</p>
                        <p className="text-xs text-ink-soft truncate">{inv.billed_to} · {fmtRM(inv.total)}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status] ?? 'bg-ink/5 text-ink-soft'}`}>
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
