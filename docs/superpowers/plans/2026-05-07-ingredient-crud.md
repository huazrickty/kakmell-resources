# Ingredient CRUD System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-configurable ingredient overrides that layer on top of hardcoded lookup tables, with a settings UI to view and edit per-bracket quantities.

**Architecture:** Hybrid — `src/lib/ingredient-calculator.ts` hardcoded tables remain the default/offline source of truth; `ingredient_overrides` Firestore collection stores per-item, per-bracket customizations; a new dynamic calculator merges both at calculation time with overrides winning.

**Tech Stack:** React 18, TypeScript, Firestore SDK v9, Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts)

---

## Already Completed (do not redo)

- `firestore.rules` — rules for `ingredient_overrides` + `activity_log` ✓
- `src/lib/ingredient-overrides.ts` — `OverrideDoc`, `OverrideMap`, `getIngredientOverrides()`, `invalidateOverrideCache()` ✓

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/ingredient-calculator-dynamic.ts` | **Create** | Merges hardcoded defaults with Firestore overrides |
| `src/pages/settings/IngredientsSettings.tsx` | **Create** | Admin UI — editable ingredient tables per category |
| `src/pages/Settings.tsx` | **Modify** | Add `'ingredients'` tab to TABS array |
| `src/pages/Ingredients.tsx` | **Modify** | Fetch overrides on mount, use dynamic calculator |
| `src/pages/events/EventDetail.tsx` | **Modify** | Fetch overrides on mount, use dynamic calculator |

---

## Key Data Conventions

**Override document ID:** `{category}_{item_name}` — e.g. `main_beras`, `dalca_terung`, `bubur_jagung_beg`

**Override map key:** `{category}/{item_name}` — e.g. `main/beras` (set by `getIngredientOverrides()` which already uses `${data.category}/${data.item_name}`)

**Dalca override encoding:** `qty=0` means null/—, `unit` holds the full display string (e.g. `"1.5 bag"`). Numeric `qty` field is unused for dalca display (only unit matters).

**Acar override encoding:** `qty=0` means null/—, `qty>0` is the numeric value.

**Bubur items:** always `is_flat: true`, `flat_qty` + `flat_unit`. Seven separate override docs, one per bubur sub-field.

---

## Task 1 — Create `src/lib/ingredient-calculator-dynamic.ts`

**Files:**
- Create: `src/lib/ingredient-calculator-dynamic.ts`

- [ ] **Step 1: Create the file with the full implementation**

```typescript
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
  const fields: Array<[string, keyof DalcaIngredients]> = [
    ['dalca/kacang_dall',    'kacang_dall'],
    ['dalca/terung',         'terung'],
    ['dalca/kentang',        'kentang'],
    ['dalca/karot',          'karot'],
    ['dalca/kacang_panjang', 'kacang_panjang'],
    ['dalca/serbuk_kari',    'serbuk_kari'],
  ]
  for (const [key, field] of fields) {
    const o = ov[key]
    if (o && !o.is_flat && o.brackets[bracket]) {
      const bv = o.brackets[bracket]!
      // qty=0 means null/—; unit holds the full display string
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
```

- [ ] **Step 2: Run TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```
git add src/lib/ingredient-calculator-dynamic.ts
git commit -m "feat: add dynamic ingredient calculator with override support"
```

---

## Task 2 — Update `src/pages/Ingredients.tsx`

**Files:**
- Modify: `src/pages/Ingredients.tsx`

- [ ] **Step 1: Add imports at the top of the file** (after existing imports)

```tsx
import { useState, useEffect } from 'react'   // useState already imported; add useEffect
import { getIngredientOverrides, type OverrideMap } from '@/lib/ingredient-overrides'
import { calculateIngredientsWithOverrides } from '@/lib/ingredient-calculator-dynamic'
```

Note: `useState` is already imported. Only add `useEffect` to the existing import. Add the two new import lines.

- [ ] **Step 2: Add overrides state and fetch inside `Ingredients()` function**

Find this block in the function body (after `const isAdmin = ...`):
```tsx
const upcoming = events
  .filter((e) => e.status === 'upcoming')
  .map((e) => ({ event: e, ingr: calculateIngredients(e.pax) }))
```

Replace it with:
```tsx
const [overrides, setOverrides] = useState<OverrideMap>({})

useEffect(() => {
  getIngredientOverrides().then(setOverrides).catch(() => {})
}, [])

const upcoming = events
  .filter((e) => e.status === 'upcoming')
  .map((e) => ({ event: e, ingr: calculateIngredientsWithOverrides(e.pax, overrides) }))
```

- [ ] **Step 3: Remove unused import**

Remove `calculateIngredients` from the import line at the top:
```tsx
// Before:
import {
  calculateIngredients,
  type IngredientResult,
  ...
} from '@/lib/ingredient-calculator'

// After:
import {
  type IngredientResult,
  type MainIngredients,
  type DagingBox,
  type DalcaIngredients,
  type AcarIngredients,
} from '@/lib/ingredient-calculator'
```

- [ ] **Step 4: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/pages/Ingredients.tsx
git commit -m "feat: use dynamic ingredient calculator in Ingredients page"
```

---

## Task 3 — Update `src/pages/events/EventDetail.tsx`

**Files:**
- Modify: `src/pages/events/EventDetail.tsx`

- [ ] **Step 1: Add imports**

Find the existing import:
```tsx
import { calculateIngredients, type IngredientResult } from '@/lib/ingredient-calculator'
```

Replace with:
```tsx
import { type IngredientResult } from '@/lib/ingredient-calculator'
import { getIngredientOverrides, type OverrideMap } from '@/lib/ingredient-overrides'
import { calculateIngredientsWithOverrides } from '@/lib/ingredient-calculator-dynamic'
```

- [ ] **Step 2: Add overrides state inside `EventDetail()` component**

Find where `ingr` is declared (it uses `calculateIngredients`). Add overrides state above it:

```tsx
const [overrides, setOverrides] = useState<OverrideMap>({})

useEffect(() => {
  getIngredientOverrides().then(setOverrides).catch(() => {})
}, [])
```

- [ ] **Step 3: Replace calculateIngredients call**

Find:
```tsx
calculateIngredients(event.pax)
```

Replace with:
```tsx
calculateIngredientsWithOverrides(event.pax, overrides)
```

(There may be multiple call sites or a derived variable — replace all occurrences within the component.)

- [ ] **Step 4: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/pages/events/EventDetail.tsx
git commit -m "feat: use dynamic ingredient calculator in EventDetail page"
```

---

## Task 4 — Create `src/pages/settings/IngredientsSettings.tsx`

**Files:**
- Create: `src/pages/settings/IngredientsSettings.tsx`

This is the main settings UI. It has four category sub-tabs. Each tab renders an editable table. Rows show default (gray) vs override (red) values. Edit mode opens inline inputs. Save writes to Firestore + activity_log. Reset deletes the override doc.

- [ ] **Step 1: Create the file with item definitions and types**

```tsx
import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, deleteDoc, addDoc,
  getDocs, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import {
  getMainIngredients, getDalca, getAcar, getDagingBox, BUBUR, BRACKETS,
  type Bracket,
} from '@/lib/ingredient-calculator'
import {
  getIngredientOverrides, invalidateOverrideCache,
  type OverrideMap, type OverrideDoc,
} from '@/lib/ingredient-overrides'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Edit2, RotateCcw, Check, X, AlertTriangle, Package } from 'lucide-react'

// ── Category tab type ──────────────────────────────────────────────────────

type CategoryTab = 'main' | 'dalca' | 'bubur' | 'acar'

// ── Item definitions ───────────────────────────────────────────────────────
// 'unit' = fixed unit label shown in the Unit column (main/acar items)
// 'isDalca' = true for dalca rows (cell value is free text string)
// 'isNullable' = true for acar items where some brackets have null (—)

interface BracketItem {
  key: string          // override map key e.g. 'main/beras'
  label: string
  unit: string
  isDalca?: boolean
  isNullable?: boolean
}

interface FlatItem {
  key: string
  label: string
  defaultQty: number
  unit: string
}

const MAIN_ITEMS: BracketItem[] = [
  { key: 'main/beras',        label: 'Beras',        unit: 'bag'  },
  { key: 'main/ayam',         label: 'Ayam',         unit: 'ekor' },
  { key: 'main/daging',       label: 'Daging',       unit: 'kg'   },
  { key: 'main/paceri_nenas', label: 'Paceri Nenas', unit: 'biji' },
  { key: 'main/oren',         label: 'Oren',         unit: 'biji' },
  { key: 'main/gula',         label: 'Gula',         unit: 'L'    },
]

const DALCA_ITEMS: BracketItem[] = [
  { key: 'dalca/kacang_dall',    label: 'Kacang Dall',    unit: '', isDalca: true },
  { key: 'dalca/terung',         label: 'Terung',         unit: '', isDalca: true },
  { key: 'dalca/kentang',        label: 'Kentang',        unit: '', isDalca: true },
  { key: 'dalca/karot',          label: 'Karot',          unit: '', isDalca: true, isNullable: true },
  { key: 'dalca/kacang_panjang', label: 'Kacang Panjang', unit: '', isDalca: true },
  { key: 'dalca/serbuk_kari',    label: 'Serbuk Kari',    unit: '', isDalca: true, isNullable: true },
]

const ACAR_ITEMS: BracketItem[] = [
  { key: 'acar/timun',        label: 'Timun',        unit: 'kg',   isNullable: true },
  { key: 'acar/nenas',        label: 'Nenas Acar',   unit: 'biji', isNullable: true },
  { key: 'acar/paceri_nenas', label: 'Paceri Nenas', unit: 'biji' },
]

const BUBUR_ITEMS: FlatItem[] = [
  { key: 'bubur/pulut_hitam_beras',   label: 'Pulut Hitam — Beras Pulut', defaultQty: BUBUR.pulut_hitam.beras_pulut_kg, unit: 'kg'    },
  { key: 'bubur/pulut_hitam_santan',  label: 'Pulut Hitam — Santan',      defaultQty: BUBUR.pulut_hitam.santan_tin,     unit: 'tin'   },
  { key: 'bubur/kacang_hijau_kacang', label: 'Kacang Hijau — Kacang',     defaultQty: BUBUR.kacang_hijau.kacang_kg,     unit: 'kg'    },
  { key: 'bubur/kacang_hijau_santan', label: 'Kacang Hijau — Santan',     defaultQty: BUBUR.kacang_hijau.santan_tin,    unit: 'tin'   },
  { key: 'bubur/jagung_beg',          label: 'Jagung — Beg',              defaultQty: BUBUR.jagung.beg,                unit: 'beg'   },
  { key: 'bubur/jagung_beras',        label: 'Jagung — Beras',            defaultQty: BUBUR.jagung.beras_kg,           unit: 'kg'    },
  { key: 'bubur/jagung_santan',       label: 'Jagung — Santan',           defaultQty: BUBUR.jagung.santan_kotak,       unit: 'kotak' },
]

// ── Default value helpers ──────────────────────────────────────────────────

function getDefaultMainQty(key: string, b: Bracket): number {
  const m = getMainIngredients(b)
  const map: Record<string, number> = {
    'main/beras':        m.beras_bag,
    'main/ayam':         m.ayam_ekor,
    'main/daging':       m.daging_kg,
    'main/paceri_nenas': m.paceri_nenas_biji,
    'main/oren':         m.oren_biji,
    'main/gula':         m.gula_liter,
  }
  return map[key] ?? 0
}

function getDefaultDalcaStr(key: string, b: Bracket): string | null {
  const d = getDalca(b)
  const map: Record<string, string | null> = {
    'dalca/kacang_dall':    d.kacang_dall,
    'dalca/terung':         d.terung,
    'dalca/kentang':        d.kentang,
    'dalca/karot':          d.karot,
    'dalca/kacang_panjang': d.kacang_panjang,
    'dalca/serbuk_kari':    d.serbuk_kari,
  }
  return map[key] ?? null
}

function getDefaultAcarQty(key: string, b: Bracket): number | null {
  const a = getAcar(b)
  const map: Record<string, number | null> = {
    'acar/timun':        a.timun_kg,
    'acar/nenas':        a.nenas_biji,
    'acar/paceri_nenas': a.paceri_nenas_biji,
  }
  return map[key] ?? null
}

// ── Firestore helpers ──────────────────────────────────────────────────────

function docId(key: string) {
  return key.replace('/', '_')
}

function keyParts(key: string): { category: OverrideDoc['category']; item_name: string } {
  const [category, ...rest] = key.split('/')
  return {
    category: category as OverrideDoc['category'],
    item_name: rest.join('_'),
  }
}
```

- [ ] **Step 2: Add the main component function**

Append to the same file:

```tsx
// ── Edit state ─────────────────────────────────────────────────────────────
type BracketEditMap = Partial<Record<Bracket, string>>  // string per bracket (qty or display string)

export default function IngredientsSettings() {
  const { user, userDoc } = useAuth()
  const [tab, setTab]             = useState<CategoryTab>('main')
  const [overrides, setOverrides] = useState<OverrideMap>({})
  const [loading, setLoading]     = useState(true)
  const [editKey, setEditKey]     = useState<string | null>(null)
  const [editVals, setEditVals]   = useState<BracketEditMap>({})
  const [editFlat, setEditFlat]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [confirmResetAll, setConfirmResetAll] = useState(false)

  useEffect(() => {
    invalidateOverrideCache()
    getIngredientOverrides()
      .then(setOverrides)
      .finally(() => setLoading(false))
  }, [])

  async function refresh() {
    invalidateOverrideCache()
    setOverrides(await getIngredientOverrides())
  }

  // ── Start edit: populate editVals from override or default ────────────────
  function startEdit(item: BracketItem) {
    const ov = overrides[item.key]
    const vals: BracketEditMap = {}
    for (const b of BRACKETS) {
      if (ov && ov.brackets[b]) {
        const bv = ov.brackets[b]!
        // For dalca: bv.unit is the display string; qty=0 means null
        if (item.isDalca) {
          vals[b] = bv.qty === 0 ? '' : bv.unit
        } else {
          vals[b] = bv.qty === 0 ? '0' : String(bv.qty)
        }
      } else {
        // Use hardcoded default
        if (item.isDalca) {
          vals[b] = getDefaultDalcaStr(item.key, b) ?? ''
        } else if (item.key.startsWith('acar/')) {
          const dv = getDefaultAcarQty(item.key, b)
          vals[b] = dv === null ? '' : String(dv)
        } else {
          vals[b] = String(getDefaultMainQty(item.key, b))
        }
      }
    }
    setEditVals(vals)
    setEditKey(item.key)
  }

  function startEditFlat(item: FlatItem) {
    const ov = overrides[item.key]
    setEditFlat(ov?.is_flat ? String(ov.flat_qty) : String(item.defaultQty))
    setEditKey(item.key)
  }

  // ── Save override ─────────────────────────────────────────────────────────
  async function saveItem(item: BracketItem) {
    if (!user) return
    setSaving(true)
    try {
      const { category, item_name } = keyParts(item.key)
      const brackets: OverrideDoc['brackets'] = {}
      for (const b of BRACKETS) {
        const raw = editVals[b] ?? ''
        if (item.isDalca) {
          // qty=0 means null; unit = the display string
          brackets[b] = { qty: raw === '' ? 0 : 1, unit: raw }
        } else {
          const qty = parseFloat(raw)
          // For nullable items (acar/timun, acar/nenas), empty string = null = qty 0
          brackets[b] = { qty: isNaN(qty) ? 0 : qty, unit: item.unit }
        }
      }
      const data: Omit<OverrideDoc, 'id'> = {
        category,
        item_name,
        brackets,
        is_flat: false,
        flat_qty: 0,
        flat_unit: '',
        notes: '',
        updated_by: user.uid,
        updated_at: serverTimestamp() as any,
      }
      await setDoc(doc(db, 'ingredient_overrides', docId(item.key)), data)
      await addDoc(collection(db, 'activity_log'), {
        action: 'ingredient_override_saved',
        item: item.key,
        old_value: overrides[item.key] ?? null,
        new_value: data,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
        timestamp: serverTimestamp(),
      })
      await refresh()
      setEditKey(null)
      toast.success('Override disimpan')
    } catch {
      toast.error('Gagal menyimpan override')
    } finally {
      setSaving(false)
    }
  }

  async function saveFlatItem(item: FlatItem) {
    if (!user) return
    setSaving(true)
    try {
      const { category, item_name } = keyParts(item.key)
      const flat_qty = parseFloat(editFlat) || 0
      const data: Omit<OverrideDoc, 'id'> = {
        category,
        item_name,
        brackets: {},
        is_flat: true,
        flat_qty,
        flat_unit: item.unit,
        notes: '',
        updated_by: user.uid,
        updated_at: serverTimestamp() as any,
      }
      await setDoc(doc(db, 'ingredient_overrides', docId(item.key)), data)
      await addDoc(collection(db, 'activity_log'), {
        action: 'ingredient_override_saved',
        item: item.key,
        old_value: overrides[item.key] ?? null,
        new_value: data,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
        timestamp: serverTimestamp(),
      })
      await refresh()
      setEditKey(null)
      toast.success('Override disimpan')
    } catch {
      toast.error('Gagal menyimpan override')
    } finally {
      setSaving(false)
    }
  }

  // ── Reset single override ─────────────────────────────────────────────────
  async function resetItem(key: string) {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'ingredient_overrides', docId(key)))
      await addDoc(collection(db, 'activity_log'), {
        action: 'ingredient_override_reset',
        item: key,
        old_value: overrides[key] ?? null,
        new_value: null,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
        timestamp: serverTimestamp(),
      })
      await refresh()
      if (editKey === key) setEditKey(null)
      toast.success('Dikembalikan ke default')
    } catch {
      toast.error('Gagal memadam override')
    }
  }

  // ── Reset all ─────────────────────────────────────────────────────────────
  async function resetAll() {
    if (!user) return
    setConfirmResetAll(false)
    try {
      const snap = await getDocs(collection(db, 'ingredient_overrides'))
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      await addDoc(collection(db, 'activity_log'), {
        action: 'ingredient_override_reset',
        item: 'ALL',
        old_value: null,
        new_value: null,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
        timestamp: serverTimestamp(),
      })
      await refresh()
      setEditKey(null)
      toast.success('Semua override dipadam')
    } catch {
      toast.error('Gagal memadam semua override')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS: { id: CategoryTab; label: string }[] = [
    { id: 'main',  label: 'Bahan Utama' },
    { id: 'dalca', label: 'Dalca' },
    { id: 'bubur', label: 'Bubur' },
    { id: 'acar',  label: 'Acar & Paceri' },
  ]

  const hasAnyOverride = Object.keys(overrides).length > 0

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Nilai default diambil dari jadual bapak. Override akan menggantikan nilai
        default untuk semua kiraan baru.{' '}
        <span className="font-semibold text-gray-500">Default</span> = kelabu ·{' '}
        <span className="font-semibold text-red-600">Override</span> = merah.
      </div>

      {/* Reset All */}
      {hasAnyOverride && !confirmResetAll && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmResetAll(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
          >
            <RotateCcw size={13} />
            Reset Semua
          </button>
        </div>
      )}
      {confirmResetAll && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="flex-1 text-xs text-red-700 font-medium">
            Padam semua override? Ini akan kembalikan semua ke nilai default.
          </p>
          <button onClick={resetAll} className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-300 hover:bg-red-100 transition-colors">
            Ya, Padam
          </button>
          <button onClick={() => setConfirmResetAll(false)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
            Batal
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-0 scrollbar-none -mx-4 px-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'shrink-0 pb-2.5 pt-1 px-3 text-xs font-semibold transition-colors whitespace-nowrap relative',
              tab === id ? 'text-[#1B4332]' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {label}
            {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1B4332] rounded-full" />}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-gray-400">Memuatkan...</div>
      )}

      {/* ── Bahan Utama tab ──────────────────────────────────────────────── */}
      {!loading && tab === 'main' && (
        <BracketTable
          items={MAIN_ITEMS}
          overrides={overrides}
          editKey={editKey}
          editVals={editVals}
          saving={saving}
          onEdit={startEdit}
          onEditValChange={(b, v) => setEditVals((prev) => ({ ...prev, [b]: v }))}
          onSave={saveItem}
          onCancel={() => setEditKey(null)}
          onReset={resetItem}
          getCellDefault={(key, b) => String(getDefaultMainQty(key, b))}
        />
      )}

      {/* ── Dalca tab ────────────────────────────────────────────────────── */}
      {!loading && tab === 'dalca' && (
        <BracketTable
          items={DALCA_ITEMS}
          overrides={overrides}
          editKey={editKey}
          editVals={editVals}
          saving={saving}
          onEdit={startEdit}
          onEditValChange={(b, v) => setEditVals((prev) => ({ ...prev, [b]: v }))}
          onSave={saveItem}
          onCancel={() => setEditKey(null)}
          onReset={resetItem}
          getCellDefault={(key, b) => getDefaultDalcaStr(key, b) ?? '—'}
        />
      )}

      {/* ── Bubur tab ────────────────────────────────────────────────────── */}
      {!loading && tab === 'bubur' && (
        <BuburTable
          items={BUBUR_ITEMS}
          overrides={overrides}
          editKey={editKey}
          editFlat={editFlat}
          saving={saving}
          onEdit={startEditFlat}
          onEditFlatChange={setEditFlat}
          onSave={saveFlatItem}
          onCancel={() => setEditKey(null)}
          onReset={resetItem}
        />
      )}

      {/* ── Acar tab ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'acar' && (
        <BracketTable
          items={ACAR_ITEMS}
          overrides={overrides}
          editKey={editKey}
          editVals={editVals}
          saving={saving}
          onEdit={startEdit}
          onEditValChange={(b, v) => setEditVals((prev) => ({ ...prev, [b]: v }))}
          onSave={saveItem}
          onCancel={() => setEditKey(null)}
          onReset={resetItem}
          getCellDefault={(key, b) => {
            const v = getDefaultAcarQty(key, b)
            return v === null ? '—' : String(v)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add sub-components `BracketTable` and `BuburTable`**

Append to the same file (before the `export default` function is fine, or after):

```tsx
// ── BracketTable ───────────────────────────────────────────────────────────

interface BracketTableProps {
  items: BracketItem[]
  overrides: OverrideMap
  editKey: string | null
  editVals: BracketEditMap
  saving: boolean
  onEdit: (item: BracketItem) => void
  onEditValChange: (bracket: Bracket, value: string) => void
  onSave: (item: BracketItem) => void
  onCancel: () => void
  onReset: (key: string) => void
  getCellDefault: (key: string, b: Bracket) => string
}

function BracketTable({
  items, overrides, editKey, editVals, saving,
  onEdit, onEditValChange, onSave, onCancel, onReset, getCellDefault,
}: BracketTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2 text-left font-semibold text-gray-500 pr-3 w-28">Bahan</th>
            {BRACKETS.map((b) => (
              <th key={b} className="py-2 text-center font-semibold text-gray-500 w-14">{b}</th>
            ))}
            <th className="py-2 text-center font-semibold text-gray-500 w-12">Unit</th>
            <th className="py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const hasOv = !!overrides[item.key]
            const isEditing = editKey === item.key
            return (
              <tr key={item.key} className={cn('border-b border-gray-50', hasOv && 'bg-red-50/30')}>
                {/* Bahan name */}
                <td className="py-2.5 pr-3 font-medium text-gray-800 align-middle">
                  <div className="flex items-center gap-1.5">
                    {item.label}
                    {hasOv && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                        Override
                      </span>
                    )}
                  </div>
                </td>

                {/* Bracket cells */}
                {BRACKETS.map((b) => {
                  const ovBracket = overrides[item.key]?.brackets[b]
                  const defaultVal = getCellDefault(item.key, b)

                  let displayVal: string
                  let isOverridden: boolean

                  if (ovBracket !== undefined) {
                    isOverridden = true
                    if (item.isDalca) {
                      displayVal = ovBracket.qty === 0 ? '—' : ovBracket.unit
                    } else {
                      displayVal = ovBracket.qty === 0 ? '—' : String(ovBracket.qty)
                    }
                  } else {
                    isOverridden = false
                    displayVal = defaultVal
                  }

                  return (
                    <td key={b} className="py-2.5 text-center align-middle">
                      {isEditing ? (
                        <input
                          type={item.isDalca ? 'text' : 'number'}
                          value={editVals[b] ?? ''}
                          onChange={(e) => onEditValChange(b, e.target.value)}
                          placeholder={item.isNullable ? '—' : ''}
                          className="w-12 text-center border border-gray-300 rounded-md px-1 py-1 text-xs focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                        />
                      ) : (
                        <span className={cn(
                          'tabular-nums',
                          isOverridden ? 'text-red-600 font-semibold' : 'text-gray-500',
                        )}>
                          {displayVal}
                        </span>
                      )}
                    </td>
                  )
                })}

                {/* Unit */}
                <td className="py-2.5 text-center text-gray-400 align-middle">
                  {item.unit || 'teks'}
                </td>

                {/* Actions */}
                <td className="py-2.5 align-middle">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onSave(item)}
                        disabled={saving}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#1B4332] text-white text-[11px] font-semibold hover:bg-[#1B4332]/90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={11} />
                        Simpan
                      </button>
                      <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B4332] hover:bg-green-50 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      {hasOv && (
                        <button
                          onClick={() => onReset(item.key)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Reset ke default"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── BuburTable ─────────────────────────────────────────────────────────────

interface BuburTableProps {
  items: FlatItem[]
  overrides: OverrideMap
  editKey: string | null
  editFlat: string
  saving: boolean
  onEdit: (item: FlatItem) => void
  onEditFlatChange: (v: string) => void
  onSave: (item: FlatItem) => void
  onCancel: () => void
  onReset: (key: string) => void
}

function BuburTable({
  items, overrides, editKey, editFlat, saving,
  onEdit, onEditFlatChange, onSave, onCancel, onReset,
}: BuburTableProps) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 mb-3">Bubur adalah flat — sama untuk semua pax.</p>
      {items.map((item) => {
        const ov = overrides[item.key]
        const hasOv = !!ov
        const isEditing = editKey === item.key
        const displayQty = hasOv ? ov!.flat_qty : item.defaultQty
        const isOverridden = hasOv

        return (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-3 py-2.5 px-3 rounded-xl border',
              hasOv ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white',
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                {item.label}
                {hasOv && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                    Override
                  </span>
                )}
              </p>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editFlat}
                  onChange={(e) => onEditFlatChange(e.target.value)}
                  className="w-16 text-center border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                />
                <span className="text-xs text-gray-500">{item.unit}</span>
                <button
                  onClick={() => onSave(item)}
                  disabled={saving}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#1B4332] text-white text-[11px] font-semibold hover:bg-[#1B4332]/90 disabled:opacity-50 transition-colors"
                >
                  <Check size={11} />
                  Simpan
                </button>
                <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  isOverridden ? 'text-red-600' : 'text-gray-500',
                )}>
                  {displayQty} {item.unit}
                </span>
                <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B4332] hover:bg-green-50 transition-colors">
                  <Edit2 size={13} />
                </button>
                {hasOv && (
                  <button onClick={() => onReset(item.key)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors. Fix any type errors, particularly around `serverTimestamp() as any` if Firestore typing is strict.

- [ ] **Step 5: Commit**

```
git add src/pages/settings/IngredientsSettings.tsx
git commit -m "feat: add IngredientsSettings component with editable ingredient tables"
```

---

## Task 5 — Update `src/pages/Settings.tsx`

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add import**

Add after the existing settings imports:
```tsx
import IngredientsSettings from '@/pages/settings/IngredientsSettings'
```

- [ ] **Step 2: Add tab to TABS array**

Find:
```tsx
type Tab = 'users' | 'menu' | 'halls' | 'dev'

const TABS: { id: Tab; label: (t: (k: StringKey) => string) => string }[] = [
  { id: 'users', label: (t) => t('settings.users') },
  { id: 'menu',  label: (t) => t('settings.menu') },
  { id: 'halls', label: (t) => t('settings.halls') },
  { id: 'dev',   label: (t) => t('settings.devSettings') },
]
```

Replace with:
```tsx
type Tab = 'users' | 'menu' | 'halls' | 'ingredients' | 'dev'

const TABS: { id: Tab; label: (t: (k: StringKey) => string) => string }[] = [
  { id: 'users',       label: (t) => t('settings.users') },
  { id: 'menu',        label: (t) => t('settings.menu') },
  { id: 'halls',       label: (t) => t('settings.halls') },
  { id: 'ingredients', label: () => 'Bahan Mentah' },
  { id: 'dev',         label: (t) => t('settings.devSettings') },
]
```

- [ ] **Step 3: Add tab content render**

Find:
```tsx
{tab === 'halls' && <HallsSettings />}
{tab === 'dev'   && <DeveloperSettings />}
```

Replace with:
```tsx
{tab === 'halls'       && <HallsSettings />}
{tab === 'ingredients' && <IngredientsSettings />}
{tab === 'dev'         && <DeveloperSettings />}
```

- [ ] **Step 4: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/pages/Settings.tsx
git commit -m "feat: add Bahan Mentah tab to Settings page"
```

---

## Task 6 — Final verification

- [ ] **Step 1: Full TypeScript check**

```
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Build**

```
pnpm build
```

Expected: build succeeds with no errors (warnings are OK).

- [ ] **Step 3: List all created/modified files**

```
git log --name-only --oneline -8
```

Report all files changed across the implementation.

---

## Self-Review Notes

**Spec coverage check:**
- Phase 1 (Firestore rules) ✓ already done
- Phase 2 (dynamic calculator) → Task 1
- Phase 2 (wire up EventDetail + Ingredients) → Tasks 2 + 3
- Phase 3 (Settings tab + IngredientsSettings) → Tasks 4 + 5
- Phase 4 (activity log) → embedded in Task 4 save/reset handlers
- Reset Semua button → in Task 4 component
- Override badge on rows → in BracketTable render
- Default vs override color coding (gray/red) → in BracketTable + BuburTable render
- Bubur flat items → BuburTable sub-component
- Dalca free-text cells → `isDalca` flag in BracketTable
- Kotak Daging tab → **omitted** (daging_box is computed from daging_kg; admin overrides daging_kg in Bahan Utama tab which flows through automatically)

**Type consistency:**
- `OverrideDoc['brackets']` uses `Bracket` as key — `Partial<Record<Bracket, BracketValue>>` ✓
- `BracketMap = Partial<Record<Bracket, BracketValue>>` defined in ingredient-overrides.ts ✓
- `docId()` converts `main/beras` → `main_beras` for Firestore doc ID ✓
- `keyParts()` converts back to `{ category: 'main', item_name: 'beras' }` ✓
- `item_name` for bubur sub-items: `bubur/pulut_hitam_beras` → item_name = `pulut_hitam_beras` ✓
