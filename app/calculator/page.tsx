'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SideNav } from '@/components/side-nav'
import { BottomNav } from '@/components/bottom-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import type { MenuSelection, IngredientList, DagingBoxResult } from '@/lib/ingredient-calculator'
import { cn } from '@/lib/utils'
import { Calculator, ChevronRight, Lock, CalendarPlus } from 'lucide-react'

// ── Menu data ────────────────────────────────────────────────────────────────

const MENU_NASI   = [
  { value: 'nasi_briyani', label: 'Nasi Briyani' },
  { value: 'nasi_minyak',  label: 'Nasi Minyak' },
  { value: 'nasi_jagung',  label: 'Nasi Jagung' },
]
const MENU_DAGING = [
  { value: 'daging_black_pepper', label: 'Black Pepper' },
  { value: 'daging_masak_hitam',  label: 'Masak Hitam' },
  { value: 'daging_briyani',      label: 'Briyani' },
  { value: 'daging_kuzi',         label: 'Kuzi' },
  { value: 'daging_masak_kurma',  label: 'Kurma' },
]
const MENU_ACAR   = [
  { value: 'paceri_nenas', label: 'Paceri Nenas' },
  { value: 'pencuk',       label: 'Pencuk' },
]
const MENU_BUBUR  = [
  { value: 'bubur_pulut_hitam',  label: 'Pulut Hitam' },
  { value: 'bubur_kacang_hijau', label: 'Kacang Hijau' },
  { value: 'bubur_jagung',       label: 'Jagung' },
]
const MENU_KUIH = [
  'Karipap', 'Kasui Gedik', 'Cara Lauk', 'Cara Manis',
  'Seri Muka', 'Kole Kacang', 'Apam Gula Hangus', 'Koci',
]

const BUBUR_LABELS: Record<string, string> = {
  bubur_pulut_hitam:  'Bubur Pulut Hitam',
  bubur_kacang_hijau: 'Bubur Kacang Hijau',
  bubur_jagung:       'Bubur Jagung',
}

// ── Sub-components ───────────────────────────────────────────────────────────

function OptionBtn({ label, selected, onSelect, disabled = false }: {
  label: string; selected: boolean; onSelect: () => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[48px] text-left',
        selected  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400',
        disabled && !selected && 'opacity-40 cursor-not-allowed',
      )}
    >
      {selected && <span className="mr-1">✓</span>}{label}
    </button>
  )
}

function MenuCat({ title, badge, children }: {
  title: string; badge?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        {badge && <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{badge}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="bg-gray-200 px-3 py-1.5 rounded-md mb-1">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</p>
    </div>
  )
}

function IngRow({ name, qty, unit, workings }: {
  name: string; qty: string | number; unit: string; workings?: string
}) {
  const q = typeof qty === 'number'
    ? qty % 1 === 0 ? String(qty) : qty.toFixed(1)
    : String(qty)
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{name}</p>
        {workings && <p className="text-xs text-gray-400 mt-0.5">{workings}</p>}
      </div>
      <p className="text-sm font-bold text-gray-900 ml-4 shrink-0 tabular-nums">{q}{unit ? ' ' + unit : ''}</p>
    </div>
  )
}

function DagingCard({ d }: { d: DagingBoxResult }) {
  const sign  = d.sliceVarianceKg >= 0 ? '+' : ''
  const label = d.sliceVarianceKg >= 0 ? 'lebih' : 'kurang'
  return (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
      <p className="text-xs font-semibold text-amber-800 mb-1">Kiraan Kotak Daging</p>
      <p className="text-sm text-gray-800">
        🔶 <span className="font-semibold">Slice:</span> {d.sliceBoxes} kotak ({d.sliceRawKg} kg raw)
        <span className="text-xs text-gray-500 ml-2">Variance: {sign}{Math.abs(d.sliceVarianceKg).toFixed(1)} kg {label}</span>
      </p>
      <p className="text-sm text-gray-800">🔶 <span className="font-semibold">Trimming:</span> {d.trimmingBoxes} kotak (tetap)</p>
    </div>
  )
}

function ResultsPanel({ result, pax }: { result: IngredientList; pax: number }) {
  const buburLabel = BUBUR_LABELS[result.bubur[0]?.name ?? ''] ?? 'Bubur'

  return (
    <div className="space-y-5">
      {/* Bracket note */}
      <div className="bg-blue-50 rounded-lg px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">
          📦 Menggunakan data {result.paxBracket} pax
          {pax !== result.paxBracket && (
            <span className="font-normal text-blue-600"> (rounded up dari {pax} pax)</span>
          )}
        </p>
      </div>

      {result.warning && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">⚠️ {result.warning}</p>
        </div>
      )}

      {/* Bahan Utama */}
      <div>
        <SectionHead title="Bahan Utama" />
        <div className="bg-white rounded-lg border border-gray-100 px-4">
          {result.main.map(item =>
            item.name === 'Daging' ? (
              <div key="daging" className="py-2.5 border-b border-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    {item.workings && <p className="text-xs text-gray-400 mt-0.5">{item.workings}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-4 tabular-nums">{item.qty} {item.unit}</p>
                </div>
                <DagingCard d={result.dagingBoxes} />
              </div>
            ) : (
              <IngRow key={item.name} name={item.name} qty={item.qty} unit={item.unit} workings={item.workings} />
            )
          )}
        </div>
      </div>

      {/* Dalca */}
      <div>
        <SectionHead title="Dalca" />
        <div className="bg-white rounded-lg border border-gray-100 px-4">
          {result.dalca.map(item => (
            <div key={item.name} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
              <p className="text-sm font-medium text-gray-800">{item.name}</p>
              <p className="text-sm font-bold text-gray-900 ml-4 tabular-nums">{item.qty}{item.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bubur */}
      <div>
        <SectionHead title={buburLabel || 'Bubur'} />
        <div className="bg-white rounded-lg border border-gray-100 px-4">
          {result.bubur.map(item => (
            <IngRow key={item.name} name={item.name} qty={item.qty} unit={item.unit} />
          ))}
        </div>
      </div>

      {/* Acar / Paceri */}
      <div>
        <SectionHead title="Acar / Paceri" />
        <div className="bg-white rounded-lg border border-gray-100 px-4">
          {result.acorPaceri.length > 0
            ? result.acorPaceri.map(item => (
                <IngRow key={item.name} name={item.name} qty={item.qty} unit={item.unit} />
              ))
            : <p className="text-sm text-gray-400 py-3">—</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const router = useRouter()

  const [pax,          setPax]          = useState('')
  const [menuNasi,     setMenuNasi]     = useState('')
  const [menuDaging,   setMenuDaging]   = useState('')
  const [menuAcar,     setMenuAcar]     = useState('')
  const [menuBubur,    setMenuBubur]    = useState('')
  const [menuKuih,     setMenuKuih]     = useState<string[]>([])
  const [calculated,   setCalculated]   = useState(false)

  // Live calculation — triggered when user clicks "Kira"
  const result = useMemo<IngredientList | null>(() => {
    if (!calculated) return null
    const paxNum = parseInt(pax)
    if (!paxNum || paxNum < 1) return null
    if (!menuNasi || !menuDaging || !menuAcar || !menuBubur) return null
    try {
      return calculateIngredients(paxNum, {
        nasi:  menuNasi  as MenuSelection['nasi'],
        ayam:  'ayam_masak_merah',
        daging: menuDaging as MenuSelection['daging'],
        acar:  menuAcar  as MenuSelection['acar'],
        bubur: menuBubur as MenuSelection['bubur'],
        kuih:  menuKuih,
      })
    } catch { return null }
  }, [calculated, pax, menuNasi, menuDaging, menuAcar, menuBubur, menuKuih])

  // Re-calculate on param changes after first calculation
  const liveResult = useMemo<IngredientList | null>(() => {
    if (!calculated) return null
    const paxNum = parseInt(pax)
    if (!paxNum || paxNum < 1) return null
    if (!menuNasi || !menuDaging || !menuAcar || !menuBubur) return null
    try {
      return calculateIngredients(paxNum, {
        nasi:  menuNasi  as MenuSelection['nasi'],
        ayam:  'ayam_masak_merah',
        daging: menuDaging as MenuSelection['daging'],
        acar:  menuAcar  as MenuSelection['acar'],
        bubur: menuBubur as MenuSelection['bubur'],
        kuih:  menuKuih,
      })
    } catch { return null }
  }, [calculated, pax, menuNasi, menuDaging, menuAcar, menuBubur, menuKuih])

  const canCalculate = !!(parseInt(pax) > 0 && menuNasi && menuDaging && menuAcar && menuBubur)

  function handleKira() {
    if (!canCalculate) return
    setCalculated(true)
  }

  function toggleKuih(item: string) {
    setMenuKuih(prev => {
      if (prev.includes(item)) return prev.filter(k => k !== item)
      if (prev.length >= 2) return prev
      return [...prev, item]
    })
  }

  function handleSimpan() {
    const params = new URLSearchParams()
    if (pax)       params.set('pax', pax)
    if (menuNasi)  params.set('nasi', menuNasi)
    if (menuDaging) params.set('daging', menuDaging)
    if (menuAcar)  params.set('acar', menuAcar)
    if (menuBubur) params.set('bubur', menuBubur)
    menuKuih.forEach(k => params.append('kuih', k))
    router.push(`/bookings/new?${params.toString()}`)
  }

  return (
    <>
      <SideNav />
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:pl-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-5xl mx-auto">
            <Calculator size={20} className="text-green-600 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Kalkulator Bahan Mentah</h1>
              <p className="text-xs text-gray-400">Kiraan automatik tanpa simpan</p>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-5 lg:py-8">
          <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">

            {/* Left: input form */}
            <div className="lg:col-span-2 space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tetapan Kiraan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Pax */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Bilangan Pax <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={pax}
                      onChange={e => { setPax(e.target.value); setCalculated(false) }}
                      placeholder="Cth: 500"
                      min={1}
                      className="h-12 text-base"
                    />
                    {parseInt(pax) > 1000 && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Pax melebihi 1000 — perlu kiraan khas</p>
                    )}
                  </div>

                  {/* Nasi */}
                  <MenuCat title="Nasi" badge="Pilih 1">
                    {MENU_NASI.map(o => (
                      <OptionBtn key={o.value} label={o.label}
                        selected={menuNasi === o.value}
                        onSelect={() => { setMenuNasi(o.value); setCalculated(false) }} />
                    ))}
                  </MenuCat>

                  {/* Ayam locked */}
                  <MenuCat title="Ayam">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-500 bg-green-50 text-green-700 text-sm font-medium min-h-[48px]">
                      <Lock size={13} className="text-green-500" />
                      Ayam Masak Merah <span className="text-xs text-green-500 ml-1">(standard)</span>
                    </div>
                  </MenuCat>

                  {/* Daging */}
                  <MenuCat title="Daging" badge="Pilih 1">
                    {MENU_DAGING.map(o => (
                      <OptionBtn key={o.value} label={o.label}
                        selected={menuDaging === o.value}
                        onSelect={() => { setMenuDaging(o.value); setCalculated(false) }} />
                    ))}
                  </MenuCat>

                  {/* Acar */}
                  <MenuCat title="Acar" badge="Pilih 1">
                    {MENU_ACAR.map(o => (
                      <OptionBtn key={o.value} label={o.label}
                        selected={menuAcar === o.value}
                        onSelect={() => { setMenuAcar(o.value); setCalculated(false) }} />
                    ))}
                  </MenuCat>

                  {/* Bubur */}
                  <MenuCat title="Bubur" badge="Pilih 1">
                    {MENU_BUBUR.map(o => (
                      <OptionBtn key={o.value} label={o.label}
                        selected={menuBubur === o.value}
                        onSelect={() => { setMenuBubur(o.value); setCalculated(false) }} />
                    ))}
                  </MenuCat>

                  {/* Kuih */}
                  <MenuCat title="Kuih" badge={`Pilih 2 — ${menuKuih.length}/2`}>
                    {MENU_KUIH.map(item => (
                      <OptionBtn key={item} label={item}
                        selected={menuKuih.includes(item)}
                        onSelect={() => toggleKuih(item)}
                        disabled={menuKuih.length >= 2 && !menuKuih.includes(item)} />
                    ))}
                  </MenuCat>

                  {/* Kira button */}
                  <button
                    type="button"
                    onClick={handleKira}
                    disabled={!canCalculate}
                    className={cn(
                      'w-full min-h-[52px] rounded-lg font-semibold text-base transition-colors flex items-center justify-center gap-2',
                      canCalculate
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Calculator size={18} />
                    Kira Sekarang
                  </button>

                </CardContent>
              </Card>
            </div>

            {/* Right: results */}
            <div className="lg:col-span-3 mt-5 lg:mt-0">
              {liveResult ? (
                <div className="space-y-5">
                  <ResultsPanel result={liveResult} pax={parseInt(pax)} />

                  {/* Simpan ke Booking */}
                  <button
                    type="button"
                    onClick={handleSimpan}
                    className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <CalendarPlus size={18} />
                    Simpan ke Booking Baru
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center lg:min-h-[400px] flex flex-col items-center justify-center">
                  <Calculator size={40} className="text-gray-300 mb-4" />
                  <p className="text-sm font-medium text-gray-400">
                    {canCalculate ? 'Tekan "Kira Sekarang" untuk lihat senarai bahan' : 'Isi pax dan pilihan menu untuk mula'}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
