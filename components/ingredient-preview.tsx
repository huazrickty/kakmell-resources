'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Package } from 'lucide-react'
import type { IngredientList } from '@/lib/ingredient-calculator'

interface IngredientPreviewProps {
  result: IngredientList
  pax: number
  defaultOpen?: boolean
}

function Row({ label, value, workings }: { label: string; value: string; workings?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <span className="text-sm text-gray-800">{label}</span>
        {workings && (
          <p className="text-[11px] text-gray-400 mt-0.5">{workings}</p>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 shrink-0 ml-3">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <div className="bg-gray-50 rounded-lg px-3">{children}</div>
    </div>
  )
}

export function IngredientPreview({ result, pax, defaultOpen = false }: IngredientPreviewProps) {
  const [open, setOpen] = useState(defaultOpen)

  const varSign = result.dagingBoxes.sliceVarianceKg >= 0 ? '+' : ''
  const varKg = `${varSign}${result.dagingBoxes.sliceVarianceKg.toFixed(1)} kg`

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Package size={16} className="text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-800">
            Anggaran Bahan Mentah — {pax} pax
            <span className="font-normal text-blue-600 ml-1">(Bracket {result.paxBracket})</span>
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-blue-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-blue-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-blue-200 pt-4 bg-white">
          {result.warning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">{result.warning}</p>
            </div>
          )}

          {/* Main ingredients */}
          <Section title="Bahan Utama">
            {result.main.map((item) => (
              <Row
                key={item.name}
                label={item.name}
                value={`${item.qty} ${item.unit}`}
                workings={item.workings}
              />
            ))}
          </Section>

          {/* Daging boxes */}
          <Section title="Daging — Kiraan Kotak">
            <Row
              label={`Slice box (${result.dagingBoxes.sliceRawKg} kg raw)`}
              value={`${result.dagingBoxes.sliceBoxes} kotak`}
              workings={`Variance: ${varKg} (${result.dagingBoxes.sliceVarianceKg >= 0 ? 'lebih' : 'kurang'})`}
            />
            <Row
              label="Trimming box (tetap)"
              value={`${result.dagingBoxes.trimmingBoxes} kotak`}
            />
          </Section>

          {/* Dalca */}
          <Section title="Dalca">
            {result.dalca.map((item) => (
              <Row
                key={item.name}
                label={item.name}
                value={`${item.qty}${item.unit ? ' ' + item.unit : ''}`}
              />
            ))}
          </Section>

          {/* Bubur */}
          {result.bubur.length > 0 && (
            <Section title="Bubur">
              {result.bubur.map((item) => (
                <Row
                  key={item.name}
                  label={item.name}
                  value={`${item.qty} ${item.unit}`}
                />
              ))}
            </Section>
          )}

          {/* Acar / Paceri */}
          {result.acorPaceri.length > 0 && (
            <Section title="Acar / Paceri">
              {result.acorPaceri.map((item) => (
                <Row
                  key={item.name}
                  label={item.name}
                  value={`${item.qty} ${item.unit}`}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
