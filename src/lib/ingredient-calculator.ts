export interface MainIngredients {
  beras_bag: number
  ayam_ekor: number
  daging_kg: number
  oren_biji: number
  gula_liter: number
}

export interface DagingBox {
  slice_boxes: number
  trim_boxes: number
  variance_kg: number
}

export interface DalcaIngredients {
  kacang_dall: string
  terung: string
  kentang: string
  karot: string
}

export interface BuburIngredients {
  pulut_hitam:  { beras_pulut_kg: number; santan_kg: number; sagu_kg: number }
  kacang_hijau: { kacang_kg: number;      santan_kg: number; sagu_kg: number }
  jagung:       { beg: number; beras_kg: number; santan_kg: number; sagu_kg: number }
}

export interface AcarIngredients {
  timun_kg: number | null
  nenas_biji: number
}

export interface IngredientResult {
  bracket: number
  main: MainIngredients
  daging_box: DagingBox
  dalca: DalcaIngredients
  bubur: BuburIngredients
  acar: AcarIngredients
}

export const BRACKETS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const
export type Bracket = typeof BRACKETS[number]

// ── getBracket ─────────────────────────────────────────────────────────────

export function getBracket(pax: number): number {
  for (const b of BRACKETS) {
    if (pax <= b) return b
  }
  return -1
}

// ── Main items lookup ──────────────────────────────────────────────────────

const MAIN_TABLE: Record<Bracket, MainIngredients> = {
  100:  { beras_bag: 0.75, ayam_ekor: 10, daging_kg: 10, oren_biji: 20, gula_liter: 5  },
  200:  { beras_bag: 1.5,  ayam_ekor: 20, daging_kg: 20, oren_biji: 25, gula_liter: 5  },
  300:  { beras_bag: 2,    ayam_ekor: 21, daging_kg: 18, oren_biji: 25, gula_liter: 10 },
  400:  { beras_bag: 3,    ayam_ekor: 28, daging_kg: 24, oren_biji: 30, gula_liter: 10 },
  500:  { beras_bag: 3.5,  ayam_ekor: 35, daging_kg: 30, oren_biji: 30, gula_liter: 15 },
  600:  { beras_bag: 4,    ayam_ekor: 42, daging_kg: 36, oren_biji: 30, gula_liter: 15 },
  700:  { beras_bag: 4.5,  ayam_ekor: 49, daging_kg: 42, oren_biji: 30, gula_liter: 20 },
  800:  { beras_bag: 5,    ayam_ekor: 56, daging_kg: 48, oren_biji: 30, gula_liter: 20 },
  900:  { beras_bag: 6,    ayam_ekor: 63, daging_kg: 54, oren_biji: 30, gula_liter: 25 },
  1000: { beras_bag: 7,    ayam_ekor: 70, daging_kg: 60, oren_biji: 40, gula_liter: 30 },
}

export function getMainIngredients(pax: number): MainIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000 — use calculateIngredients and check for null`)
  return MAIN_TABLE[bracket as Bracket]
}

// ── Daging box lookup ──────────────────────────────────────────────────────

const DAGING_BOX_TABLE: Record<Bracket, DagingBox> = {
  100:  { slice_boxes: 1, trim_boxes: 0,   variance_kg:  7 },
  200:  { slice_boxes: 1, trim_boxes: 0,   variance_kg: -3 },
  300:  { slice_boxes: 1, trim_boxes: 0,   variance_kg: -2 },
  400:  { slice_boxes: 1, trim_boxes: 0,   variance_kg: -7 },
  500:  { slice_boxes: 1, trim_boxes: 0.5, variance_kg: -2 },
  600:  { slice_boxes: 1, trim_boxes: 0.5, variance_kg: -8 },
  700:  { slice_boxes: 2, trim_boxes: 0.5, variance_kg:  3 },
  800:  { slice_boxes: 1, trim_boxes: 1,   variance_kg: -9 },
  900:  { slice_boxes: 2, trim_boxes: 1,   variance_kg:  2 },
  1000: { slice_boxes: 2, trim_boxes: 1,   variance_kg: -4 },
}

export function getDagingBox(pax: number): DagingBox {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return DAGING_BOX_TABLE[bracket as Bracket]
}

export function getDagingBoxFromKg(daging_kg: number): DagingBox {
  const slice_boxes = Math.ceil(daging_kg / 17)
  return {
    slice_boxes,
    trim_boxes: 1,
    variance_kg: slice_boxes * 17 - daging_kg,
  }
}

// ── Dalca lookup ───────────────────────────────────────────────────────────

const DALCA_TABLE: Record<Bracket, DalcaIngredients> = {
  100:  { kacang_dall: '1kg',  terung: '0.6kg', kentang: '1/3 bag',   karot: '5 biji'  },
  200:  { kacang_dall: '1kg',  terung: '1.2kg', kentang: '1/2 bag',   karot: '5 biji'  },
  300:  { kacang_dall: '2kg',  terung: '1.8kg', kentang: '1/2 bag',   karot: '10 biji' },
  400:  { kacang_dall: '2kg',  terung: '2.4kg', kentang: '2/3 bag',   karot: '15 biji' },
  500:  { kacang_dall: '3kg',  terung: '3kg',   kentang: '1 bag',     karot: '20 biji' },
  600:  { kacang_dall: '3kg',  terung: '3.6kg', kentang: '1 1/3 bag', karot: '20 biji' },
  700:  { kacang_dall: '3kg',  terung: '4.2kg', kentang: '1 1/2 bag', karot: '20 biji' },
  800:  { kacang_dall: '3kg',  terung: '4.8kg', kentang: '1 1/2 bag', karot: '25 biji' },
  900:  { kacang_dall: '3kg',  terung: '5.4kg', kentang: '1 2/3 bag', karot: '25 biji' },
  1000: { kacang_dall: '3kg',  terung: '6kg',   kentang: '2 bag',     karot: '25 biji' },
}

export function getDalca(pax: number): DalcaIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return DALCA_TABLE[bracket as Bracket]
}

// ── Bubur (sagu added, santan in kg) ──────────────────────────────────────

export function getBuburIngredients(pax: number): BuburIngredients {
  const bracket = getBracket(pax)
  return {
    pulut_hitam:  { beras_pulut_kg: 2, santan_kg: 1, sagu_kg: 0.5 },
    kacang_hijau: { kacang_kg: 2,      santan_kg: 1, sagu_kg: 0.5 },
    jagung:       { beg: 2, beras_kg: 4, santan_kg: bracket === 1000 ? 3 : 2, sagu_kg: 1 },
  }
}

export const BUBUR: BuburIngredients = getBuburIngredients(300)

// ── Paceri Nenas lookup (nenas biji only) ──────────────────────────────────

const PACERI_TABLE: Record<Bracket, number> = {
  100: 10, 200: 15, 300: 20, 400: 25,
  500: 30, 600: 35, 700: 40, 800: 45, 900: 50, 1000: 60,
}

export function getAcar(pax: number): AcarIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return { timun_kg: null, nenas_biji: PACERI_TABLE[bracket as Bracket] }
}

// ── Pencuk (Acar Jelata) lookup ────────────────────────────────────────────

const PENCUK_TABLE: Record<Bracket, { timun_kg: number; nenas_biji: number }> = {
  100:  { timun_kg: 3,  nenas_biji: 3  },
  200:  { timun_kg: 6,  nenas_biji: 6  },
  300:  { timun_kg: 10, nenas_biji: 10 },
  400:  { timun_kg: 12, nenas_biji: 10 },
  500:  { timun_kg: 15, nenas_biji: 10 },
  600:  { timun_kg: 15, nenas_biji: 10 },
  700:  { timun_kg: 20, nenas_biji: 10 },
  800:  { timun_kg: 25, nenas_biji: 12 },
  900:  { timun_kg: 25, nenas_biji: 15 },
  1000: { timun_kg: 30, nenas_biji: 20 },
}

export function getPencuk(pax: number): AcarIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return PENCUK_TABLE[bracket as Bracket]
}

// ── calculateIngredients ───────────────────────────────────────────────────

export function calculateIngredients(pax: number, acarType?: string): IngredientResult | null {
  const bracket = getBracket(pax)
  if (bracket === -1) return null
  const b = bracket as Bracket
  const main = MAIN_TABLE[b]
  return {
    bracket,
    main,
    daging_box: getDagingBox(pax),
    dalca: DALCA_TABLE[b],
    bubur: getBuburIngredients(pax),
    acar: acarType === 'Pencuk' ? getPencuk(pax) : getAcar(pax),
  }
}
