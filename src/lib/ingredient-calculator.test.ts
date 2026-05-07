import { describe, it, expect } from 'vitest'
import {
  BUBUR,
  BRACKETS,
  getBracket,
  getMainIngredients,
  getDagingBox,
  getDalca,
  getAcar,
  calculateIngredients,
} from './ingredient-calculator'

// ── getBracket ─────────────────────────────────────────────────────────────

describe('getBracket', () => {
  it('maps any pax below 300 to 300', () => {
    expect(getBracket(1)).toBe(300)
    expect(getBracket(100)).toBe(300)
    expect(getBracket(299)).toBe(300)
  })

  it('maps exact bracket values to themselves', () => {
    expect(getBracket(300)).toBe(300)
    expect(getBracket(400)).toBe(400)
    expect(getBracket(500)).toBe(500)
    expect(getBracket(600)).toBe(600)
    expect(getBracket(700)).toBe(700)
    expect(getBracket(800)).toBe(800)
    expect(getBracket(900)).toBe(900)
    expect(getBracket(1000)).toBe(1000)
  })

  it('rounds up to the next bracket', () => {
    expect(getBracket(301)).toBe(400)
    expect(getBracket(401)).toBe(500)
    expect(getBracket(501)).toBe(600)
    expect(getBracket(601)).toBe(700)
    expect(getBracket(701)).toBe(800)
    expect(getBracket(801)).toBe(900)
    expect(getBracket(901)).toBe(1000)
    expect(getBracket(999)).toBe(1000)
  })

  it('returns -1 for pax above 1000', () => {
    expect(getBracket(1001)).toBe(-1)
    expect(getBracket(2000)).toBe(-1)
    expect(getBracket(9999)).toBe(-1)
  })
})

// ── getMainIngredients ─────────────────────────────────────────────────────

describe('getMainIngredients', () => {
  it('returns correct values for bracket 300', () => {
    expect(getMainIngredients(300)).toEqual({
      beras_bag: 2, ayam_ekor: 20, daging_kg: 18,
      paceri_nenas_biji: 20, oren_biji: 25, gula_liter: 10,
    })
  })

  it('returns correct values for bracket 500 (has fractional beras)', () => {
    expect(getMainIngredients(500)).toEqual({
      beras_bag: 3.5, ayam_ekor: 35, daging_kg: 30,
      paceri_nenas_biji: 30, oren_biji: 30, gula_liter: 15,
    })
  })

  it('returns correct values for bracket 800', () => {
    expect(getMainIngredients(800)).toEqual({
      beras_bag: 5.5, ayam_ekor: 55, daging_kg: 48,
      paceri_nenas_biji: 45, oren_biji: 30, gula_liter: 25,
    })
  })

  it('returns correct values for bracket 1000', () => {
    expect(getMainIngredients(1000)).toEqual({
      beras_bag: 7, ayam_ekor: 70, daging_kg: 60,
      paceri_nenas_biji: 65, oren_biji: 40, gula_liter: 30,
    })
  })

  it('uses getBracket internally — pax 350 resolves to bracket 400', () => {
    expect(getMainIngredients(350)).toEqual(getMainIngredients(400))
  })
})

// ── getDagingBox ───────────────────────────────────────────────────────────

describe('getDagingBox', () => {
  it('bracket 300: 18kg → 2 slice boxes, variance 16kg', () => {
    expect(getDagingBox(18)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 16 })
  })

  it('bracket 400: 24kg → 2 slice boxes, variance 10kg', () => {
    expect(getDagingBox(24)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 10 })
  })

  it('bracket 600: 36kg → 3 slice boxes, variance 15kg', () => {
    expect(getDagingBox(36)).toEqual({ slice_boxes: 3, trim_boxes: 1, variance_kg: 15 })
  })

  it('bracket 900: 54kg → 4 slice boxes, variance 14kg', () => {
    expect(getDagingBox(54)).toEqual({ slice_boxes: 4, trim_boxes: 1, variance_kg: 14 })
  })

  it('bracket 1000: 60kg → 4 slice boxes, variance 8kg', () => {
    expect(getDagingBox(60)).toEqual({ slice_boxes: 4, trim_boxes: 1, variance_kg: 8 })
  })

  it('trim_boxes is always 1', () => {
    expect(getDagingBox(18).trim_boxes).toBe(1)
    expect(getDagingBox(60).trim_boxes).toBe(1)
  })
})

// ── getDalca ───────────────────────────────────────────────────────────────

describe('getDalca', () => {
  it('bracket 300: has all fields including karot and serbuk_kari', () => {
    expect(getDalca(300)).toEqual({
      kacang_dall: '1kg', terung: '2kg', kentang: '1 bag',
      karot: '10 biji', kacang_panjang: '1kg', serbuk_kari: '0.5kg',
    })
  })

  it('bracket 400: karot present, serbuk_kari is null', () => {
    const d = getDalca(400)
    expect(d.karot).toBe('3.5kg')
    expect(d.serbuk_kari).toBeNull()
  })

  it('bracket 500: karot is null, serbuk_kari present', () => {
    const d = getDalca(500)
    expect(d.karot).toBeNull()
    expect(d.serbuk_kari).toBe('1kg')
  })

  it('bracket 700: both karot and serbuk_kari are null', () => {
    const d = getDalca(700)
    expect(d.karot).toBeNull()
    expect(d.serbuk_kari).toBeNull()
  })

  it('bracket 800: complex kentang and karot strings', () => {
    const d = getDalca(800)
    expect(d.kentang).toBe('1.5 bag + kotak (4.5kg)')
    expect(d.karot).toBe('kotak (4.5kg)')
    expect(d.kacang_dall).toBe('2.5kg')
  })

  it('bracket 1000: kacang_dall at cap, serbuk_kari returns', () => {
    const d = getDalca(1000)
    expect(d.kacang_dall).toBe('3kg')
    expect(d.serbuk_kari).toBe('2kg')
    expect(d.terung).toBe('7kg')
  })

  it('non-exact pax uses bracket — pax 750 resolves to 800', () => {
    expect(getDalca(750)).toEqual(getDalca(800))
  })
})

// ── BUBUR ──────────────────────────────────────────────────────────────────

describe('BUBUR (flat — same all pax)', () => {
  it('pulut_hitam: 2kg beras pulut + 1 tin santan', () => {
    expect(BUBUR.pulut_hitam).toEqual({ beras_pulut_kg: 2, santan_tin: 1 })
  })

  it('kacang_hijau: 2kg kacang + 1 tin santan', () => {
    expect(BUBUR.kacang_hijau).toEqual({ kacang_kg: 2, santan_tin: 1 })
  })

  it('jagung: 2 beg (4kg) + 2 kotak santan', () => {
    expect(BUBUR.jagung).toEqual({ beg: 2, beras_kg: 4, santan_kotak: 2 })
  })
})

// ── getAcar ────────────────────────────────────────────────────────────────

describe('getAcar', () => {
  it('bracket 300: timun 10kg, nenas 10 biji, paceri 20 biji', () => {
    expect(getAcar(300)).toEqual({ timun_kg: 10, nenas_biji: 10, paceri_nenas_biji: 20 })
  })

  it('bracket 400: timun and nenas are null, paceri present', () => {
    expect(getAcar(400)).toEqual({ timun_kg: null, nenas_biji: null, paceri_nenas_biji: 20 })
  })

  it('bracket 500: timun 15kg, nenas 10 biji, paceri 30 biji', () => {
    expect(getAcar(500)).toEqual({ timun_kg: 15, nenas_biji: 10, paceri_nenas_biji: 30 })
  })

  it('bracket 600: timun and nenas null', () => {
    const a = getAcar(600)
    expect(a.timun_kg).toBeNull()
    expect(a.nenas_biji).toBeNull()
    expect(a.paceri_nenas_biji).toBe(35)
  })

  it('bracket 800: timun 25kg, nenas 12 biji, paceri 45 biji', () => {
    expect(getAcar(800)).toEqual({ timun_kg: 25, nenas_biji: 12, paceri_nenas_biji: 45 })
  })

  it('bracket 900: timun and nenas null, paceri 55', () => {
    const a = getAcar(900)
    expect(a.timun_kg).toBeNull()
    expect(a.paceri_nenas_biji).toBe(55)
  })

  it('bracket 1000: timun 30kg, nenas 20 biji, paceri 65 biji', () => {
    expect(getAcar(1000)).toEqual({ timun_kg: 30, nenas_biji: 20, paceri_nenas_biji: 65 })
  })

  it('non-exact pax — 850 resolves to 900', () => {
    expect(getAcar(850)).toEqual(getAcar(900))
  })
})

// ── calculateIngredients ───────────────────────────────────────────────────

describe('calculateIngredients', () => {
  it('returns null for pax above 1000', () => {
    expect(calculateIngredients(1001)).toBeNull()
    expect(calculateIngredients(5000)).toBeNull()
  })

  it('bracket 300: full result spot-check', () => {
    const r = calculateIngredients(300)!
    expect(r.bracket).toBe(300)
    expect(r.main.beras_bag).toBe(2)
    expect(r.main.daging_kg).toBe(18)
    expect(r.daging_box.slice_boxes).toBe(2)
    expect(r.daging_box.variance_kg).toBe(16)
    expect(r.dalca.kacang_dall).toBe('1kg')
    expect(r.dalca.karot).toBe('10 biji')
    expect(r.acar.timun_kg).toBe(10)
    expect(r.acar.paceri_nenas_biji).toBe(20)
    expect(r.bubur.pulut_hitam.beras_pulut_kg).toBe(2)
  })

  it('pax 350 resolves to bracket 400', () => {
    const r = calculateIngredients(350)!
    expect(r.bracket).toBe(400)
    expect(r.main.beras_bag).toBe(3)
    expect(r.acar.timun_kg).toBeNull()
  })

  it('bracket 1000: full result spot-check', () => {
    const r = calculateIngredients(1000)!
    expect(r.bracket).toBe(1000)
    expect(r.main.ayam_ekor).toBe(70)
    expect(r.daging_box.slice_boxes).toBe(4)
    expect(r.daging_box.variance_kg).toBe(8)
    expect(r.dalca.kacang_dall).toBe('3kg')
    expect(r.acar.timun_kg).toBe(30)
    expect(r.acar.paceri_nenas_biji).toBe(65)
  })

  it('bubur is always flat regardless of bracket', () => {
    const r300 = calculateIngredients(300)!
    const r1000 = calculateIngredients(1000)!
    expect(r300.bubur).toEqual(r1000.bubur)
    expect(r300.bubur.jagung).toEqual({ beg: 2, beras_kg: 4, santan_kotak: 2 })
  })
})
