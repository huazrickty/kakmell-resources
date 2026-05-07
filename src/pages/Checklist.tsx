import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { Sun, Moon, MapPin, Users, ChevronDown } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents, type EventDoc, type MenuSelection } from '@/hooks/useEvents'
import { calculateIngredients } from '@/lib/ingredient-calculator'
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
  if (menu.air_panas) items.push(menu.air_panas)
  items.push('Air Anggur')
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
  const pct   = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{event.nama_majlis}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-500 mt-0.5">
              {event.hall_name && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} strokeWidth={1.8} />
                  {event.hall_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                {event.sesi === 'siang'
                  ? <Sun  size={10} strokeWidth={1.8} className="text-amber-500" />
                  : <Moon size={10} strokeWidth={1.8} className="text-indigo-400" />}
                {event.sesi === 'siang' ? 'Siang' : 'Malam'}
              </span>
              <span className="flex items-center gap-1">
                <Users size={10} strokeWidth={1.8} />
                {event.pax} pax
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-gray-500 tabular-nums">
            {done}/{total} {t('checklist.done')}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              pct === 100 ? 'bg-green-500' : 'bg-[#1B4332]'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Lauk pills ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {laukItems.map((item) => {
            const isDone = checked.includes(item)
            return (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all select-none',
                  isDone
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 active:bg-gray-50'
                )}
              >
                {isDone && (
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {item}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Ingredient toggle ────────────────────────────────────────────── */}
      {ingr && (
        <div className="border-t border-gray-50">
          <button
            onClick={() => setShowIngr((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-50/50 transition-colors"
          >
            <span>{showIngr ? t('checklist.hideIngredients') : t('checklist.showIngredients')}</span>
            <ChevronDown
              size={13}
              className={cn('text-gray-300 transition-transform duration-200', showIngr && 'rotate-180')}
            />
          </button>

          {showIngr && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-50">
              {/* Left: Bahan Utama */}
              <div>
                <p className="text-[10px] font-bold text-[#1B4332] uppercase tracking-widest mb-1.5">
                  {t('ingredients.mainItems')}
                </p>
                <div className="space-y-1">
                  {([
                    ['Beras',        `${ingr.main.beras_bag} bag`],
                    ['Ayam',         `${ingr.main.ayam_ekor} ekor`],
                    ['Daging',       `${ingr.main.daging_kg} kg`],
                    ['Paceri Nenas', `${ingr.main.paceri_nenas_biji} biji`],
                    ['Oren',         `${ingr.main.oren_biji} biji`],
                    ['Gula',         `${ingr.main.gula_liter} L`],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-gray-400">{k}</span>
                      <span className="font-semibold text-gray-700 tabular-nums">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Dalca */}
              <div>
                <p className="text-[10px] font-bold text-[#1B4332] uppercase tracking-widest mb-1.5">
                  {t('ingredients.dalca')}
                </p>
                <div className="space-y-1">
                  {([
                    ['Kacang Dall',    ingr.dalca.kacang_dall],
                    ['Terung',         ingr.dalca.terung],
                    ['Kentang',        ingr.dalca.kentang],
                    ['Karot',          ingr.dalca.karot ?? '—'],
                    ['Kacang Panjang', ingr.dalca.kacang_panjang],
                    ['Serbuk Kari',    ingr.dalca.serbuk_kari ?? '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-gray-400">{k}</span>
                      <span className="font-semibold text-gray-700 tabular-nums">{v}</span>
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
        <h1 className="text-2xl font-bold text-gray-900">{t('checklist.title')}</h1>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {isToday ? t('checklist.todayEvents') : t('checklist.weekEvents')}
        </span>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && displayEvents.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">{t('checklist.noEventsToday')}</p>
        </div>
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
