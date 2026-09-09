import { describe, it, expect } from 'vitest'
import { getKateringUnitPrice, getGajiPekerja, getBerkatSuggestion, fmtUnitPriceInput, MAKAN_BERADAB_PRICE, GAJI_TABLE } from './pricing'

describe('pricing', () => {
  it('katering tier: <300 → 15, >=300 → 10.50', () => {
    expect(getKateringUnitPrice(299)).toBe(15)
    expect(getKateringUnitPrice(300)).toBe(10.5)
    expect(getKateringUnitPrice(1000)).toBe(10.5)
  })

  it('gaji pekerja rounds UP to bracket, caps at 2000', () => {
    expect(getGajiPekerja(300)).toBe(530)
    expect(getGajiPekerja(301)).toBe(590)
    expect(getGajiPekerja(500)).toBe(850)
    expect(getGajiPekerja(650)).toBe(910)
    expect(getGajiPekerja(651)).toBe(970)
    expect(getGajiPekerja(1000)).toBe(1150)
    expect(getGajiPekerja(1500)).toBe(2000)
    expect(getGajiPekerja(1501)).toBe(2000)
  })

  it('berkat suggestion tiers', () => {
    expect(getBerkatSuggestion(500)).toBe(100)
    expect(getBerkatSuggestion(501)).toBe(200)
    expect(getBerkatSuggestion(800)).toBe(200)
    expect(getBerkatSuggestion(801)).toBe(300)
  })

  it('fmtUnitPriceInput keeps pre-filled input text byte-identical to old literals', () => {
    expect(fmtUnitPriceInput(15)).toBe('15')
    expect(fmtUnitPriceInput(10.5)).toBe('10.50')
  })

  it('constants', () => {
    expect(MAKAN_BERADAB_PRICE).toBe(100)
    expect(GAJI_TABLE).toHaveLength(9)
  })
})
