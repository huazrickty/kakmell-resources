import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfWeek, endOfWeek, isWithinInterval, addWeeks, format } from 'date-fns'
import { ChevronLeft, ChevronRight, FileDown, Plus, Receipt, ListChecks, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import { useMyTasksToday } from '@/hooks/useMyPendingTasksToday'
import { Button, Card, SectionHeader, ListRow, ProgressBar } from '@/components/ui-kit'
import EventSummaryCard from '@/components/EventSummaryCard'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import { generateWeeklyPDF, fmtWeekRange, type WeeklyEventEntry } from '@/lib/weekly-export-pdf'
import { getLogoBase64 } from '@/lib/pdf-common'
import { db } from '@/lib/firebase'
import { Sheet, SheetContent } from '@/components/ui/sheet'

function SkeletonCard() {
  return <div className="h-[76px] bg-ink/5 rounded-xl animate-pulse" />
}

// Plain stat: big tabular number, xs label below. No colored cards, no icons.
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold leading-none text-ink tabular-nums">{value}</span>
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  )
}

interface MonthData {
  month: string
  revenue: number
  events: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const navigate = useNavigate()
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const { events, loading } = useEvents()
  const myTasks = useMyTasksToday()
  const isAdmin = userDoc?.role === 'admin'

  const now       = new Date()
  const currentYear = now.getFullYear()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(now, { weekStartsOn: 1 })

  const upcoming  = events.filter((e) => e.status === 'upcoming')
  const completed = events.filter((e) => e.status === 'completed')
  const thisWeek  = events.filter((e) =>
    isWithinInterval(e.tarikh.toDate(), { start: weekStart, end: weekEnd })
  )

  // Today-first: today's upcoming events, else the next one coming up
  const todayStr    = format(now, 'yyyy-MM-dd')
  const todayEvents = upcoming.filter((e) => format(e.tarikh.toDate(), 'yyyy-MM-dd') === todayStr)
  const todayStrip  = todayEvents.length > 0 ? todayEvents : upcoming.slice(0, 1)

  // ── Weekly export state ────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset]     = useState(0)
  const [exporting, setExporting]       = useState<'all' | 'upcoming' | 'selected' | null>(null)
  const [selectOpen, setSelectOpen]     = useState(false)
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())

  // ── Revenue analytics state ────────────────────────────────────────────────
  const [analyticsLoading, setAnalyticsLoading]       = useState(true)
  const [analyticsYear, setAnalyticsYear]             = useState(new Date().getFullYear())
  const [paidInvoices, setPaidInvoices]               = useState<{ total: number; invoice_date: any }[]>([])
  const [allEventsForChart, setAllEventsForChart]     = useState<{ tarikh: any }[]>([])

  useEffect(() => {
    if (!isAdmin) return
    Promise.all([
      getDocs(query(collection(db, 'invoices'), where('status', '==', 'paid'))),
      getDocs(collection(db, 'events')),
    ]).then(([invSnap, evSnap]) => {
      setPaidInvoices(invSnap.docs.map(d => ({ total: d.data().total ?? 0, invoice_date: d.data().invoice_date })))
      setAllEventsForChart(evSnap.docs.map(d => ({ tarikh: d.data().tarikh })))
    }).catch(() => {}).finally(() => setAnalyticsLoading(false))
  }, [isAdmin])

  const monthData: MonthData[] = useMemo(() => {
    return MONTHS.map((month, i) => {
      const revenue = paidInvoices
        .filter(inv => {
          const d: Date | null = inv.invoice_date?.toDate?.() ?? null
          return d && d.getFullYear() === analyticsYear && d.getMonth() === i
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0)

      const eventsCount = allEventsForChart.filter(ev => {
        const d: Date | null = ev.tarikh?.toDate?.() ?? null
        return d && d.getFullYear() === analyticsYear && d.getMonth() === i
      }).length

      return { month, revenue, events: eventsCount }
    })
  }, [paidInvoices, allEventsForChart, analyticsYear])

  const annualRevenue = useMemo(() => monthData.reduce((s, m) => s + m.revenue, 0), [monthData])

  const refWeek       = addWeeks(now, weekOffset)
  const exportStart   = startOfWeek(refWeek, { weekStartsOn: 1 })
  const exportEnd     = endOfWeek(refWeek, { weekStartsOn: 1 })
  const exportEvents  = events.filter((e) =>
    isWithinInterval(e.tarikh.toDate(), { start: exportStart, end: exportEnd })
  )

  async function handleExport(mode: 'all' | 'upcoming' | 'selected', selectedSource?: typeof exportEvents) {
    const source = mode === 'upcoming'
      ? exportEvents.filter(e => e.status === 'upcoming')
      : mode === 'selected'
        ? (selectedSource ?? [])
        : exportEvents

    if (mode === 'upcoming' && source.length === 0) {
      toast(t('dashboard.noUpcomingThisWeek'))
      return
    }

    setExporting(mode)
    if (mode === 'selected') setSelectOpen(false)
    try {
      const data: WeeklyEventEntry[] = source.map((e) => ({
        event: {
          nama_majlis:    e.nama_majlis,
          hall_name:      e.hall_name,
          tarikh:         e.tarikh,
          sesi:           e.sesi,
          pax:            e.pax,
          menu_selection: e.menu_selection as unknown as Record<string, string>,
          menu_type:      e.menu_type,
          selected_items: e.selected_items,
          remarks:        e.remarks,
          menu_tambahan:  e.menu_tambahan,
        },
        // Non-kahwin events have no ingredient calculation
        ingredients: (e.menu_type ?? 'kahwin') === 'kahwin'
          ? calculateIngredients(e.pax, e.menu_selection?.acar)
          : null,
      }))
      const logoBase64 = await getLogoBase64()
      const title = mode === 'upcoming'
        ? 'LAPORAN MINGGUAN — AKAN DATANG'
        : mode === 'selected'
          ? 'LAPORAN MINGGUAN — ACARA DIPILIH'
          : 'LAPORAN MINGGUAN — SEMUA ACARA'
      await generateWeeklyPDF(exportStart, exportEnd, data, logoBase64, title, mode)
      toast.success(t('dashboard.pdfGenerated'))
    } catch {
      toast.error(t('dashboard.pdfError'))
    } finally {
      setExporting(null)
      setSelectedIds(new Set())
    }
  }

  function openSelectModal() {
    setSelectedIds(new Set(exportEvents.map(e => e.id)))
    setSelectOpen(true)
  }

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === exportEvents.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(exportEvents.map(e => e.id)))
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t('dashboard.title')}</h1>

      {/* ── Today strip ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader>{t('dashboard.today')}</SectionHeader>

        {/* My tasks summary — hidden when nothing is assigned */}
        {myTasks.total > 0 && (
          <Card
            className="cursor-pointer hover:border-ink/20 transition-colors"
            onClick={() => navigate('/tasks')}
          >
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ListChecks size={16} className="text-ink-soft" />
                {t('nav.tasks')}
              </span>
              <span className="text-sm text-ink-soft tabular-nums">
                {myTasks.done}/{myTasks.total} {t('dashboard.tasksDoneToday')}
              </span>
            </div>
            <ProgressBar value={myTasks.total > 0 ? myTasks.done / myTasks.total : 0} />
          </Card>
        )}

        {/* Kitchen: checklist entry */}
        {!isAdmin && (
          <Card flush>
            <ListRow
              leading={<CheckSquare size={18} />}
              label={t('dashboard.openChecklist')}
              onClick={() => navigate('/checklist')}
            />
          </Card>
        )}

        {/* Today's / next event card(s) — horizontal snap when several */}
        {loading ? (
          <SkeletonCard />
        ) : todayStrip.length > 1 ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1">
            {todayStrip.map((event) => (
              <div key={event.id} className="snap-start shrink-0 w-[85%] sm:w-[420px]">
                <EventSummaryCard event={event} onClick={() => navigate(`/events/${event.id}`)} />
              </div>
            ))}
          </div>
        ) : (
          todayStrip.map((event) => (
            <EventSummaryCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
          ))
        )}
      </section>

      {/* ── Quick actions — admin ──────────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <SectionHeader>{t('dashboard.quickActions')}</SectionHeader>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="flex-1" onClick={() => navigate('/events/new')}>
              <Plus size={16} />
              {t('events.new')}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/invoices/custom/new')}>
              <Receipt size={16} />
              {t('dashboard.newInvoice')}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => document.getElementById('weekly-export')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <FileDown size={16} />
              {t('dashboard.weeklyExport')}
            </Button>
          </div>
        </section>
      )}

      {/* ── Stats — admin only ─────────────────────────────────────────────── */}
      {isAdmin && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Stat label={t('dashboard.totalEvents')}     value={events.length} />
            <Stat label={t('dashboard.upcomingEvents')}  value={upcoming.length} />
            <Stat label={t('dashboard.completedEvents')} value={completed.length} />
            <Stat label={t('dashboard.thisWeek')}        value={thisWeek.length} />
          </div>
        </Card>
      )}

      {/* ── Upcoming events — admin only (kitchen home stays minimal) ─────── */}
      {isAdmin && (
        <section className="space-y-3">
          <SectionHeader>{t('dashboard.upcomingEvents')}</SectionHeader>
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : upcoming.length === 0 ? (
            <Card flush>
              <div className="px-6 py-8 text-center text-sm text-ink-soft">{t('dashboard.noEvents')}</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((event) => (
                <EventSummaryCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Weekly Export — admin only ─────────────────────────────────────── */}
      {isAdmin && (
        <section id="weekly-export" className="space-y-3">
          <SectionHeader>{t('dashboard.weeklyExport')}</SectionHeader>

          <Card flush>
            {/* Week selector strip */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-2 text-center min-w-[160px]">
                  <p className="text-sm font-bold text-ink leading-none tabular-nums">
                    {fmtWeekRange(exportStart, exportEnd)}
                  </p>
                  {weekOffset === 0 && (
                    <p className="text-xs text-ink-soft mt-1 uppercase tracking-wide">
                      {t('dashboard.currentWeek')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setWeekOffset((o) => o + 1)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <span className="text-xs font-semibold text-ink-soft tabular-nums">
                {loading ? '…' : `${exportEvents.length} ${t('dashboard.eventsCount')}`}
              </span>
            </div>

            <div className="px-4 py-4 space-y-3">
              {exportEvents.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {exportEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="text-xs text-ink-soft bg-ink/5 rounded px-2 py-0.5 truncate max-w-[180px]">
                      {e.nama_majlis}
                    </span>
                  ))}
                  {exportEvents.length > 3 && (
                    <span className="text-xs text-ink-soft bg-ink/5 rounded px-2 py-0.5">
                      +{exportEvents.length - 3} {t('common.more')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink-soft italic">{t('dashboard.noEventsThisWeek')}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" className="flex-1" disabled={exporting !== null} onClick={() => handleExport('all')}>
                  <FileDown size={14} />
                  {exporting === 'all' ? t('common.generating') : t('dashboard.exportAll')}
                </Button>
                <Button variant="secondary" className="flex-1" disabled={exporting !== null} onClick={() => handleExport('upcoming')}>
                  <FileDown size={14} />
                  {exporting === 'upcoming' ? t('common.generating') : t('dashboard.exportUpcoming')}
                </Button>
                <Button variant="secondary" className="flex-1" disabled={exporting !== null} onClick={openSelectModal}>
                  <FileDown size={14} />
                  {exporting === 'selected' ? t('common.generating') : t('dashboard.exportSelect')}
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* ── Select Events Sheet ───────────────────────────────────────────── */}
      <Sheet open={selectOpen} onOpenChange={setSelectOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex flex-col h-[85dvh] gap-0 p-0"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line shrink-0">
            <div>
              <h2 className="text-base font-bold text-ink">{t('dashboard.selectEventsTitle')}</h2>
              <p className="text-xs text-ink-soft mt-0.5">
                {selectedIds.size} {t('dashboard.eventsSelected')}
              </p>
            </div>
            <button
              onClick={toggleAll}
              className="text-xs font-semibold text-ink underline underline-offset-2"
            >
              {selectedIds.size === exportEvents.length
                ? t('dashboard.deselectAll')
                : t('dashboard.selectAll')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {exportEvents.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-soft">
                {t('dashboard.noEventsToSelect')}
              </p>
            ) : exportEvents.map((e) => {
              const checked = selectedIds.has(e.id)
              const dateStr = e.tarikh?.toDate
                ? e.tarikh.toDate().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''
              return (
                <button
                  key={e.id}
                  onClick={() => toggleId(e.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 min-h-12 text-left transition-colors ${checked ? 'bg-ink/[0.04]' : 'hover:bg-ink/[0.02]'}`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-ink border-ink' : 'border-line'}`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{e.nama_majlis}</p>
                    <p className="text-xs text-ink-soft truncate">{e.hall_name} · {dateStr}</p>
                  </div>
                  <span className="text-xs text-ink-soft shrink-0">
                    {e.sesi === 'siang' ? 'Siang' : 'Malam'}
                  </span>
                  <span className="text-xs text-ink-soft shrink-0 tabular-nums">{e.pax} pax</span>
                </button>
              )
            })}
          </div>

          <div
            className="shrink-0 flex gap-3 px-5 pt-4 border-t border-line bg-surface"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <Button variant="ghost" className="flex-1" onClick={() => setSelectOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1"
              disabled={selectedIds.size === 0 || exporting !== null}
              onClick={() => {
                const selected = exportEvents.filter(e => selectedIds.has(e.id))
                handleExport('selected', selected)
              }}
            >
              <FileDown size={14} />
              {exporting === 'selected' ? t('common.generating') : t('dashboard.exportSelected')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Revenue — admin only, last ────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <SectionHeader
            action={
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAnalyticsYear(y => y - 1)}>
                  <ChevronLeft size={15} />
                </Button>
                <span className="text-sm font-bold text-ink tabular-nums w-12 text-center">{analyticsYear}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={analyticsYear >= currentYear}
                  onClick={() => setAnalyticsYear(y => y + 1)}
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            }
          >
            {t('dashboard.revenue')}
          </SectionHeader>

          <Card>
            <div className="mb-4">
              <p className="text-xs text-ink-soft uppercase tracking-wide mb-1">
                {t('dashboard.annualRevenue')}
              </p>
              <p className="text-xl font-bold text-ink tabular-nums">
                RM {annualRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {analyticsLoading ? (
              <div className="h-[280px] bg-ink/5 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E2" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#55524E' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#55524E' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `RM${(v / 1000).toFixed(0)}k`}
                    width={52}
                  />
                  <YAxis
                    yAxisId="events"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#55524E' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E8E6E2', fontSize: 12 }}
                    formatter={(value, name) => {
                      const num = Number(value ?? 0)
                      if (name === 'Revenue') {
                        return [`RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, 'Revenue'] as [string, string]
                      }
                      return [value, 'Events'] as [typeof value, string]
                    }}
                  />
                  {/* Ink bars; red highlights the current month only */}
                  <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {monthData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={analyticsYear === currentYear && i === now.getMonth() ? '#C4202A' : '#111111'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="events"
                    dataKey="events"
                    name="Events"
                    stroke="#55524E"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#55524E' }}
                    activeDot={{ r: 5 }}
                    type="monotone"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>
      )}
    </div>
  )
}
