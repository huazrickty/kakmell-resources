import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Sun, Moon, MapPin, ChevronDown, Users, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import {
  type IngredientResult,
  type MainIngredients,
  type DagingBox,
  type DalcaIngredients,
  type AcarIngredients,
} from '@/lib/ingredient-calculator'
import { getIngredientOverrides, type OverrideMap } from '@/lib/ingredient-overrides'
import { calculateIngredientsWithOverrides } from '@/lib/ingredient-calculator-dynamic'
import { cn } from '@/lib/utils'

// ── Ingredient row helpers ─────────────────────────────────────────────────

function mainRows(m: MainIngredients): [string, string][] {
  return [
    ['Beras',         `${m.beras_bag} bag`],
    ['Ayam',          `${m.ayam_ekor} ekor`],
    ['Daging',        `${m.daging_kg} kg`],
    ['Paceri Nenas',  `${m.paceri_nenas_biji} biji`],
    ['Oren',          `${m.oren_biji} biji`],
    ['Gula',          `${m.gula_liter} L`],
  ]
}

function dagingRows(d: DagingBox): [string, string][] {
  return [
    ['Slice',    `${d.slice_boxes} kotak`],
    ['Trim',     '1 kotak'],
    ['Lebihan',  `${d.variance_kg} kg`],
  ]
}

function dalcaRows(d: DalcaIngredients): [string, string][] {
  return [
    ['Kacang Dall',    d.kacang_dall],
    ['Terung',         d.terung],
    ['Kentang',        d.kentang],
    ['Karot',          d.karot ?? '—'],
    ['Kacang Panjang', d.kacang_panjang],
    ['Serbuk Kari',    d.serbuk_kari ?? '—'],
  ]
}

function acarRows(a: AcarIngredients): [string, string][] {
  const rows: [string, string][] = []
  if (a.timun_kg !== null) rows.push(['Timun', `${a.timun_kg} kg`])
  rows.push(['Nenas', `${a.nenas_biji} biji`])
  return rows
}

// ── IngSection ────────────────────────────────────────────────────────────

function IngSection({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#1B4332] uppercase tracking-widest mb-2">{label}</p>
      <div className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs gap-2">
            <span className="text-gray-500">{k}</span>
            <span className="font-semibold text-gray-900 tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── IngredientDisplay ─────────────────────────────────────────────────────

function IngredientDisplay({ ingr, acarType }: { ingr: IngredientResult; acarType?: string }) {
  const acarLabel = acarType === 'Pencuk' ? 'Pencuk (Acar Jelatah)' : 'Paceri Nenas'
  return (
    <div className="border-t border-gray-100 px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
      <IngSection label="Bahan Utama"  rows={mainRows(ingr.main)} />
      <IngSection label="Dalca"        rows={dalcaRows(ingr.dalca)} />
      <IngSection label="Kotak Daging" rows={dagingRows(ingr.daging_box)} />
      <IngSection label={acarLabel}    rows={acarRows(ingr.acar)} />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-4 w-4 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Ingredients() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const { events, loading } = useEvents()
  const [openId, setOpenId] = useState<string | null>(null)
  const isAdmin = userDoc?.role === 'admin'

  const [overrides, setOverrides] = useState<OverrideMap>({})

  useEffect(() => {
    getIngredientOverrides().then(setOverrides).catch(() => {})
  }, [])

  const upcoming = events
    .filter((e) => e.status === 'upcoming')
    .map((e) => ({ event: e, ingr: calculateIngredientsWithOverrides(e.pax, overrides, e.menu_selection.acar) }))

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('ingredients.title')}</h1>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {upcoming.length} acara
        </span>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} />)}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {!loading && upcoming.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">{t('ingredients.noEvents')}</p>
        </div>
      )}

      {/* ── Event accordion ─────────────────────────────────────────────── */}
      {!loading && upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map(({ event, ingr }) => {
            const isOpen  = openId === event.id
            const date    = event.tarikh.toDate()

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
                  onClick={() => setOpenId(isOpen ? null : event.id)}
                >
                  {/* Left border accent */}
                  <div className="w-0.5 h-10 rounded-full bg-red-500 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                        {event.nama_majlis}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
                          className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <ExternalLink size={12} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {event.hall_name && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} strokeWidth={1.8} />
                          {event.hall_name}
                        </span>
                      )}
                      <span>{format(date, 'd MMM yyyy')}</span>
                      <span className="flex items-center gap-1">
                        {event.sesi === 'siang'
                          ? <Sun  size={10} strokeWidth={1.8} className="text-amber-500" />
                          : <Moon size={10} strokeWidth={1.8} className="text-indigo-400" />}
                        {event.sesi === 'siang' ? 'Siang' : 'Malam'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={10} strokeWidth={1.8} />
                        {event.pax} pax
                        {ingr && <span className="text-gray-400">→ {ingr.bracket}</span>}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={cn(
                      'shrink-0 text-gray-400 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </div>

                {/* Ingredient panel */}
                {isOpen && (
                  ingr
                    ? <IngredientDisplay ingr={ingr} acarType={event.menu_selection.acar} />
                    : (
                      <div className="border-t border-gray-100 px-4 py-4 text-sm text-gray-400 text-center">
                        {t('events.customPax')}
                      </div>
                    )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
