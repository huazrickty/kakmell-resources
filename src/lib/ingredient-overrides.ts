import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { type Bracket } from '@/lib/ingredient-calculator'

export interface BracketValue {
  qty: number
  unit: string
}

export type BracketMap = Partial<Record<Bracket, BracketValue>>

export interface OverrideDoc {
  id: string
  category: 'main' | 'dalca' | 'bubur' | 'acar' | 'daging_box'
  item_name: string       // e.g. 'beras', 'ayam', 'daging'
  brackets: BracketMap
  is_flat: boolean        // true = same qty all brackets (like bubur)
  flat_qty: number        // used if is_flat = true
  flat_unit: string
  notes: string
  updated_by: string
  updated_at: Timestamp | null
}

// key = `${category}/${item_name}`, e.g. 'main/beras'
export type OverrideMap = Record<string, OverrideDoc>

// 5-minute in-memory cache
let _cache: OverrideMap | null = null
let _cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

export async function getIngredientOverrides(): Promise<OverrideMap> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache
  const snap = await getDocs(collection(db, 'ingredient_overrides'))
  const map: OverrideMap = {}
  snap.forEach((d) => {
    const data = d.data() as Omit<OverrideDoc, 'id'>
    const key = `${data.category}/${data.item_name}`
    map[key] = { ...data, id: d.id }
  })
  _cache = map
  _cacheTime = Date.now()
  return map
}

export function invalidateOverrideCache() {
  _cache = null
  _cacheTime = 0
}
