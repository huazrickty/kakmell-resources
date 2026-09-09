// ── Document running numbers — PURE part (no Firebase import; unit-testable) ──
// Format: INV-YYYY-NNN / QUO-YYYY-NNN. Sequence is per kind AND per year.
// The Firestore transaction that issues numbers lives in
// document-number.firestore.ts and calls nextSequence() below.

export type DocumentKind = 'invoice' | 'quotation'

export const DOCUMENT_PREFIX: Record<DocumentKind, string> = {
  invoice:   'INV',
  quotation: 'QUO',
}

/** Counter doc shape (counters/{kind}): { "2026": 12, "2027": 3 } — year → last issued sequence. */
export type CounterDoc = Record<string, number>

export function formatDocumentNumber(kind: DocumentKind, year: number, seq: number): string {
  return `${DOCUMENT_PREFIX[kind]}-${year}-${String(seq).padStart(3, '0')}`
}

const RE = /^(INV|QUO)-(\d{4})-(\d+)$/

export function parseDocumentNumber(no: string): { kind: DocumentKind; year: number; seq: number } | null {
  const m = RE.exec(no ?? '')
  if (!m) return null
  const kind = (Object.keys(DOCUMENT_PREFIX) as DocumentKind[]).find(k => DOCUMENT_PREFIX[k] === m[1])
  if (!kind) return null
  return { kind, year: Number(m[2]), seq: Number(m[3]) }
}

/**
 * Pure core of the issuing transaction: given the current counter doc (or
 * undefined when it does not exist) and the DOCUMENT year, return the next
 * sequence. Missing doc, missing year field, or a corrupt value → 0 → next is 1.
 */
export function nextSequence(counter: CounterDoc | undefined, year: number): number {
  const current = counter?.[String(year)]
  return (typeof current === 'number' && Number.isFinite(current) ? current : 0) + 1
}
