import { describe, it, expect } from 'vitest'
import {
  getBracket,
  getMainIngredients,
  getDagingBox,
  getDagingBoxFromKg,
  getDalca,
  getBuburIngredients,
  BUBUR,
  getAcar,
  getPencuk,
  calculateIngredients,
} from './ingredient-calculator'

// ── getBracket ─────────────────────────────────────────────────────────────

describe('getBracket', () => {
  it('maps any pax ≤ 100 to 100', () => {
    expect(getBracket(1)).toBe(100)
    expect(getBracket(50)).toBe(100)
    expect(getBracket(100)).toBe(100)
  })

  it('maps exact bracket values to themselves', () => {
    expect(getBracket(100)).toBe(100)
    expect(getBracket(200)).toBe(200)
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
    expect(getBracket(101)).toBe(200)
    expect(getBracket(150)).toBe(200)
    expect(getBracket(201)).toBe(300)
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
  it('bracket 100: returns correct values', () => {
    expect(getMainIngredients(100)).toEqual({
      beras_bag: 0.75, ayam_ekor: 10, daging_kg: 10, oren_biji: 20, gula_liter: 5,
    })
  })

  it('bracket 200: returns correct values', () => {
    expect(getMainIngredients(200)).toEqual({
      beras_bag: 1.5, ayam_ekor: 20, daging_kg: 20, oren_biji: 25, gula_liter: 5,
    })
  })

  it('bracket 300: returns correct values', () => {
    expect(getMainIngredients(300)).toEqual({
      beras_bag: 2, ayam_ekor: 21, daging_kg: 18, oren_biji: 25, gula_liter: 10,
    })
  })

  it('bracket 500: fractional beras', () => {
    expect(getMainIngredients(500)).toEqual({
      beras_bag: 3.5, ayam_ekor: 35, daging_kg: 30, oren_biji: 30, gula_liter: 15,
    })
  })

  it('bracket 800: correct values', () => {
    expect(getMainIngredients(800)).toEqual({
      beras_bag: 5, ayam_ekor: 56, daging_kg: 48, oren_biji: 30, gula_liter: 20,
    })
  })

  it('bracket 1000: correct values', () => {
    expect(getMainIngredients(1000)).toEqual({
      beras_bag: 7, ayam_ekor: 70, daging_kg: 60, oren_biji: 40, gula_liter: 30,
    })
  })

  it('pax 150 resolves to bracket 200', () => {
    expect(getMainIngredients(150)).toEqual(getMainIngredients(200))
  })

  it('pax 350 resolves to bracket 400', () => {
    expect(getMainIngredients(350)).toEqual(getMainIngredients(400))
  })

  it('does not have paceri_nenas_biji field', () => {
    const m = getMainIngredients(300)
    expect('paceri_nenas_biji' in m).toBe(false)
  })
})

// ── getDagingBox (lookup) ──────────────────────────────────────────────────

describe('getDagingBox', () => {
  it('bracket 100: 1 slice, 0 trim, +7 variance', () => {
    expect(getDagingBox(100)).toEqual({ slice_boxes: 1, trim_boxes: 0, variance_kg: 7 })
  })

  it('bracket 300: 1 slice, 0 trim, -2 variance', () => {
    expect(getDagingBox(300)).toEqual({ slice_boxes: 1, trim_boxes: 0, variance_kg: -2 })
  })

  it('bracket 500: 1 slice, 0.5 trim', () => {
    expect(getDagingBox(500)).toEqual({ slice_boxes: 1, trim_boxes: 0.5, variance_kg: -2 })
  })

  it('bracket 700: 2 slice, 0.5 trim, +3 variance', () => {
    expect(getDagingBox(700)).toEqual({ slice_boxes: 2, trim_boxes: 0.5, variance_kg: 3 })
  })

  it('bracket 800: 1 slice, 1 trim', () => {
    expect(getDagingBox(800)).toEqual({ slice_boxes: 1, trim_boxes: 1, variance_kg: -9 })
  })

  it('bracket 900: 2 slice, 1 trim, +2 variance', () => {
    expect(getDagingBox(900)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 2 })
  })

  it('bracket 1000: 2 slice, 1 trim, -4 variance', () => {
    expect(getDagingBox(1000)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: -4 })
  })

  it('non-exact pax uses bracket — pax 750 resolves to 800', () => {
    expect(getDagingBox(750)).toEqual(getDagingBox(800))
  })
})

// ── getDagingBoxFromKg (formula) ───────────────────────────────────────────

describe('getDagingBoxFromKg', () => {
  it('18kg → 2 slice boxes, trim 1, variance 16', () => {
    expect(getDagingBoxFromKg(18)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 16 })
  })

  it('17kg → 1 slice box, trim 1, variance 0', () => {
    expect(getDagingBoxFromKg(17)).toEqual({ slice_boxes: 1, trim_boxes: 1, variance_kg: 0 })
  })

  it('34kg → 2 slice boxes, trim 1, variance 0', () => {
    expect(getDagingBoxFromKg(34)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 0 })
  })

  it('60kg → 4 slice boxes, trim 1, variance 8', () => {
    expect(getDagingBoxFromKg(60)).toEqual({ slice_boxes: 4, trim_boxes: 1, variance_kg: 8 })
  })
})

// ── getDalca ───────────────────────────────────────────────────────────────

describe('getDalca', () => {
  it('bracket 100: correct values, 4 fields only', () => {
    expect(getDalca(100)).toEqual({
      kacang_dall: '1kg', terung: '0.6kg', kentang: '1/3 bag', karot: '5 biji',
    })
  })

  it('bracket 200: correct values', () => {
    expect(getDalca(200)).toEqual({
      kacang_dall: '1kg', terung: '1.2kg', kentang: '1/2 bag', karot: '5 biji',
    })
  })

  it('bracket 300: correct values', () => {
    expect(getDalca(300)).toEqual({
      kacang_dall: '2kg', terung: '1.8kg', kentang: '1/2 bag', karot: '10 biji',
    })
  })

  it('bracket 500: 1 bag kentang, 20 biji karot', () => {
    const d = getDalca(500)
    expect(d.kentang).toBe('1 bag')
    expect(d.karot).toBe('20 biji')
  })

  it('bracket 700: 1 1/2 bag kentang, 20 biji karot', () => {
    const d = getDalca(700)
    expect(d.kentang).toBe('1 1/2 bag')
    expect(d.karot).toBe('20 biji')
  })

  it('bracket 1000: 2 bag kentang, 25 biji karot, 3kg kacang dall', () => {
    const d = getDalca(1000)
    expect(d.kentang).toBe('2 bag')
    expect(d.karot).toBe('25 biji')
    expect(d.kacang_dall).toBe('3kg')
  })

  it('does not have kacang_panjang or serbuk_kari', () => {
    const d = getDalca(300)
    expect('kacang_panjang' in d).toBe(false)
    expect('serbuk_kari' in d).toBe(false)
  })

  it('karot is always a non-null string', () => {
    for (const pax of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
      expect(typeof getDalca(pax).karot).toBe('string')
    }
  })

  it('non-exact pax uses bracket — pax 750 resolves to 800', () => {
    expect(getDalca(750)).toEqual(getDalca(800))
  })
})

// ── getBuburIngredients ────────────────────────────────────────────────────

describe('getBuburIngredients', () => {
  it('pulut_hitam: 2kg beras + 1kg santan + 0.5kg sagu (all pax)', () => {
    expect(getBuburIngredients(300).pulut_hitam).toEqual({ beras_pulut_kg: 2, santan_kg: 1, sagu_kg: 0.5 })
    expect(getBuburIngredients(1000).pulut_hitam).toEqual({ beras_pulut_kg: 2, santan_kg: 1, sagu_kg: 0.5 })
  })

  it('kacang_hijau: 2kg kacang + 1kg santan + 0.5kg sagu (all pax)', () => {
    expect(getBuburIngredients(300).kacang_hijau).toEqual({ kacang_kg: 2, santan_kg: 1, sagu_kg: 0.5 })
    expect(getBuburIngredients(1000).kacang_hijau).toEqual({ kacang_kg: 2, santan_kg: 1, sagu_kg: 0.5 })
  })

  it('jagung: 2 beg, 4kg beras, 1kg sagu for pax < 1000', () => {
    const j = getBuburIngredients(500).jagung
    expect(j.beg).toBe(2)
    expect(j.beras_kg).toBe(4)
    expect(j.santan_kg).toBe(2)
    expect(j.sagu_kg).toBe(1)
  })

  it('jagung santan increases to 3kg at bracket 1000', () => {
    expect(getBuburIngredients(1000).jagung.santan_kg).toBe(3)
  })

  it('pax 999 rounds up to bracket 1000, jagung santan = 3kg', () => {
    expect(getBuburIngredients(999).jagung.santan_kg).toBe(3)
  })

  it('pax 900 bracket gets jagung santan = 2kg', () => {
    expect(getBuburIngredients(900).jagung.santan_kg).toBe(2)
  })
})

describe('BUBUR constant', () => {
  it('matches getBuburIngredients for a non-1000-pax bracket', () => {
    expect(BUBUR).toEqual(getBuburIngredients(300))
  })

  it('uses santan_kg field (not santan_tin or santan_kotak)', () => {
    expect('santan_kg' in BUBUR.pulut_hitam).toBe(true)
    expect('santan_tin' in BUBUR.pulut_hitam).toBe(false)
    expect('santan_kg' in BUBUR.jagung).toBe(true)
    expect('santan_kotak' in BUBUR.jagung).toBe(false)
  })

  it('has sagu_kg in all three sub-objects', () => {
    expect(BUBUR.pulut_hitam.sagu_kg).toBe(0.5)
    expect(BUBUR.kacang_hijau.sagu_kg).toBe(0.5)
    expect(BUBUR.jagung.sagu_kg).toBe(1)
  })
})

// ── getAcar (Paceri Nenas) ─────────────────────────────────────────────────

describe('getAcar', () => {
  it('always returns timun_kg: null', () => {
    expect(getAcar(100).timun_kg).toBeNull()
    expect(getAcar(500).timun_kg).toBeNull()
    expect(getAcar(1000).timun_kg).toBeNull()
  })

  it('bracket 100: 10 biji', () => {
    expect(getAcar(100)).toEqual({ timun_kg: null, nenas_biji: 10 })
  })

  it('bracket 200: 15 biji', () => {
    expect(getAcar(200)).toEqual({ timun_kg: null, nenas_biji: 15 })
  })

  it('bracket 300: 20 biji', () => {
    expect(getAcar(300)).toEqual({ timun_kg: null, nenas_biji: 20 })
  })

  it('bracket 500: 30 biji', () => {
    expect(getAcar(500)).toEqual({ timun_kg: null, nenas_biji: 30 })
  })

  it('bracket 800: 45 biji', () => {
    expect(getAcar(800)).toEqual({ timun_kg: null, nenas_biji: 45 })
  })

  it('bracket 1000: 60 biji', () => {
    expect(getAcar(1000)).toEqual({ timun_kg: null, nenas_biji: 60 })
  })

  it('non-exact pax — 850 resolves to 900', () => {
    expect(getAcar(850)).toEqual(getAcar(900))
  })
})

// ── getPencuk ──────────────────────────────────────────────────────────────

describe('getPencuk', () => {
  it('bracket 100: timun 3kg, nenas 3 biji', () => {
    expect(getPencuk(100)).toEqual({ timun_kg: 3, nenas_biji: 3 })
  })

  it('bracket 200: timun 6kg, nenas 6 biji', () => {
    expect(getPencuk(200)).toEqual({ timun_kg: 6, nenas_biji: 6 })
  })

  it('bracket 300: timun 10kg, nenas 10 biji', () => {
    expect(getPencuk(300)).toEqual({ timun_kg: 10, nenas_biji: 10 })
  })

  it('bracket 500: timun 15kg, nenas 10 biji', () => {
    expect(getPencuk(500)).toEqual({ timun_kg: 15, nenas_biji: 10 })
  })

  it('bracket 1000: timun 30kg, nenas 20 biji', () => {
    expect(getPencuk(1000)).toEqual({ timun_kg: 30, nenas_biji: 20 })
  })

  it('bracket 900: timun 25kg, nenas 15 biji', () => {
    expect(getPencuk(900)).toEqual({ timun_kg: 25, nenas_biji: 15 })
  })

  it('non-exact pax — 850 resolves to 900', () => {
    expect(getPencuk(850)).toEqual({ timun_kg: 25, nenas_biji: 15 })
  })

  it('always has timun_kg (never null)', () => {
    expect(getPencuk(100).timun_kg).not.toBeNull()
    expect(getPencuk(800).timun_kg).not.toBeNull()
  })
})

// ── calculateIngredients ───────────────────────────────────────────────────

describe('calculateIngredients', () => {
  it('returns non-null even for very small pax (now bracket 100)', () => {
    expect(calculateIngredients(1)).not.toBeNull()
    expect(calculateIngredients(50)).not.toBeNull()
  })

  it('returns null for pax above 1000', () => {
    expect(calculateIngredients(1001)).toBeNull()
    expect(calculateIngredients(5000)).toBeNull()
  })

  it('bracket 100: full result spot-check', () => {
    const r = calculateIngredients(100)!
    expect(r.bracket).toBe(100)
    expect(r.main.beras_bag).toBe(0.75)
    expect(r.main.daging_kg).toBe(10)
    expect(r.daging_box.slice_boxes).toBe(1)
    expect(r.daging_box.trim_boxes).toBe(0)
    expect(r.daging_box.variance_kg).toBe(7)
    expect(r.dalca.kacang_dall).toBe('1kg')
    expect(r.dalca.karot).toBe('5 biji')
    expect(r.acar.timun_kg).toBeNull()
    expect(r.acar.nenas_biji).toBe(10)
    expect(r.bubur.pulut_hitam.sagu_kg).toBe(0.5)
  })

  it('bracket 300: spot-check', () => {
    const r = calculateIngredients(300)!
    expect(r.bracket).toBe(300)
    expect(r.main.beras_bag).toBe(2)
    expect(r.main.ayam_ekor).toBe(21)
    expect(r.daging_box).toEqual({ slice_boxes: 1, trim_boxes: 0, variance_kg: -2 })
    expect(r.dalca.karot).toBe('10 biji')
    expect(r.acar.nenas_biji).toBe(20)
  })

  it('pax 150 resolves to bracket 200', () => {
    const r = calculateIngredients(150)!
    expect(r.bracket).toBe(200)
    expect(r.main.beras_bag).toBe(1.5)
  })

  it('bracket 1000: full result spot-check', () => {
    const r = calculateIngredients(1000)!
    expect(r.bracket).toBe(1000)
    expect(r.main.ayam_ekor).toBe(70)
    expect(r.daging_box).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: -4 })
    expect(r.dalca.kacang_dall).toBe('3kg')
    expect(r.acar.nenas_biji).toBe(60)
    expect(r.bubur.jagung.santan_kg).toBe(3)
  })

  it('acarType Pencuk uses Pencuk table', () => {
    const r = calculateIngredients(500, 'Pencuk')!
    expect(r.acar).toEqual({ timun_kg: 15, nenas_biji: 10 })
  })

  it('acarType Pencuk at 100 pax: timun 3kg, nenas 3 biji', () => {
    const r = calculateIngredients(100, 'Pencuk')!
    expect(r.acar.timun_kg).toBe(3)
    expect(r.acar.nenas_biji).toBe(3)
  })

  it('default (no acarType) uses Paceri Nenas', () => {
    const r = calculateIngredients(500)!
    expect(r.acar.timun_kg).toBeNull()
    expect(r.acar.nenas_biji).toBe(30)
  })

  it('bubur includes sagu and uses santan_kg', () => {
    const r = calculateIngredients(300)!
    expect(r.bubur.pulut_hitam.santan_kg).toBe(1)
    expect(r.bubur.pulut_hitam.sagu_kg).toBe(0.5)
    expect(r.bubur.jagung.santan_kg).toBe(2)
    expect(r.bubur.jagung.sagu_kg).toBe(1)
  })

  it('bubur jagung santan is 3kg only at bracket 1000', () => {
    const r900  = calculateIngredients(900)!
    const r1000 = calculateIngredients(1000)!
    expect(r900.bubur.jagung.santan_kg).toBe(2)
    expect(r1000.bubur.jagung.santan_kg).toBe(3)
  })
})
