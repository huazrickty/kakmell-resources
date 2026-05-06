# Phase 3: Ingredient Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a pure TypeScript ingredient calculator that maps any pax count to a full ingredient list using hardcoded bracket lookup tables, fully covered by Vitest unit tests.

**Architecture:** Two files only — the implementation (`ingredient-calculator.ts`) exports typed functions and constants; the test file (`ingredient-calculator.test.ts`) covers every bracket and edge case with Vitest. No Firebase, no React, no side effects. Works offline after PWA cache.

**Tech Stack:** TypeScript, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `vite.config.ts` | Modify | Add Vitest config block |
| `src/lib/ingredient-calculator.ts` | Create | All types, lookup tables, exported functions |
| `src/lib/ingredient-calculator.test.ts` | Create | Full Vitest test suite |
| `package.json` | Modify | Add `test` and `test:ui` scripts |

---

## Task 1: Install Vitest and configure

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest @vitest/ui
```

Expected: `devDependencies` gains `vitest` and `@vitest/ui`.

- [ ] **Step 2: Add Vitest config to vite.config.ts**

Replace the entire file with:

```typescript
/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

In the `scripts` section, add after `"seed"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest is wired up**

Run: `pnpm test`
Expected: `No test files found` or `0 tests passed` — no errors.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add Vitest for unit testing"
```

---

## Task 2: Define all types

**Files:**
- Create: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Write the types-only skeleton**

Create `src/lib/ingredient-calculator.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ingredient-calculator.ts
git commit -m "feat: add ingredient calculator types"
```

---

## Task 3: getBracket() — TDD

**Files:**
- Create: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/ingredient-calculator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getBracket } from './ingredient-calculator'

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
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `getBracket is not a function`

- [ ] **Step 3: Implement getBracket**

Append to `src/lib/ingredient-calculator.ts`:

```typescript
export function getBracket(pax: number): number {
  if (pax > 1000) return -1
  for (const b of BRACKETS) {
    if (pax <= b) return b
  }
  return -1
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: `getBracket` suite — 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement getBracket with full test coverage"
```

---

## Task 4: Main items lookup — TDD

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add failing tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { getBracket, getMainIngredients } from './ingredient-calculator'

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
      paceri_nenas_biji: 35, oren_biji: 30, gula_liter: 15,
    })
  })

  it('returns correct values for bracket 800', () => {
    expect(getMainIngredients(800)).toEqual({
      beras_bag: 5.5, ayam_ekor: 55, daging_kg: 48,
      paceri_nenas_biji: 50, oren_biji: 30, gula_liter: 25,
    })
  })

  it('returns correct values for bracket 1000', () => {
    expect(getMainIngredients(1000)).toEqual({
      beras_bag: 7, ayam_ekor: 70, daging_kg: 60,
      paceri_nenas_biji: 70, oren_biji: 40, gula_liter: 30,
    })
  })

  it('uses getBracket internally — pax 350 resolves to bracket 400', () => {
    expect(getMainIngredients(350)).toEqual(getMainIngredients(400))
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `getMainIngredients is not a function`

- [ ] **Step 3: Implement lookup table + getMainIngredients**

Append to `ingredient-calculator.ts`:

```typescript
const MAIN_TABLE: Record<Bracket, MainIngredients> = {
  300:  { beras_bag: 2,   ayam_ekor: 20, daging_kg: 18, paceri_nenas_biji: 20, oren_biji: 25, gula_liter: 10 },
  400:  { beras_bag: 3,   ayam_ekor: 28, daging_kg: 24, paceri_nenas_biji: 25, oren_biji: 30, gula_liter: 10 },
  500:  { beras_bag: 3.5, ayam_ekor: 35, daging_kg: 30, paceri_nenas_biji: 35, oren_biji: 30, gula_liter: 15 },
  600:  { beras_bag: 4,   ayam_ekor: 42, daging_kg: 36, paceri_nenas_biji: 40, oren_biji: 30, gula_liter: 20 },
  700:  { beras_bag: 4.5, ayam_ekor: 50, daging_kg: 42, paceri_nenas_biji: 45, oren_biji: 30, gula_liter: 20 },
  800:  { beras_bag: 5.5, ayam_ekor: 55, daging_kg: 48, paceri_nenas_biji: 50, oren_biji: 30, gula_liter: 25 },
  900:  { beras_bag: 6,   ayam_ekor: 65, daging_kg: 54, paceri_nenas_biji: 60, oren_biji: 35, gula_liter: 30 },
  1000: { beras_bag: 7,   ayam_ekor: 70, daging_kg: 60, paceri_nenas_biji: 70, oren_biji: 40, gula_liter: 30 },
}

export function getMainIngredients(pax: number): MainIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000 — use calculateIngredients and check for null`)
  return MAIN_TABLE[bracket as Bracket]
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement main ingredients lookup table"
```

---

## Task 5: Daging box calculation — TDD

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add failing tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { getDagingBox } from './ingredient-calculator'

describe('getDagingBox', () => {
  // 18kg → ceil(18/17)=2 boxes, variance=34-18=16
  it('bracket 300: 18kg → 2 slice boxes, variance 16kg', () => {
    expect(getDagingBox(18)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 16 })
  })

  // 24kg → ceil(24/17)=2 boxes, variance=34-24=10
  it('bracket 400: 24kg → 2 slice boxes, variance 10kg', () => {
    expect(getDagingBox(24)).toEqual({ slice_boxes: 2, trim_boxes: 1, variance_kg: 10 })
  })

  // 36kg → ceil(36/17)=3 boxes, variance=51-36=15
  it('bracket 600: 36kg → 3 slice boxes, variance 15kg', () => {
    expect(getDagingBox(36)).toEqual({ slice_boxes: 3, trim_boxes: 1, variance_kg: 15 })
  })

  // 54kg → ceil(54/17)=4 boxes, variance=68-54=14
  it('bracket 900: 54kg → 4 slice boxes, variance 14kg', () => {
    expect(getDagingBox(54)).toEqual({ slice_boxes: 4, trim_boxes: 1, variance_kg: 14 })
  })

  // 60kg → ceil(60/17)=4 boxes, variance=68-60=8
  it('bracket 1000: 60kg → 4 slice boxes, variance 8kg', () => {
    expect(getDagingBox(60)).toEqual({ slice_boxes: 4, trim_boxes: 1, variance_kg: 8 })
  })

  it('trim_boxes is always 1', () => {
    expect(getDagingBox(18).trim_boxes).toBe(1)
    expect(getDagingBox(60).trim_boxes).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `getDagingBox is not a function`

- [ ] **Step 3: Implement getDagingBox**

Append to `ingredient-calculator.ts`:

```typescript
export function getDagingBox(daging_kg: number): DagingBox {
  const slice_boxes = Math.ceil(daging_kg / 17)
  return {
    slice_boxes,
    trim_boxes: 1,
    variance_kg: slice_boxes * 17 - daging_kg,
  }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement daging box calculation"
```

---

## Task 6: Dalca lookup — TDD

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add failing tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { getDalca } from './ingredient-calculator'

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
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `getDalca is not a function`

- [ ] **Step 3: Implement dalca lookup table + getDalca**

Append to `ingredient-calculator.ts`:

```typescript
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
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement dalca lookup table"
```

---

## Task 7: Bubur (flat constant) — TDD

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add failing tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { BUBUR } from './ingredient-calculator'

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
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `BUBUR is not exported`

- [ ] **Step 3: Implement BUBUR constant**

Append to `ingredient-calculator.ts`:

```typescript
export const BUBUR: BuburIngredients = {
  pulut_hitam: { beras_pulut_kg: 2, santan_tin: 1 },
  kacang_hijau: { kacang_kg: 2, santan_tin: 1 },
  jagung:       { beg: 2, beras_kg: 4, santan_kotak: 2 },
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement bubur flat constant"
```

---

## Task 8: Acar & Paceri lookup — TDD

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add failing tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { getAcar } from './ingredient-calculator'

describe('getAcar', () => {
  it('bracket 300: timun 10kg, nenas 10 biji, paceri 20 biji', () => {
    expect(getAcar(300)).toEqual({ timun_kg: 10, nenas_biji: 10, paceri_nenas_biji: 20 })
  })

  it('bracket 400: timun and nenas are null (no acar), paceri present', () => {
    expect(getAcar(400)).toEqual({ timun_kg: null, nenas_biji: null, paceri_nenas_biji: 25 })
  })

  it('bracket 500: timun 15kg, nenas 10 biji, paceri 35 biji', () => {
    expect(getAcar(500)).toEqual({ timun_kg: 15, nenas_biji: 10, paceri_nenas_biji: 35 })
  })

  it('bracket 600: timun and nenas null', () => {
    const a = getAcar(600)
    expect(a.timun_kg).toBeNull()
    expect(a.nenas_biji).toBeNull()
    expect(a.paceri_nenas_biji).toBe(40)
  })

  it('bracket 800: timun 25kg, nenas 12 biji, paceri 50 biji', () => {
    expect(getAcar(800)).toEqual({ timun_kg: 25, nenas_biji: 12, paceri_nenas_biji: 50 })
  })

  it('bracket 900: timun and nenas null, paceri 60', () => {
    const a = getAcar(900)
    expect(a.timun_kg).toBeNull()
    expect(a.paceri_nenas_biji).toBe(60)
  })

  it('bracket 1000: timun 30kg, nenas 20 biji, paceri 70 biji', () => {
    expect(getAcar(1000)).toEqual({ timun_kg: 30, nenas_biji: 20, paceri_nenas_biji: 70 })
  })

  it('non-exact pax — 850 resolves to 900', () => {
    expect(getAcar(850)).toEqual(getAcar(900))
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `getAcar is not a function`

- [ ] **Step 3: Implement acar lookup table + getAcar**

Append to `ingredient-calculator.ts`:

```typescript
const ACAR_TABLE: Record<Bracket, AcarIngredients> = {
  300:  { timun_kg: 10,   nenas_biji: 10,   paceri_nenas_biji: 20 },
  400:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 25 },
  500:  { timun_kg: 15,   nenas_biji: 10,   paceri_nenas_biji: 35 },
  600:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 40 },
  700:  { timun_kg: 20,   nenas_biji: 10,   paceri_nenas_biji: 45 },
  800:  { timun_kg: 25,   nenas_biji: 12,   paceri_nenas_biji: 50 },
  900:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 60 },
  1000: { timun_kg: 30,   nenas_biji: 20,   paceri_nenas_biji: 70 },
}

export function getAcar(pax: number): AcarIngredients {
  const bracket = getBracket(pax)
  if (bracket === -1) throw new Error(`pax ${pax} exceeds 1000`)
  return ACAR_TABLE[bracket as Bracket]
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement acar and paceri lookup table"
```

---

## Task 9: calculateIngredients() — integration

**Files:**
- Modify: `src/lib/ingredient-calculator.test.ts`
- Modify: `src/lib/ingredient-calculator.ts`

- [ ] **Step 1: Add integration tests**

Append to `ingredient-calculator.test.ts`:

```typescript
import { calculateIngredients } from './ingredient-calculator'

describe('calculateIngredients', () => {
  it('returns null for pax above 1000', () => {
    expect(calculateIngredients(1001)).toBeNull()
    expect(calculateIngredients(5000)).toBeNull()
  })

  it('bracket 300: full result has correct bracket and spot-check values', () => {
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
    expect(r.acar.paceri_nenas_biji).toBe(70)
  })

  it('bubur is always flat regardless of bracket', () => {
    const r300 = calculateIngredients(300)!
    const r1000 = calculateIngredients(1000)!
    expect(r300.bubur).toEqual(r1000.bubur)
    expect(r300.bubur.jagung).toEqual({ beg: 2, beras_kg: 4, santan_kotak: 2 })
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm test`
Expected: FAIL — `calculateIngredients is not a function`

- [ ] **Step 3: Implement calculateIngredients**

Append to `ingredient-calculator.ts`:

```typescript
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
```

- [ ] **Step 4: Run — expect all pass**

Run: `pnpm test`
Expected: all suites PASS — output similar to:

```
 ✓ src/lib/ingredient-calculator.test.ts (30 tests)
   ✓ getBracket (4)
   ✓ getMainIngredients (5)
   ✓ getDagingBox (6)
   ✓ getDalca (7)
   ✓ BUBUR flat constant (3)
   ✓ getAcar (8)
   ✓ calculateIngredients (5)
```

- [ ] **Step 5: Final commit**

```bash
git add src/lib/ingredient-calculator.ts src/lib/ingredient-calculator.test.ts
git commit -m "feat: implement calculateIngredients integration function — Phase 3 complete"
```

---

## Self-Review

**Spec coverage:**
- [x] `getBracket(pax)` — rounds up, pax<300→300, pax>1000→-1
- [x] Main items table — all 8 brackets, all 6 columns
- [x] Daging box calc — slice_boxes=ceil(daging/17), trim=1 fixed, variance
- [x] Dalca table — all 8 brackets, null values for `—` entries
- [x] Bubur flat — all 3 types with exact quantities
- [x] Acar & Paceri table — all 8 brackets, null for `—` entries
- [x] `calculateIngredients(pax)` — returns null for >1000, full result otherwise
- [x] All types exported for use by UI phases

**Placeholders:** None.

**Type consistency:**
- `getDagingBox(daging_kg)` takes kg directly — called inside `calculateIngredients` as `getDagingBox(main.daging_kg)` ✓
- `BUBUR` exported as constant and referenced in `IngredientResult.bubur` ✓
- `Bracket` type used consistently as cast in all internal lookups ✓
