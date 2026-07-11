import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, orderBy, where, limit, getDocs, startAfter,
  Timestamp, type QueryConstraint, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore'
import { ArrowLeft, CalendarDays, Receipt, Users, Package, ListChecks, UtensilsCrossed, Settings as SettingsIcon } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type DateRange = 'today' | '7d' | '30d' | 'all'
type Category  = 'all' | 'event' | 'invoice' | 'user' | 'ingredient' | 'task' | 'menu' | 'settings'

interface ActivityEntry {
  id: string
  action: string
  category: string
  description: string
  entity_id?: string
  entity_name?: string
  performed_by: string
  performed_by_name: string
  timestamp: Timestamp | null
}

const BATCH = 50

const BULAN_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const BULAN_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtFull(date: Date, lang: Lang): string {
  const months = lang === 'ms' ? BULAN_MS : BULAN_EN
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

function relTime(date: Date, lang: Lang, labels: { justNow: string; minutesAgo: string; hoursAgo: string; yesterday: string; daysAgo: string }): string {
  const diffMs   = Date.now() - date.getTime()
  const diffMin  = Math.floor(diffMs / 60_000)
  const diffHrs  = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffMin  <  1) return labels.justNow
  if (diffMin  < 60) return `${diffMin} ${labels.minutesAgo}`
  if (diffHrs  < 24) return `${diffHrs} ${labels.hoursAgo}`
  if (diffDays === 1) return labels.yesterday
  if (diffDays <=  7) return `${diffDays} ${labels.daysAgo}`
  return fmtFull(date, lang)
}

function getStartDate(range: DateRange): Date | null {
  if (range === 'today') {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }
  if (range === '7d')  return new Date(Date.now() -  7 * 86_400_000)
  if (range === '30d') return new Date(Date.now() - 30 * 86_400_000)
  return null
}

const CAT_ICON: Record<string, React.ReactElement> = {
  event:      <CalendarDays size={15} />,
  invoice:    <Receipt size={15} />,
  user:       <Users size={15} />,
  ingredient: <Package size={15} />,
  task:       <ListChecks size={15} />,
  menu:       <UtensilsCrossed size={15} />,
  settings:   <SettingsIcon size={15} />,
}

const CAT_COLOR: Record<string, string> = {
  event:      'bg-green-50 text-green-600',
  invoice:    'bg-amber-50 text-amber-600',
  user:       'bg-purple-50 text-purple-600',
  ingredient: 'bg-orange-50 text-orange-600',
  task:       'bg-teal-50 text-teal-600',
  menu:       'bg-rose-50 text-rose-600',
  settings:   'bg-gray-100 text-gray-500',
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}


export default function ActivityLog() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()

  const dateLabels: Record<DateRange, string> = {
    today: t('activityLog.today'), '7d': t('activityLog.days7'),
    '30d': t('activityLog.days30'), all: t('activityLog.allTime'),
  }
  const catLabels: Record<Category, string> = {
    all: t('activityLog.filterAll'), event: t('activityLog.filterEvents'),
    invoice: t('activityLog.filterInvoices'), user: t('activityLog.filterUsers'),
    ingredient: t('activityLog.filterIngredients'), task: t('activityLog.filterTasks'),
    menu: t('activityLog.filterMenu'), settings: t('activityLog.filterAll'),
  }
  const relTimeLabels = {
    justNow:    t('activityLog.justNow'),
    minutesAgo: t('activityLog.minutesAgo'),
    hoursAgo:   t('activityLog.hoursAgo'),
    yesterday:  t('activityLog.yesterday'),
    daysAgo:    t('activityLog.daysAgo'),
  }

  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [category,  setCategory]  = useState<Category>('all')
  const [entries,   setEntries]   = useState<ActivityEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [hasMore,   setHasMore]   = useState(false)
  const [lastDoc,   setLastDoc]   = useState<QueryDocumentSnapshot<DocumentData> | null>(null)

  const fetchEntries = useCallback(async (
    range: DateRange,
    append: boolean,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
  ) => {
    setLoading(true)
    try {
      const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')]
      const start = getStartDate(range)
      if (start) constraints.push(where('timestamp', '>=', Timestamp.fromDate(start)))
      if (cursor) constraints.push(startAfter(cursor))
      constraints.push(limit(BATCH + 1))

      const snap = await getDocs(query(collection(db, 'activity_log'), ...constraints))
      const more = snap.docs.length > BATCH
      const docs = more ? snap.docs.slice(0, BATCH) : snap.docs
      const items = docs.map(d => ({ id: d.id, ...(d.data() as Omit<ActivityEntry, 'id'>) }))

      setEntries(prev => append ? [...prev, ...items] : items)
      setLastDoc(docs.length > 0 ? docs[docs.length - 1] : null)
      setHasMore(more)
    } catch (err) {
      console.error('ActivityLog fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setEntries([])
    setLastDoc(null)
    fetchEntries(dateRange, false, null)
  }, [dateRange, fetchEntries])

  function loadMore() {
    fetchEntries(dateRange, true, lastDoc)
  }

  const visible = category === 'all'
    ? entries
    : entries.filter(e => e.category === category)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/settings')}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('activityLog.title')}</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2.5 mb-5">
        <div className="flex gap-2 flex-wrap">
          {(['today', '7d', '30d', 'all'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                dateRange === r
                  ? 'bg-[#1B4332] text-white border-[#1B4332]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
            >
              {dateLabels[r]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'event', 'invoice', 'user', 'ingredient', 'task', 'menu'] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                category === c
                  ? 'bg-[#1B4332] text-white border-[#1B4332]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
            >
              {catLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && entries.length === 0 ? (
          <SkeletonRows />
        ) : visible.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">{t('activityLog.noActivity')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map(entry => {
              const ts = entry.timestamp?.toDate?.() ?? null
              return (
                <div key={entry.id} className="flex gap-3 px-4 py-3.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    CAT_COLOR[entry.category] ?? 'bg-gray-100 text-gray-400'
                  )}>
                    {CAT_ICON[entry.category] ?? <SettingsIcon size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-snug">{entry.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                      <span className="font-medium">{entry.performed_by_name}</span>
                      {ts && (
                        <>
                          <span>·</span>
                          <span title={fmtFull(ts, lang)}>{relTime(ts, lang, relTimeLabels)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div className="px-4 py-3 border-t border-gray-50 text-center">
            <button
              onClick={loadMore}
              className="text-sm font-semibold text-[#1B4332] hover:underline"
            >
              {t('activityLog.loadMore')}
            </button>
          </div>
        )}

        {loading && entries.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400">{t('activityLog.loading')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
