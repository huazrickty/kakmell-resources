import { describe, it, expect } from 'vitest'
import { tsToDate, fmtDateDMY } from './date-utils'

describe('tsToDate', () => {
  it('passes Date through', () => {
    const d = new Date(2026, 0, 5); expect(tsToDate(d)).toBe(d)
  })
  it('calls toDate() on Firestore Timestamp-like', () => {
    const d = new Date(2026, 4, 1)
    expect(tsToDate({ toDate: () => d })).toBe(d)
  })
  it('handles {seconds} and {_seconds}', () => {
    expect(tsToDate({ seconds: 86400 }).getTime()).toBe(86400_000)
    expect(tsToDate({ _seconds: 86400 }).getTime()).toBe(86400_000)
  })
  it('parses ISO string', () => {
    expect(tsToDate('2026-03-01T00:00:00Z').toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })
  it('falsy → now (not Invalid Date)', () => {
    expect(Number.isNaN(tsToDate(null).getTime())).toBe(false)
  })
})

describe('fmtDateDMY', () => {
  it('zero-pads DD/MM/YYYY', () => {
    expect(fmtDateDMY(new Date(2026, 0, 5))).toBe('05/01/2026')
    expect(fmtDateDMY(new Date(2026, 11, 25))).toBe('25/12/2026')
  })
})
