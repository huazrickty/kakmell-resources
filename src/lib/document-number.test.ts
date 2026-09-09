import { describe, it, expect, vi } from 'vitest'
import { formatDocumentNumber, parseDocumentNumber, nextSequence } from './document-number'

describe('formatDocumentNumber', () => {
  it('pads to 3: 001, 010, 100; grows beyond 999', () => {
    expect(formatDocumentNumber('invoice', 2026, 1)).toBe('INV-2026-001')
    expect(formatDocumentNumber('invoice', 2026, 10)).toBe('INV-2026-010')
    expect(formatDocumentNumber('invoice', 2026, 100)).toBe('INV-2026-100')
    expect(formatDocumentNumber('invoice', 2026, 1234)).toBe('INV-2026-1234')
    expect(formatDocumentNumber('quotation', 2027, 7)).toBe('QUO-2027-007')
  })

  it('year rollover: sequence is per year, new year restarts from 001', () => {
    expect(nextSequence({ '2026': 42 }, 2026)).toBe(43)
    expect(nextSequence({ '2026': 42 }, 2027)).toBe(1)     // year field absent → init 0 → 1
    expect(nextSequence(undefined, 2026)).toBe(1)          // counter doc absent
    expect(formatDocumentNumber('invoice', 2027, nextSequence({ '2026': 42 }, 2027))).toBe('INV-2027-001')
  })

  it('ignores a corrupt (non-numeric) counter value → treats as 0', () => {
    expect(nextSequence({ '2026': 'x' as unknown as number }, 2026)).toBe(1)
    expect(nextSequence({ '2026': NaN }, 2026)).toBe(1)
  })

  it('year comes from the document date, not the system clock (backdated save)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 9, 0, 0))                 // clock says 2027
    try {
      const docDate = new Date(2026, 11, 31)                         // invoice dated 31/12/2026
      const year = docDate.getFullYear()
      expect(new Date().getFullYear()).toBe(2027)                    // sanity: clock really is 2027
      expect(formatDocumentNumber('invoice', year, nextSequence({ '2026': 42, '2027': 3 }, year))).toBe('INV-2026-043')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('parseDocumentNumber', () => {
  it('round-trips', () => {
    expect(parseDocumentNumber('INV-2026-042')).toEqual({ kind: 'invoice', year: 2026, seq: 42 })
    expect(parseDocumentNumber('QUO-2026-003')).toEqual({ kind: 'quotation', year: 2026, seq: 3 })
    expect(parseDocumentNumber('INV-2026-1234')).toEqual({ kind: 'invoice', year: 2026, seq: 1234 })
  })
  it('rejects garbage', () => {
    expect(parseDocumentNumber('INV-abc')).toBeNull()
    expect(parseDocumentNumber('')).toBeNull()
    expect(parseDocumentNumber('XYZ-2026-001')).toBeNull()
  })
})
