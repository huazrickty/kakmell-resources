import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { Sun, Moon, MapPin, Users, ChevronDown, Check, CheckSquare } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents, type EventDoc, type MenuSelection } from '@/hooks/useEvents'
import { getHotDrinks, getColdDrinks } from '@/lib/menu-types'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import { ProgressBar, Card, EmptyState } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const TODAY = format(new Date(), 'yyyy-MM-dd')

function getLaukItems(menu: MenuSelection): string[] {
  const items: string[] = []
  if (menu.nasi)      items.push(menu.nasi)
  if (menu.ayam)      items.push(menu.ayam)
  if (menu.daging)    items.push(menu.daging)
  items.push('Dalca')
  if (menu.acar)      items.push(menu.acar)
  if (menu.bubur)     items.push(menu.bubur)
  items.push('Oren')
  // New events store hot/cold arrays; old events fall back to air_panas string
  items.push(...getHotDrinks(menu))
  const cold = getColdDrinks(menu)
  if (cold.length > 0) {
    items.push(...cold)
  } else {
    items.push('Air Anggur') // legacy auto-include for pre-split events
  }
  return items
}

// ── EventChecklist ─────────────────────────────────────────────────────────

interface EventChecklistProps {
  event: EventDoc
  uid: string
}

function EventChecklist({ event, uid }: EventChecklistProps) {
  const { t } = useLanguage()
  const [checked, setChecked] = useState<string[]>([])
  const [showIngr, setShowIngr] = useState(false)

  const laukItems = getLaukItems(event.menu_selection)
  const ingr = calculateIngredients(event.pax)
  const checkRef = doc(db, 'checklist', event.id, 'staff', uid)

  useEffect(() => {
    const unsub = onSnapshot(checkRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setChecked(data.date === TODAY ? (data.checked ?? []) : [])
      } else {
        setChecked([])
      }
    })
    return unsub
  }, [event.id, uid])

  async function toggle(item: string) {
    const next = checked.includes(item)
      ? checked.filter((c) => c !== item)
      : [...checked, item]
    setChecked(next)
    await setDoc(checkRef, { date: TODAY, checked: next, updated_at: serverTimestamp() })
  }

  const done  = checked.length
  const total = laukItems.length

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-line">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm leading-snug">{event.nama_majlis}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-soft mt-0.5">
              {event.hall_name && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} strokeWidth={1.8} />
                  {event.hall_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                {event.sesi === 'siang'
                  ? <Sun  size={10} strokeWidth={1.8} className="text-warn" />
                  : <Moon size={10} strokeWidth={1.8} className="text-ink-soft" />}
                {event.sesi === 'siang' ? 'Siang' : 'Malam'}
              </span>
              <span className="flex items-center gap-1">
                <Users size={10} strokeWidth={1.8} />
                {event.pax} pax
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-ink-soft tabular-nums">
            {done}/{total} {t('checklist.done')}
          </span>
        </div>

        {/* Progress — N of M + ok-green fill, same pattern as Home tasks card */}
        <ProgressBar value={total > 0 ? done / total : 0} />
      </div>

      {/* ── Lauk checklist rows ─────────────────────────────────────────── */}
      <div className="divide-y divide-line">
        {laukItems.map((item) => {
          const isDone = checked.includes(item)
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              className="flex w-full items-center gap-3 px-4 py-3 min-h-12 text-left hover:bg-ink/[0.02] active:bg-ink/[0.04] transition-colors select-none"
            >
              <span className={cn(
                'flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 transition-colors',
                isDone ? 'bg-ink border-ink' : 'border-line',
              )}>
                {isDone && <Check size={13} strokeWidth={3} className="text-white" />}
              </span>
              <span className={cn(
                'text-sm font-medium transition-colors',
                isDone ? 'text-ink-soft line-through' : 'text-ink',
              )}>
                {item}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Ingredient toggle ────────────────────────────────────────────── */}
      {ingr && (
        <div className="border-t border-line">
          <button
            onClick={() => setShowIngr((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 min-h-11 text-xs font-semibold text-ink-soft hover:bg-ink/[0.02] transition-colors"
          >
            <span>{showIngr ? t('checklist.hideIngredients') : t('checklist.showIngredients')}</span>
            <ChevronDown
              size={13}
              className={cn('text-ink-soft/50 transition-transform duration-200', showIngr && 'rotate-180')}
            />
          </button>

          {showIngr && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line">
              {/* Left: Bahan Utama */}
              <div>
                <p className="text-[10px] font-bold text-ink uppercase tracking-widest mb-1.5">
                  {t('ingredients.mainItems')}
                </p>
                <div className="space-y-1">
                  {([
                    ['Beras',  `${ingr.main.beras_bag} bag`],
                    ['Ayam',   `${ingr.main.ayam_ekor} ekor`],
                    ['Daging', `${ingr.main.daging_kg} kg`],
                    ['Oren',   `${ingr.main.oren_biji} biji`],
                    ['Gula',   `${ingr.main.gula_liter} L`],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-ink-soft">{k}</span>
                      <span className="font-semibold text-ink tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Dalca */}
              <div>
                <p className="text-[10px] font-bold text-ink uppercase tracking-widest mb-1.5">
                  {t('ingredients.dalca')}
                </p>
                <div className="space-y-1">
                  {([
                    ['Kacang Dall', ingr.dalca.kacang_dall],
                    ['Terung',      ingr.dalca.terung],
                    ['Kentang',     ingr.dalca.kentang],
                    ['Karot',       ingr.dalca.karot],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-ink-soft">{k}</span>
                      <span className="font-semibold text-ink tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Checklist() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { events, loading } = useEvents()

  const now       = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(now, { weekStartsOn: 1 })

  const todayEvents = events.filter(
    (e) => e.status === 'upcoming' && format(e.tarikh.toDate(), 'yyyy-MM-dd') === TODAY
  )

  const weekEvents = events.filter(
    (e) => e.status === 'upcoming' &&
      isWithinInterval(e.tarikh.toDate(), { start: weekStart, end: weekEnd })
  )

  const displayEvents = todayEvents.length > 0 ? todayEvents : weekEvents
  const isToday       = todayEvents.length > 0

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">{t('checklist.title')}</h1>
        <span className="text-xs font-semibold text-ink-soft bg-ink/5 px-2.5 py-1 rounded-full">
          {isToday ? t('checklist.todayEvents') : t('checklist.weekEvents')}
        </span>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface rounded-xl border border-line shadow-sm h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && displayEvents.length === 0 && (
        <Card flush>
          <EmptyState icon={CheckSquare} message={t('checklist.noEventsToday')} />
        </Card>
      )}

      {!loading && displayEvents.length > 0 && (
        <div className="space-y-4">
          {displayEvents.map((event) => (
            <EventChecklist key={event.id} event={event} uid={user.uid} />
          ))}
        </div>
      )}
    </div>
  )
}
