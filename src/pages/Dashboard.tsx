import { useState, useMemo, useEffect } from 'react'
import { startOfWeek, endOfWeek, isWithinInterval, addWeeks } from 'date-fns'
import { CalendarDays, Clock, CheckCircle2, CalendarCheck, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import EventSummaryCard from '@/components/EventSummaryCard'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import { generateWeeklyPDF, fmtWeekRange, type WeeklyEventEntry } from '@/lib/weekly-export-pdf'
import { getLogoBase64 } from '@/lib/invoice-pdf'
import { db } from '@/lib/firebase'

function SkeletonCard() {
  return (
    <div className="flex bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-16 shrink-0 bg-gray-100 py-14" />
      <div className="w-px bg-gray-100" />
      <div className="flex-1 px-4 py-3 flex flex-col gap-2 justify-center">
        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-16 mt-0.5" />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  accent?: 'red' | 'green' | 'amber' | 'neutral'
}

function StatCard({ label, value, icon: Icon, accent = 'neutral' }: StatCardProps) {
  const numClass = {
    red:     'text-red-600',
    green:   'text-green-600',
    amber:   'text-amber-500',
    neutral: 'text-gray-900',
  }[accent]

  const iconClass = {
    red:     'text-red-200',
    green:   'text-green-200',
    amber:   'text-amber-200',
    neutral: 'text-gray-200',
  }[accent]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={18} strokeWidth={1.6} className={iconClass} />
      </div>
      <span className={`text-3xl font-bold leading-none ${numClass}`}>{value}</span>
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
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const { events, loading } = useEvents()
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

  // ── Weekly export state ────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const [exporting, setExporting]   = useState<'all' | 'upcoming' | null>(null)

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

  async function handleExport(mode: 'all' | 'upcoming') {
    const source = mode === 'upcoming'
      ? exportEvents.filter(e => e.status === 'upcoming')
      : exportEvents

    if (mode === 'upcoming' && source.length === 0) {
      toast(t('dashboard.noUpcomingThisWeek'))
      return
    }

    setExporting(mode)
    try {
      const data: WeeklyEventEntry[] = source.map((e) => ({
        event: {
          nama_majlis:    e.nama_majlis,
          hall_name:      e.hall_name,
          tarikh:         e.tarikh,
          sesi:           e.sesi,
          pax:            e.pax,
          menu_selection: e.menu_selection as unknown as Record<string, string>,
        },
        ingredients: calculateIngredients(e.pax, e.menu_selection.acar),
      }))
      const logoBase64 = await getLogoBase64()
      const title = mode === 'upcoming'
        ? 'LAPORAN MINGGUAN — AKAN DATANG'
        : 'LAPORAN MINGGUAN — SEMUA ACARA'
      await generateWeeklyPDF(exportStart, exportEnd, data, logoBase64, title)
      toast.success(t('dashboard.pdfGenerated'))
    } catch {
      toast.error(t('dashboard.pdfError'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* ── Stat cards — admin only ────────────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('dashboard.totalEvents')}     value={events.length}    icon={CalendarDays}  accent="neutral" />
          <StatCard label={t('dashboard.upcomingEvents')}  value={upcoming.length}  icon={Clock}         accent="red"     />
          <StatCard label={t('dashboard.completedEvents')} value={completed.length} icon={CheckCircle2}  accent="green"   />
          <StatCard label={t('dashboard.thisWeek')}        value={thisWeek.length}  icon={CalendarCheck} accent="amber"   />
        </div>
      )}

      {/* ── Upcoming Events ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {t('dashboard.upcomingEvents')}
        </h2>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center">
            <p className="text-sm text-gray-400">{t('dashboard.noEvents')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventSummaryCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* ── Completed Events — admin only, last 5 most recent ─────────────── */}
      {isAdmin && !loading && completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t('dashboard.completedEvents')}
          </h2>
          <div className="space-y-3">
            {completed.slice(-5).reverse().map((event) => (
              <EventSummaryCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* ── Weekly Export — admin only ─────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t('dashboard.weeklyExport')}
          </h2>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Dark header strip */}
            <div className="bg-[#1B4332] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Prev week */}
                <button
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Week label */}
                <div className="px-3 text-center min-w-[180px]">
                  <p className="text-sm font-semibold text-white leading-none">
                    {fmtWeekRange(exportStart, exportEnd)}
                  </p>
                  {weekOffset === 0 && (
                    <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-widest">
                      {t('dashboard.currentWeek')}
                    </p>
                  )}
                </div>

                {/* Next week */}
                <button
                  onClick={() => setWeekOffset((o) => o + 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Event count badge */}
              <span className="text-xs font-semibold text-white/70">
                {loading ? '…' : `${exportEvents.length} ${t('dashboard.eventsCount')}`}
              </span>
            </div>

            {/* Export action */}
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              {/* Preview list of event names */}
              {exportEvents.length > 0 ? (
                <div className="flex-1 min-w-0 space-y-0.5">
                  {exportEvents.slice(0, 3).map((e) => (
                    <p key={e.id} className="text-xs text-gray-500 truncate">
                      · {e.nama_majlis}
                    </p>
                  ))}
                  {exportEvents.length > 3 && (
                    <p className="text-xs text-gray-400">+{exportEvents.length - 3} {t('common.more')}</p>
                  )}
                </div>
              ) : (
                <p className="flex-1 text-xs text-gray-400 italic">
                  {t('dashboard.noEventsThisWeek')}
                </p>
              )}

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleExport('all')}
                  disabled={exporting !== null}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FileDown size={13} />
                  {exporting === 'all' ? t('common.generating') : t('dashboard.exportAll')}
                </button>
                <button
                  onClick={() => handleExport('upcoming')}
                  disabled={exporting !== null}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FileDown size={13} />
                  {exporting === 'upcoming' ? t('common.generating') : t('dashboard.exportUpcoming')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Revenue Analytics — admin only ────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t('dashboard.revenueAnalytics')}
          </h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              {/* Year selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnalyticsYear(y => y - 1)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-gray-900 w-12 text-center">{analyticsYear}</span>
                <button
                  onClick={() => setAnalyticsYear(y => y + 1)}
                  disabled={analyticsYear >= currentYear}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Annual revenue */}
              <div className="text-right">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                  {t('dashboard.annualRevenue')}
                </p>
                <p className="text-xl font-black text-[#1B4332]">
                  RM {annualRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Chart or skeleton */}
            {analyticsLoading ? (
              <div className="h-[280px] bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `RM${(v / 1000).toFixed(0)}k`}
                    width={52}
                  />
                  <YAxis
                    yAxisId="events"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(value, name) => {
                      const num = Number(value ?? 0)
                      if (name === 'Revenue') {
                        return [`RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, 'Revenue'] as [string, string]
                      }
                      return [value, 'Events'] as [typeof value, string]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#C4202A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="events"
                    dataKey="events"
                    name="Events"
                    stroke="#1B4332"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#1B4332' }}
                    activeDot={{ r: 5 }}
                    type="monotone"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
