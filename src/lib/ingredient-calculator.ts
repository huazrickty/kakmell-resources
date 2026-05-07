export interface MainIngredients {
  beras_bag: number
  ayam_ekor: number
  daging_kg: number
  paceri_nenas_biji: number
  oren_biji: number
  gula_liter: number
}

export interface DagingBox {
  slice_boxes: number
  trim_boxes: 1
  variance_kg: number
}

export interface DalcaIngredients {
  kacang_dall: string
  terung: string
  kentang: string
  karot: string | null
  kacang_panjang: string
  serbuk_kari: string | null
}

export interface BuburIngredients {
  pulut_hitam: { beras_pulut_kg: number; santan_tin: number }
  kacang_hijau: { kacang_kg: number; santan_tin: number }
  jagung: { beg: number; beras_kg: number; santan_kotak: number }
}

export interface AcarIngredients {
  timun_kg: number | null
  nenas_biji: number | null
  paceri_nenas_biji: number
}

export interface IngredientResult {
  bracket: number
  main: MainIngredients
  daging_box: DagingBox
  dalca: DalcaIngredients
  bubur: BuburIngredients
  acar: AcarIngredients
}

export const BRACKETS = [300, 400, 500, 600, 700, 800, 900, 1000] as const
export type Bracket = typeof BRACKETS[number]

// ── getBracket ─────────────────────────────────────────────────────────────

export function getBracket(pax: number): number {
  if (pax > 1000) return -1
  for (const b of BRACKETS) {
    if (pax <= b) return b
  }
  return -1
}

// ── Main items lookup ──────────────────────────────────────────────────────

const MAIN_TABLE: Record<Bracket, MainIngredients> = {
  300:  { beras_bag: 2,   ayam_ekor: 20, daging_kg: 18, paceri_nenas_biji: 20, oren_biji: 25, gula_liter: 10 },
  400:  { beras_bag: 3,   ayam_ekor: 28, daging_kg: 24, paceri_nenas_biji: 20, oren_biji: 30, gula_liter: 10 },
  500:  { beras_bag: 3.5, ayam_ekor: 35, daging_kg: 30, paceri_nenas_biji: 30, oren_biji: 30, gula_liter: 15 },
  600:  { beras_bag: 4,   ayam_ekor: 42, daging_kg: 36, paceri_nenas_biji: 35, oren_biji: 30, gula_liter: 20 },
  700:  { beras_bag: 4.5, ayam_ekor: 49, daging_kg: 42, paceri_nenas_biji: 40, oren_biji: 30, gula_liter: 20 },
  800:  { beras_bag: 5.5, ayam_ekor: 55, daging_kg: 48, paceri_nenas_biji: 45, oren_biji: 30, gula_liter: 25 },
  900:  { beras_bag: 6,   ayam_ekor: 65, daging_kg: 54, paceri_nenas_biji: 55, oren_biji: 35, gula_liter: 30 },
  1000: { beras_bag: 7,   ayam_ekor: 70, daging_kg: 60, paceri_nenas_biji: 65, oren_biji: 40, gula_liter: 30 },
}

export function getMainIngredients(pax: number): MainIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000 — use calculateIngredients and check for null`)
  return MAIN_TABLE[bracket as Bracket]
}

// ── Daging box calculation ─────────────────────────────────────────────────

export function getDagingBox(daging_kg: number): DagingBox {
  const slice_boxes = Math.ceil(daging_kg / 17)
  return {
    slice_boxes,
    trim_boxes: 1,
    variance_kg: slice_boxes * 17 - daging_kg,
  }
}

// ── Dalca lookup ───────────────────────────────────────────────────────────

const DALCA_TABLE: Record<Bracket, DalcaIngredients> = {
  300:  { kacang_dall: '1kg',   terung: '2kg',   kentang: '1 bag',                   karot: '10 biji',       kacang_panjang: '1kg',   serbuk_kari: '0.5kg' },
  400:  { kacang_dall: '1kg',   terung: '2.5kg', kentang: '1 bag',                   karot: '3.5kg',         kacang_panjang: '1kg',   serbuk_kari: null    },
  500:  { kacang_dall: '1.5kg', terung: '3kg',   kentang: '1 bag',                   karot: null,            kacang_panjang: '1.5kg', serbuk_kari: '1kg'   },
  600:  { kacang_dall: '2kg',   terung: '3.5kg', kentang: '1.5 bag',                 karot: null,            kacang_panjang: '1.5kg', serbuk_kari: '1kg'   },
  700:  { kacang_dall: '2kg',   terung: '4kg',   kentang: '1.5 bag',                 karot: null,            kacang_panjang: '2kg',   serbuk_kari: null    },
  800:  { kacang_dall: '2.5kg', terung: '5kg',   kentang: '1.5 bag + kotak (4.5kg)', karot: 'kotak (4.5kg)', kacang_panjang: '2kg',   serbuk_kari: null    },
  900:  { kacang_dall: '3kg',   terung: '6kg',   kentang: '2 bag',                   karot: '6kg',           kacang_panjang: '2.5kg', serbuk_kari: null    },
  1000: { kacang_dall: '3kg',   terung: '7kg',   kentang: '2 bag',                   karot: '7kg',           kacang_panjang: '3kg',   serbuk_kari: '2kg'   },
}

export function getDalca(pax: number): DalcaIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return DALCA_TABLE[bracket as Bracket]
}

// ── Bubur (flat — same all pax) ────────────────────────────────────────────

export const BUBUR: BuburIngredients = {
  pulut_hitam: { beras_pulut_kg: 2, santan_tin: 1 },
  kacang_hijau: { kacang_kg: 2, santan_tin: 1 },
  jagung:       { beg: 2, beras_kg: 4, santan_kotak: 2 },
}

// ── Acar & Paceri lookup ───────────────────────────────────────────────────

const ACAR_TABLE: Record<Bracket, AcarIngredients> = {
  300:  { timun_kg: 10,   nenas_biji: 10,   paceri_nenas_biji: 20 },
  400:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 20 },
  500:  { timun_kg: 15,   nenas_biji: 10,   paceri_nenas_biji: 30 },
  600:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 35 },
  700:  { timun_kg: 20,   nenas_biji: 10,   paceri_nenas_biji: 40 },
  800:  { timun_kg: 25,   nenas_biji: 12,   paceri_nenas_biji: 45 },
  900:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 55 },
  1000: { timun_kg: 30,   nenas_biji: 20,   paceri_nenas_biji: 65 },
}

export function getAcar(pax: number): AcarIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return ACAR_TABLE[bracket as Bracket]
}

// ── calculateIngredients ───────────────────────────────────────────────────

export function calculateIngredients(pax: number): IngredientResult | null {
  const bracket = getBracket(pax)
  if (bracket === -1) return null
  const b = bracket as Bracket
  const main = MAIN_TABLE[b]
  return {
    bracket,
    main,
    daging_box: getDagingBox(main.daging_kg),
    dalca: DALCA_TABLE[b],
    bubur: BUBUR,
    acar: ACAR_TABLE[b],
  }
}
