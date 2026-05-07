import {
  getBracket,
  getMainIngredients,
  getDalca,
  getAcar,
  getDagingBox,
  BUBUR,
  type Bracket,
  type IngredientResult,
  type MainIngredients,
  type DalcaIngredients,
  type BuburIngredients,
  type AcarIngredients,
} from './ingredient-calculator'
import { type OverrideMap } from './ingredient-overrides'

function applyMainOverride(
  base: MainIngredients,
  bracket: Bracket,
  ov: OverrideMap,
): MainIngredients {
  const r = { ...base }
  const fields: Array<[string, keyof MainIngredients]> = [
    ['main/beras',        'beras_bag'],
    ['main/ayam',         'ayam_ekor'],
    ['main/daging',       'daging_kg'],
    ['main/paceri_nenas', 'paceri_nenas_biji'],
    ['main/oren',         'oren_biji'],
    ['main/gula',         'gula_liter'],
  ]
  for (const [key, field] of fields) {
    const o = ov[key]
    if (o && !o.is_flat && o.brackets[bracket]) {
      r[field] = o.brackets[bracket]!.qty
    }
  }
  return r
}

function applyDalcaOverride(
  base: DalcaIngredients,
  bracket: Bracket,
  ov: OverrideMap,
): DalcaIngredients {
  const r = { ...base }

  // Non-nullable dalca fields — unit holds the display string; skip if empty
  const strFields: Array<[string, keyof Pick<DalcaIngredients, 'kacang_dall' | 'terung' | 'kentang' | 'kacang_panjang'>]> = [
    ['dalca/kacang_dall',    'kacang_dall'],
    ['dalca/terung',         'terung'],
    ['dalca/kentang',        'kentang'],
    ['dalca/kacang_panjang', 'kacang_panjang'],
  ]
  for (const [key, field] of strFields) {
    const o = ov[key]
    if (o && !o.is_flat && o.brackets[bracket]) {
      const bv = o.brackets[bracket]!
      if (bv.unit) r[field] = bv.unit
    }
  }

  // Nullable dalca fields — qty=0 means null/—; unit holds the display string
  const nullableFields: Array<[string, keyof Pick<DalcaIngredients, 'karot' | 'serbuk_kari'>]> = [
    ['dalca/karot',       'karot'],
    ['dalca/serbuk_kari', 'serbuk_kari'],
  ]
  for (const [key, field] of nullableFields) {
    const o = ov[key]
    if (o && !o.is_flat && o.brackets[bracket]) {
      const bv = o.brackets[bracket]!
      r[field] = bv.qty === 0 ? null : bv.unit
    }
  }

  return r
}

function applyAcarOverride(
  base: AcarIngredients,
  bracket: Bracket,
  ov: OverrideMap,
): AcarIngredients {
  const r = { ...base }

  const timunOv = ov['acar/timun']
  if (timunOv && !timunOv.is_flat && timunOv.brackets[bracket]) {
    const bv = timunOv.brackets[bracket]!
    r.timun_kg = bv.qty === 0 ? null : bv.qty
  }

  const nenasOv = ov['acar/nenas']
  if (nenasOv && !nenasOv.is_flat && nenasOv.brackets[bracket]) {
    const bv = nenasOv.brackets[bracket]!
    r.nenas_biji = bv.qty === 0 ? null : bv.qty
  }

  const paceriOv = ov['acar/paceri_nenas']
  if (paceriOv && !paceriOv.is_flat && paceriOv.brackets[bracket]) {
    r.paceri_nenas_biji = paceriOv.brackets[bracket]!.qty
  }

  return r
}

function applyBuburOverride(
  base: BuburIngredients,
  ov: OverrideMap,
): BuburIngredients {
  const r: BuburIngredients = {
    pulut_hitam: { ...base.pulut_hitam },
    kacang_hijau: { ...base.kacang_hijau },
    jagung: { ...base.jagung },
  }

  const flat = (key: string): number | null => {
    const o = ov[key]
    return o?.is_flat ? o.flat_qty : null
  }

  const ph_beras   = flat('bubur/pulut_hitam_beras')
  if (ph_beras   !== null) r.pulut_hitam.beras_pulut_kg = ph_beras
  const ph_santan  = flat('bubur/pulut_hitam_santan')
  if (ph_santan  !== null) r.pulut_hitam.santan_tin     = ph_santan
  const kh_kacang  = flat('bubur/kacang_hijau_kacang')
  if (kh_kacang  !== null) r.kacang_hijau.kacang_kg     = kh_kacang
  const kh_santan  = flat('bubur/kacang_hijau_santan')
  if (kh_santan  !== null) r.kacang_hijau.santan_tin    = kh_santan
  const jag_beg    = flat('bubur/jagung_beg')
  if (jag_beg    !== null) r.jagung.beg                 = jag_beg
  const jag_beras  = flat('bubur/jagung_beras')
  if (jag_beras  !== null) r.jagung.beras_kg             = jag_beras
  const jag_santan = flat('bubur/jagung_santan')
  if (jag_santan !== null) r.jagung.santan_kotak         = jag_santan

  return r
}

export function calculateIngredientsWithOverrides(
  pax: number,
  overrides: OverrideMap,
): IngredientResult | null {
  const bracket = getBracket(pax)
  if (bracket === -1) return null
  const b = bracket as Bracket

  const main = applyMainOverride(getMainIngredients(pax), b, overrides)

  return {
    bracket,
    main,
    daging_box: getDagingBox(main.daging_kg),
    dalca:      applyDalcaOverride(getDalca(pax), b, overrides),
    bubur:      applyBuburOverride(BUBUR, overrides),
    acar:       applyAcarOverride(getAcar(pax), b, overrides),
  }
}
