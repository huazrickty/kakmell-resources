// ============================================================
// KAKMELL RESOURCES — Ingredient Calculator
// Uses lookup table approach (NOT linear interpolation)
// ============================================================

export const PAX_BRACKETS = [300, 400, 500, 600, 700, 800, 900, 1000] as const
export type PaxBracket = typeof PAX_BRACKETS[number]

export interface MenuSelection {
  nasi: 'nasi_briyani' | 'nasi_minyak' | 'nasi_jagung'
  ayam: 'ayam_masak_merah'
  daging: 'daging_briyani' | 'daging_black_pepper' | 'daging_masak_hitam' | 'daging_kuzi' | 'daging_masak_kurma'
  acar: 'paceri_nenas' | 'pencuk'
  bubur: 'bubur_pulut_hitam' | 'bubur_kacang_hijau' | 'bubur_jagung'
  kuih: string[]  // 2 items from kuih list
}

export interface Ingredient {
  name: string
  qty: number | string
  unit: string
  note?: string
  workings?: string  // e.g. "500 pax → bracket 500 → 3.5 bag"
}

export interface DagingBoxResult {
  sliceBoxes: number
  trimmingBoxes: number
  sliceRawKg: number
  sliceVarianceKg: number  // positive = lebih, negative = kurang
  workings: string
}

export interface IngredientList {
  paxBracket: number
  main: Ingredient[]
  dalca: Ingredient[]
  bubur: Ingredient[]
  acorPaceri: Ingredient[]
  dagingBoxes: DagingBoxResult
  warning?: string  // e.g. "pax > 1000, custom calculation needed"
}

// ============================================================
// LOOKUP TABLES — exact values from CLAUDE.md, do not change
// ============================================================

type MainRow = {
  berasBag: number
  ayamEkor: number
  dagingKg: number
  nenasBiji: number
  orenBiji: number
  gulaL: number
}

const MAIN_LOOKUP: Record<PaxBracket, MainRow> = {
  300:  { berasBag: 2,   ayamEkor: 20, dagingKg: 18, nenasBiji: 20, orenBiji: 25, gulaL: 10 },
  400:  { berasBag: 3,   ayamEkor: 28, dagingKg: 24, nenasBiji: 25, orenBiji: 30, gulaL: 10 },
  500:  { berasBag: 3.5, ayamEkor: 35, dagingKg: 30, nenasBiji: 35, orenBiji: 30, gulaL: 15 },
  600:  { berasBag: 4,   ayamEkor: 42, dagingKg: 36, nenasBiji: 40, orenBiji: 30, gulaL: 20 },
  700:  { berasBag: 4.5, ayamEkor: 50, dagingKg: 42, nenasBiji: 45, orenBiji: 30, gulaL: 20 },
  800:  { berasBag: 5.5, ayamEkor: 55, dagingKg: 48, nenasBiji: 50, orenBiji: 30, gulaL: 25 },
  900:  { berasBag: 6,   ayamEkor: 65, dagingKg: 54, nenasBiji: 60, orenBiji: 35, gulaL: 30 },
  1000: { berasBag: 7,   ayamEkor: 70, dagingKg: 60, nenasBiji: 70, orenBiji: 40, gulaL: 30 },
}

type DalcaRow = {
  kacangDall: string
  terung: string
  kentang: string
  karot: string | null
  kacangPanjang: string
  serbukKari: string | null
}

const DALCA_LOOKUP: Record<PaxBracket, DalcaRow> = {
  300:  { kacangDall: '1 kg',     terung: '2 kg',   kentang: '1 bag',           karot: '10 biji', kacangPanjang: '1 kg',   serbukKari: '0.5 kg' },
  400:  { kacangDall: '1 kg',     terung: '2.5 kg', kentang: '1 bag',           karot: '3.5 kg',  kacangPanjang: '1 kg',   serbukKari: null },
  500:  { kacangDall: '1.5 kg',   terung: '3 kg',   kentang: '1 bag',           karot: null,      kacangPanjang: '1.5 kg', serbukKari: '1 kg' },
  600:  { kacangDall: '2 kg',     terung: '3.5 kg', kentang: '1.5 bag',         karot: null,      kacangPanjang: '1.5 kg', serbukKari: '1 kg' },
  700:  { kacangDall: '2 kg',     terung: '4 kg',   kentang: '1.5 bag',         karot: null,      kacangPanjang: '2 kg',   serbukKari: null },
  800:  { kacangDall: '2.5 kg',   terung: '5 kg',   kentang: '1.5 bag + kotak (4.5 kg)', karot: 'kotak 4.5 kg', kacangPanjang: '2 kg', serbukKari: null },
  900:  { kacangDall: '3 kg',     terung: '6 kg',   kentang: '2 bag',           karot: '6 kg',    kacangPanjang: '2.5 kg', serbukKari: null },
  1000: { kacangDall: '3 kg (CAP)', terung: '7 kg', kentang: '2 bag',           karot: '7 kg',    kacangPanjang: '3 kg',   serbukKari: '2 kg' },
}

type BuburRow = {
  pulutHitamKg: number
  santanTin: number
  kacangHijauKg: number
  buburJagungKg: number
}

const BUBUR_LOOKUP: Record<PaxBracket, BuburRow> = {
  300:  { pulutHitamKg: 1.5, santanTin: 1, kacangHijauKg: 1.5, buburJagungKg: 2 },
  400:  { pulutHitamKg: 2,   santanTin: 1, kacangHijauKg: 2,   buburJagungKg: 3 },
  500:  { pulutHitamKg: 2,   santanTin: 1, kacangHijauKg: 2,   buburJagungKg: 4 },
  600:  { pulutHitamKg: 2,   santanTin: 1, kacangHijauKg: 2,   buburJagungKg: 5 },
  700:  { pulutHitamKg: 2,   santanTin: 1, kacangHijauKg: 2,   buburJagungKg: 6 },
  800:  { pulutHitamKg: 3,   santanTin: 2, kacangHijauKg: 3,   buburJagungKg: 7 },
  900:  { pulutHitamKg: 3,   santanTin: 2, kacangHijauKg: 3,   buburJagungKg: 8 },
  1000: { pulutHitamKg: 4,   santanTin: 2, kacangHijauKg: 3,   buburJagungKg: 10 },
}

type AcarRow = {
  timunKg: number | null
  nenasAcarBiji: number | null
  paceriNenasBiji: number | null
}

// Acar has some gaps (—), use null for missing brackets, caller interpolates to nearest available
const ACAR_LOOKUP: Partial<Record<PaxBracket, AcarRow>> = {
  300:  { timunKg: 10,   nenasAcarBiji: 10, paceriNenasBiji: 20 },
  400:  { timunKg: null, nenasAcarBiji: null, paceriNenasBiji: 25 },
  500:  { timunKg: 15,   nenasAcarBiji: 10, paceriNenasBiji: 35 },
  600:  { timunKg: null, nenasAcarBiji: null, paceriNenasBiji: 40 },
  700:  { timunKg: 20,   nenasAcarBiji: 10, paceriNenasBiji: 45 },
  800:  { timunKg: 25,   nenasAcarBiji: 12, paceriNenasBiji: 50 },
  900:  { timunKg: null, nenasAcarBiji: null, paceriNenasBiji: null },  // not in table, skip
  1000: { timunKg: 30,   nenasAcarBiji: 20, paceriNenasBiji: 70 },
}

// ============================================================
// getBracket — round UP to nearest pax bracket
// ============================================================
export function getBracket(pax: number): { bracket: PaxBracket; warning?: string } {
  if (pax > 1000) {
    return { bracket: 1000, warning: `Pax ${pax} melebihi 1000 — perlu kiraan khas (custom calculation needed)` }
  }
  for (const bracket of PAX_BRACKETS) {
    if (pax <= bracket) {
      return { bracket }
    }
  }
  return { bracket: 1000 }
}

// ============================================================
// calculateDagingBoxes
// ============================================================
export function calculateDagingBoxes(dagingKg: number): DagingBoxResult {
  // Slice box = 17kg raw → 10-11kg after boiling
  const sliceBoxes = Math.ceil(dagingKg / 17)
  const sliceRawKg = sliceBoxes * 17
  const sliceVarianceKg = sliceRawKg - dagingKg  // positive = lebih, buy this many extra kg
  const trimmingBoxes = 1  // fixed cap regardless of pax

  const workings = [
    `Daging diperlukan: ${dagingKg} kg`,
    `Slice box: ceil(${dagingKg} ÷ 17) = ${sliceBoxes} kotak (${sliceRawKg} kg raw, ${sliceVarianceKg >= 0 ? '+' : ''}${sliceVarianceKg.toFixed(1)} kg variance)`,
    `Trimming box: 1 kotak (tetap, tidak kira pax)`,
  ].join('\n')

  return { sliceBoxes, trimmingBoxes, sliceRawKg, sliceVarianceKg, workings }
}

// ============================================================
// calculateIngredients — main entry point
// ============================================================
export function calculateIngredients(pax: number, menuSelection: MenuSelection): IngredientList {
  const { bracket, warning } = getBracket(pax)
  const mainData = MAIN_LOOKUP[bracket]
  const dalcaData = DALCA_LOOKUP[bracket]
  const buburData = BUBUR_LOOKUP[bracket]

  const workingNote = (label: string, val: number | string, unit: string) =>
    `${pax} pax → bracket ${bracket} → ${val} ${unit}`

  // Main ingredients
  const main: Ingredient[] = [
    {
      name: 'Beras Basmati',
      qty: mainData.berasBag,
      unit: 'bag',
      workings: workingNote('Beras', mainData.berasBag, 'bag'),
    },
    {
      name: 'Ayam',
      qty: mainData.ayamEkor,
      unit: 'ekor',
      workings: workingNote('Ayam', mainData.ayamEkor, 'ekor'),
    },
    {
      name: 'Daging',
      qty: mainData.dagingKg,
      unit: 'kg',
      workings: workingNote('Daging', mainData.dagingKg, 'kg'),
    },
    {
      name: 'Nenas / Paceri',
      qty: mainData.nenasBiji,
      unit: 'biji',
      workings: workingNote('Nenas', mainData.nenasBiji, 'biji'),
    },
    {
      name: 'Oren',
      qty: mainData.orenBiji,
      unit: 'biji',
      workings: workingNote('Oren', mainData.orenBiji, 'biji'),
    },
    {
      name: 'Gula / Air',
      qty: mainData.gulaL,
      unit: 'L',
      workings: workingNote('Gula', mainData.gulaL, 'L'),
    },
  ]

  // Dalca ingredients
  const dalca: Ingredient[] = [
    { name: 'Kacang Dall', qty: dalcaData.kacangDall, unit: '' },
    { name: 'Terung', qty: dalcaData.terung, unit: '' },
    { name: 'Kentang', qty: dalcaData.kentang, unit: '' },
    ...(dalcaData.karot ? [{ name: 'Karot', qty: dalcaData.karot, unit: '' }] : []),
    { name: 'Kacang Panjang', qty: dalcaData.kacangPanjang, unit: '' },
    ...(dalcaData.serbukKari ? [{ name: 'Serbuk Kari', qty: dalcaData.serbukKari, unit: '' }] : []),
  ]

  // Bubur — only show relevant item based on menu selection
  const buburMap: Record<MenuSelection['bubur'], Ingredient[]> = {
    bubur_pulut_hitam: [
      { name: 'Pulut Hitam', qty: buburData.pulutHitamKg, unit: 'kg' },
      { name: 'Santan', qty: buburData.santanTin, unit: 'tin' },
    ],
    bubur_kacang_hijau: [
      { name: 'Kacang Hijau', qty: buburData.kacangHijauKg, unit: 'kg' },
      { name: 'Santan', qty: buburData.santanTin, unit: 'tin' },
    ],
    bubur_jagung: [
      { name: 'Jagung (Bubur)', qty: buburData.buburJagungKg, unit: 'kg' },
      { name: 'Santan', qty: buburData.santanTin, unit: 'tin' },
    ],
  }
  const bubur = buburMap[menuSelection.bubur]

  // Acar / Paceri — based on menu selection
  const acarData = ACAR_LOOKUP[bracket]
  const acorPaceri: Ingredient[] = []

  if (menuSelection.acar === 'paceri_nenas') {
    const paceriBiji = acarData?.paceriNenasBiji ?? MAIN_LOOKUP[bracket].nenasBiji
    acorPaceri.push({ name: 'Nenas (Paceri)', qty: paceriBiji ?? 0, unit: 'biji' })
  } else if (menuSelection.acar === 'pencuk') {
    // Pencuk uses timun
    if (acarData?.timunKg != null) {
      acorPaceri.push({ name: 'Timun (Acar)', qty: acarData.timunKg, unit: 'kg' })
    }
    if (acarData?.nenasAcarBiji != null) {
      acorPaceri.push({ name: 'Nenas (Acar)', qty: acarData.nenasAcarBiji, unit: 'biji' })
    }
  }

  const dagingBoxes = calculateDagingBoxes(mainData.dagingKg)

  return {
    paxBracket: bracket,
    main,
    dalca,
    bubur,
    acorPaceri,
    dagingBoxes,
    warning,
  }
}
