// ── Single source of truth for RM prices used in documents ─────────────────
// Values are the ones previously hardcoded in NewInvoice.tsx. Do not add
// price literals to pages — add them here.

export const MAKAN_BERADAB_PRICE = 100

/** Katering per-pax tier: < 300 pax → RM15.00, >= 300 pax → RM10.50 */
export function getKateringUnitPrice(pax: number): number {
  return pax < 300 ? 15 : 10.5
}

/** Gaji pekerja lookup — pax rounds UP to nearest bracket. [bracket, RM] */
export const GAJI_TABLE: readonly [number, number][] = [
  [300, 530], [400, 590], [500, 850], [650, 910],
  [700, 970], [800, 1030], [1000, 1150], [1300, 1680], [1500, 2000],
]

export function getGajiPekerja(pax: number): number {
  for (const [bracket, gaji] of GAJI_TABLE) {
    if (pax <= bracket) return gaji
  }
  return 2000
}

/** Berkat suggestion: ≤500 → 100, ≤800 → 200, else 300 */
export function getBerkatSuggestion(pax: number): number {
  if (pax <= 500) return 100
  if (pax <= 800) return 200
  return 300
}

/**
 * Formats a price for a pre-filled `<input type="number">` value so the text
 * matches the literals previously used in NewInvoice.tsx: 15 → "15",
 * 10.5 → "10.50". Exists only to keep the pre-filled input byte-identical.
 */
export function fmtUnitPriceInput(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
