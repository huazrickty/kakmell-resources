'use client'

import { calculateIngredients } from '@/lib/ingredient-calculator'
import type { MenuSelection, Ingredient, DagingBoxResult } from '@/lib/ingredient-calculator'
import type { Booking } from '@/lib/types'

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface BahanMentahTabProps {
  booking: Booking
}

// ──────────────────────────────────────────────────────────────
// Section header
// ──────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-gray-200 px-3 py-1.5 rounded-md mb-1">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Ingredient row
// ──────────────────────────────────────────────────────────────
function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const qtyDisplay = typeof ingredient.qty === 'number'
    ? ingredient.qty % 1 === 0 ? String(ingredient.qty) : ingredient.qty.toFixed(1)
    : String(ingredient.qty)

  const unitDisplay = ingredient.unit ? ` ${ingredient.unit}` : ''

  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{ingredient.name}</p>
        {ingredient.workings && (
          <p className="text-xs text-gray-400 mt-0.5">{ingredient.workings}</p>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 ml-4 shrink-0 tabular-nums">
        {qtyDisplay}{unitDisplay}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Daging sub-card
// ──────────────────────────────────────────────────────────────
function DagingBoxCard({ dagingBoxes }: { dagingBoxes: DagingBoxResult }) {
  const variance = dagingBoxes.sliceVarianceKg
  const varianceSign = variance >= 0 ? '+' : ''
  const varianceLabel = variance >= 0 ? 'lebih' : 'kurang'

  return (
    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
      <p className="text-xs font-semibold text-amber-800 mb-2">Kiraan Kotak Daging</p>
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-sm">🔶</span>
        <div>
          <p className="text-sm text-gray-800">
            <span className="font-semibold">Slice:</span> {dagingBoxes.sliceBoxes} kotak ({dagingBoxes.sliceRawKg} kg raw)
          </p>
          <p className="text-xs text-gray-500">
            Variance: {varianceSign}{Math.abs(variance).toFixed(1)} kg {varianceLabel}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-sm">🔶</span>
        <p className="text-sm text-gray-800">
          <span className="font-semibold">Trimming:</span> {dagingBoxes.trimmingBoxes} kotak (tetap)
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────
export function BahanMentahTab({ booking }: BahanMentahTabProps) {
  const ms = booking.menu_selection

  // Check completeness
  const isComplete = !!(
    ms &&
    ms.nasi && typeof ms.nasi === 'string' && ms.nasi.length > 0 &&
    ms.daging && typeof ms.daging === 'string' && ms.daging.length > 0 &&
    ms.acar && typeof ms.acar === 'string' && ms.acar.length > 0 &&
    ms.bubur && typeof ms.bubur === 'string' && ms.bubur.length > 0
  )

  if (!isComplete) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
        <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Pilihan menu tidak lengkap</p>
        <p className="text-sm text-yellow-700">
          Pergi ke tab <strong>Butiran</strong> untuk kemaskini pilihan menu (nasi, daging, acar, bubur).
        </p>
      </div>
    )
  }

  // Calculate ingredients
  let result
  try {
    result = calculateIngredients(booking.pax, ms as unknown as MenuSelection)
  } catch {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-700">Ralat semasa mengira bahan mentah. Sila semak semula pilihan menu.</p>
      </div>
    )
  }

  const { paxBracket, main, dalca, bubur, acorPaceri, dagingBoxes, warning } = result

  // Determine bubur label
  const buburKey = ms?.bubur as string | undefined
  const BUBUR_LABELS: Record<string, string> = {
    bubur_pulut_hitam: 'Bubur Pulut Hitam',
    bubur_kacang_hijau: 'Bubur Kacang Hijau',
    bubur_jagung: 'Bubur Jagung',
  }
  const buburLabel = buburKey ? (BUBUR_LABELS[buburKey] ?? 'Bubur') : 'Bubur'

  return (
    <div>
      {/* Print header — hidden on screen, shown on print */}
      <div className="hidden print-show mb-4">
        <p className="text-base font-bold">KAKMELL RESOURCES — Senarai Bahan Mentah</p>
        <p className="text-sm text-gray-600">
          Klien: {booking.client_name} | Tarikh: {booking.event_date} | {booking.pax} pax
        </p>
        <hr className="my-2" />
      </div>

      {/* Top row: pax info + print button */}
      <div className="flex items-start justify-between gap-3 mb-4 no-print">
        <div className="bg-blue-50 rounded-lg px-4 py-3 flex-1">
          <p className="text-sm font-semibold text-blue-800">
            📦 Menggunakan data {paxBracket} pax
            {booking.pax !== paxBracket && (
              <span className="font-normal text-blue-600"> (rounded up dari {booking.pax} pax)</span>
            )}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="min-h-[48px] px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0 no-print"
        >
          🖨️ Print
        </button>
      </div>

      {/* Warning if pax > 1000 */}
      {warning && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-4 no-print">
          <p className="text-sm text-amber-800">⚠️ {warning}</p>
        </div>
      )}

      {/* Content */}
      <div id="print-content" className="space-y-5">

        {/* BAHAN UTAMA */}
        <div>
          <SectionHeader title="Bahan Utama" />
          <div className="bg-white rounded-lg border border-gray-100 px-4">
            {main.map((ingredient) => {
              if (ingredient.name === 'Daging') {
                return (
                  <div key={ingredient.name} className="py-2.5 border-b border-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{ingredient.name}</p>
                        {ingredient.workings && (
                          <p className="text-xs text-gray-400 mt-0.5">{ingredient.workings}</p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 ml-4 shrink-0 tabular-nums">
                        {typeof ingredient.qty === 'number' ? ingredient.qty : ingredient.qty} {ingredient.unit}
                      </p>
                    </div>
                    <DagingBoxCard dagingBoxes={dagingBoxes} />
                  </div>
                )
              }
              return <IngredientRow key={ingredient.name} ingredient={ingredient} />
            })}
          </div>
        </div>

        {/* DALCA */}
        <div>
          <SectionHeader title="Dalca" />
          <div className="bg-white rounded-lg border border-gray-100 px-4">
            {dalca.map((ingredient) => (
              <div key={ingredient.name} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-800">{ingredient.name}</p>
                <p className="text-sm font-bold text-gray-900 ml-4 tabular-nums">
                  {ingredient.qty}{ingredient.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BUBUR */}
        <div>
          <SectionHeader title={buburLabel} />
          <div className="bg-white rounded-lg border border-gray-100 px-4">
            {bubur.map((ingredient) => (
              <IngredientRow key={ingredient.name} ingredient={ingredient} />
            ))}
          </div>
        </div>

        {/* ACAR / PACERI */}
        <div>
          <SectionHeader title="Acar / Paceri" />
          <div className="bg-white rounded-lg border border-gray-100 px-4">
            {acorPaceri.length > 0 ? (
              acorPaceri.map((ingredient) => (
                <IngredientRow key={ingredient.name} ingredient={ingredient} />
              ))
            ) : (
              <p className="text-sm text-gray-400 py-3">—</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
