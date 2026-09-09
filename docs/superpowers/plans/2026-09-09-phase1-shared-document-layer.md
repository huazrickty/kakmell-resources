# Phase 1 — Shared Document Layer Refactor (Zero Behaviour Change)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract pricing, document numbering, PDF primitives, line-item editing and status badge out of the invoice pages into shared modules so the upcoming Quotation feature composes them instead of copy-pasting. Invoice number, PDF bytes/layout and UI must be pixel/byte-identical after this phase.

**Architecture:** Pure extraction. Each new module is created with the exact code lifted from its current location, unit-tested where pure, then the original call-sites are switched to import it. No new routes, pages, schema fields, or wording. The only *intentional* behavioural fix is invoice numbering: `count(all docs)+1` becomes a per-year transactional counter (fixes race + number reuse after delete). Given a seeded counter, the next number issued equals what the old code would issue in the no-delete case.

**Tech Stack:** React 19, TypeScript 6, Vite 5, Firebase JS SDK 12 (Firestore `runTransaction`), jsPDF 4, Vitest 4, firebase-admin (migration script via `tsx`).

**Spec:** User instruction in chat, 2026-09-09 ("FASA 1 — REFACTOR SAHAJA"). Audit report from same session is the source of file/line facts.

## Global Constraints

- Zero UI change: every className, string, icon size, layout must remain identical in `NewInvoice.tsx`, `NewCustomInvoice.tsx`, `Invoices.tsx`, `InvoiceDetail.tsx`.
- Zero PDF change: `generateInvoicePDF`, `generateWeeklyPDF`, `generateCalibrationForm` must emit the same layout (same coordinates, sizes, colours, fonts, strings).
- Do NOT touch `src/lib/ingredient-calculator.ts`, `ingredient-calculator-dynamic.ts`, `ingredient-overrides.ts`.
- Do NOT change Firestore schema of `events` or `invoices`. Only additive: new `counters` collection + rules block.
- Do NOT add pages/routes. Do NOT edit `src/lib/i18n.ts` (no new keys needed; the i18n key-parity test must stay green).
- `pnpm build` and `pnpm test` must pass at the end of every task, BEFORE the commit.
- `pnpm lint` baseline on this branch is **27 problems (25 errors, 2 warnings), all pre-existing** (measured at `60fbe93`). Gate = the count must not grow and no problem may point into a file you created; do NOT fix unrelated pre-existing lint errors in this phase. Paste the summary line in the report.
- Commit message format: `refactor(shared): <task summary>` (Task 7: `chore(functions): …`). One commit per task. Always end the message with the two attribution lines given by the session (`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_01FvWhyRGkhsDyXcT2kJHh2Z`). Use `git -c core.safecrlf=false commit` (repo has mixed line endings; the warning is noise).
- Branch: `refactor/shared-document-layer`. Never commit to `main`.
- After EVERY task, before commit: run the task's grep gate and paste the raw output in the report. "Done" without grep output is not accepted.
- No `firebase deploy` of any kind (rules, functions, hosting), no auto-run of the migration script.
- Never stage `firebase-service-account.json` (gitignored, verify with `git diff --cached --name-only | grep -i service-account` → empty).
- Path alias `@/` → `src/`. Test files colocated as `*.test.ts` under `src/lib`.

## Working-tree status

DONE 2026-09-09: WIP committed as `bdec9d8 wip: ui-kit migration`, pushed to `origin/main`. Branch `refactor/shared-document-layer` created from it; plan committed as `735be05`. Baseline on that commit: `pnpm build` ✓, `pnpm test` ✓ (79 tests, 2 files). All tasks run on this branch.

## Execution mode (user decision)

- Tasks 1, 2, 3, 6, 7 → one fresh subagent each; this file is the source of truth; subagent reports diff + build/test/lint output + grep gate output.
- Tasks 4, 5 → inline in the main session (user wants to see reasoning for the transaction counter and the flag-based editor).

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/pricing.ts` | Single source of truth for RM prices / tables |
| Create | `src/lib/pricing.test.ts` | Table + tier tests |
| Create | `src/lib/date-utils.ts` | `tsToDate`, `fmtDateDMY` (one version) |
| Create | `src/lib/date-utils.test.ts` | |
| Create | `src/lib/document-number.ts` | `formatDocumentNumber` (pure) + `nextDocumentNumber` (transaction) |
| Create | `src/lib/document-number.test.ts` | Pure formatter tests |
| Create | `src/lib/pdf-common.ts` | jsPDF primitives: page consts, palette, font helpers, company block, logo, footer note, `getLogoBase64` |
| Create | `src/hooks/useLineItems.ts` | `FormItem` type + state hook + subtotal |
| Create | `src/components/LineItemsEditor.tsx` | Presentational line-item table (header, rows, add button) |
| Create | `src/components/DocumentStatusBadge.tsx` | Status → badge/label/strip meta + component |
| Create | `scripts/seed-counters.ts` | One-off migration: seed `counters/invoice` from existing max per year (manual run) |
| Modify | `src/pages/invoices/NewInvoice.tsx` | Use pricing, document-number, useLineItems, LineItemsEditor, pdf-common |
| Modify | `src/pages/invoices/NewCustomInvoice.tsx` | Use document-number, useLineItems, LineItemsEditor, pdf-common |
| Modify | `src/pages/invoices/InvoiceDetail.tsx` | Use DocumentStatusBadge, date-utils, pdf-common |
| Modify | `src/pages/Invoices.tsx` | Use DocumentStatusBadge, date-utils |
| Modify | `src/lib/invoice-pdf.ts` | Import primitives from pdf-common/date-utils; remove moved code |
| Modify | `src/lib/weekly-export-pdf.ts` | Import `tsToDate`, fonts, palette, `drawLogo` from shared |
| Modify | `src/lib/calibration-form-pdf.ts` | Import fonts + `drawLogo` from shared |
| Modify | `src/pages/Dashboard.tsx:16` | `getLogoBase64` import path |
| Modify | `src/pages/settings/IngredientsSettings.tsx:21` | `getLogoBase64` import path |
| Modify | `firestore.rules` | Add `counters/{id}` admin-only block |
| Modify | `package.json` | Add `"seed:counters"` script |
| Delete (pending user OK) | `functions/src/index.ts` `createInvoice`, `updateInvoiceStatus`, `generateWeeklyExportData` | Dead: no `httpsCallable` caller in `src/` |
| Delete (pending user OK) | `functions/src/ingredient-calculator.ts` | Only consumer is `generateWeeklyExportData` (also dead) |

---

## Findings that shape the plan (read before executing)

### `tsToDate` — two versions, reconciled

| Input | `invoice-pdf.ts:31` | `weekly-export-pdf.ts:26` |
|---|---|---|
| falsy | `new Date()` | `new Date()` |
| `Date` | passthrough | passthrough |
| has `.toDate()` (Firestore Timestamp) | `.toDate()` | `.toDate()` |
| `string` | falls to `new Date(ts)` | explicit `new Date(ts)` — same result |
| `{ _seconds }` (admin SDK / JSON-serialised Timestamp) | **not handled** → `new Date(object)` = Invalid Date | `new Date(_seconds*1000)` |
| `{ seconds }` | `new Date(seconds*1000)` | `new Date(seconds*1000)` |

Weekly version is a strict superset. **Decision: keep the weekly version** as the single `tsToDate`. Invoice call-sites only ever pass Firestore `Timestamp` or `Date`, both handled identically → no behaviour change.

### `fmtDate` DD/MM/YYYY — two identical copies
`invoice-pdf.ts:39` and `InvoiceDetail.tsx:26` are byte-identical. Becomes `fmtDateDMY` in `date-utils.ts`. The other date formatters (`fmtDay`/`fmtNow` BM in weekly, `fmtDate()` "D Mon YYYY" in calibration) are different formats and stay local — out of scope.

### Logo placement differs per PDF (so `drawLogoHeader` must be parameterised)
| PDF | x | y | w | h |
|---|---|---|---|---|
| invoice | 14 | 14 | 45 | 15 |
| weekly | 14 | 12 | 38 | 13 |
| calibration | `297-12-36` (right) | 12 | 36 | 13 |

`drawLogo(pdf, logo, {x, y, w, h})` — each caller passes its own numbers. Invoice additionally gets `drawCompanyAddress`. Weekly + calibration only adopt `drawLogo`, `fonts()`, palette. Their own header text stays inline.

### Margins / page size
Invoice + weekly: W=210, M=14. Calibration: W=297, H=210, M=12. Shared: `A4_PORTRAIT`, `A4_LANDSCAPE`, `PAGE_MARGIN = 14`. Calibration keeps its local `M = 12`.

### Line-item UI differences between the two pages (must be preserved)
| Aspect | NewInvoice | NewCustomInvoice |
|---|---|---|
| Row dim when untoggled | `opacity-40` class | n/a |
| Leading cell | checkbox for id `makanberadab`, index otherwise | index |
| Description input | `disabled={li.protected}` + `disabled:bg-transparent disabled:cursor-default` classes | plain |
| Qty input | `disabled={li.id==='katering'}` + disabled classes | plain |
| Delete button | hidden when `protected`, never disabled | always shown, `disabled={items.length<=1}`, `disabled:opacity-30 disabled:cursor-not-allowed` |
| Add button | full-width ghost row: `flex w-full items-center justify-center gap-1.5 min-h-12 border-t border-line text-sm font-semibold …`, `Plus size={14}` | wrapper `px-4 py-3 border-t border-line`, inner `text-xs font-semibold`, `Plus size={13}` |
| Subtotal | only `toggled` items | all items |

Design: `FormItem` gains optional flags (`protected`, `toggled`, `toggleable`, `qtyLocked`). Editor renders per flags. Add button controlled by prop `addButtonVariant: 'row' | 'compact'`. Delete disabled state driven by `canRemove` prop. Class strings copied verbatim into the two branches.

### Invoice number — old vs new
Old: `INV-${year}-${pad3(count(all invoices)+1)}`. New: `INV-${year}-${pad3(counter[year]+1)}`. After seeding `counters/invoice.{year} = max existing NNN for that year`, the next issued number equals old behaviour **unless** invoices were deleted before (old code would then re-issue an already-used number — the bug being fixed). `padStart(3,'0')` kept, so 4-digit overflow behaves as today.

### Dead Functions — confirmed
`grep httpsCallable src/` → only `changeUserRole`, `cleanupOldTaskAssignmentsManual`. So `createInvoice`, `updateInvoiceStatus` **and** `generateWeeklyExportData` have no caller (Dashboard builds the weekly PDF client-side with `calculateIngredients` from `src/lib`). `functions/src/ingredient-calculator.ts` is imported only by `generateWeeklyExportData`. All four removable. Note: removing exports means the next `firebase deploy --only functions` will prompt to delete the deployed functions — that's expected, happens later, not in this phase.

---

### Task 1: `src/lib/pricing.ts`

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/pricing.test.ts`
- Modify: `src/pages/invoices/NewInvoice.tsx:17-35, 84-101, 104`

**Interfaces:**
- Produces:
  - `getKateringUnitPrice(pax: number): number` — `pax < 300 ? 15 : 10.5`
  - `getGajiPekerja(pax: number): number` — bracket lookup, `2000` beyond 1500
  - `getBerkatSuggestion(pax: number): number`
  - `MAKAN_BERADAB_PRICE = 100`
  - `GAJI_TABLE: readonly [number, number][]` (exported for tests / future settings UI)
  - `fmtUnitPriceInput(n: number): string` — `Number.isInteger(n) ? String(n) : n.toFixed(2)` → `"15"`, `"10.50"`. Exists only to keep the pre-filled input text byte-identical to today's literals. Add test: `expect(fmtUnitPriceInput(15)).toBe('15'); expect(fmtUnitPriceInput(10.5)).toBe('10.50')`.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/pricing.test.ts
import { describe, it, expect } from 'vitest'
import { getKateringUnitPrice, getGajiPekerja, getBerkatSuggestion, MAKAN_BERADAB_PRICE, GAJI_TABLE } from './pricing'

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

  it('constants', () => {
    expect(MAKAN_BERADAB_PRICE).toBe(100)
    expect(GAJI_TABLE).toHaveLength(9)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm vitest run src/lib/pricing.test.ts`
Expected: FAIL — cannot resolve `./pricing`

- [ ] **Step 3: Implement**

```ts
// src/lib/pricing.ts
// ── Single source of truth for RM prices used in documents ─────────────────
// Values are the ones previously hardcoded in NewInvoice.tsx. Do not add
// price literals to pages — add them here.

export const MAKAN_BERADAB_PRICE = 100

/** Katering per-pax tier: < 300 pax → RM15.00, >= 300 pax → RM10.50 */
export function getKateringUnitPrice(pax: number): number {
  return pax < 300 ? 15 : 10.5
}

/** Gaji pekerja lookup — pax rounds UP to nearest bracket. [bracket, RM] */
export const GAJI_TABLE: readonly [number, number][] = [
  [300, 530], [400, 590], [500, 850], [650, 910],
  [700, 970], [800, 1030], [1000, 1150], [1300, 1680], [1500, 2000],
]

export function getGajiPekerja(pax: number): number {
  for (const [bracket, gaji] of GAJI_TABLE) {
    if (pax <= bracket) return gaji
  }
  return 2000
}

/** Berkat suggestion: ≤500 → 100, ≤800 → 200, else 300 */
export function getBerkatSuggestion(pax: number): number {
  if (pax <= 500) return 100
  if (pax <= 800) return 200
  return 300
}
```

- [ ] **Step 4: Run tests → PASS**

Run: `pnpm vitest run src/lib/pricing.test.ts`

- [ ] **Step 5: Switch `NewInvoice.tsx`**

Delete lines 17-35 (`GAJI_TABLE`, `getGajiSuggestion`, `getBerkatSuggestion`). Add import:
```ts
import { getKateringUnitPrice, getGajiPekerja, getBerkatSuggestion, MAKAN_BERADAB_PRICE } from '@/lib/pricing'
```
In the pre-populate effect replace:
- `unit_price: event.pax < 300 ? '15' : '10.50'` → `unit_price: String(getKateringUnitPrice(event.pax))`

  ⚠ `String(10.5)` is `"10.5"`, old literal was `"10.50"`. The input is `type="number"`; `parseFloat` gives `10.5` both ways, stored value and PDF (`fmtRM` → `toFixed(2)`) identical. The only visible difference is the text inside the price input before user edits: `10.5` vs `10.50`. To keep it byte-identical use `unit_price: getKateringUnitPrice(event.pax).toFixed(2)` → `"10.50"` / `"15.00"`. **But** old code showed `"15"` for <300, not `"15.00"`. To be exactly identical: `event.pax < 300 ? '15' : '10.50'` must come from a formatter. Decision: add `export function fmtUnitPriceInput(n: number): string { return Number.isInteger(n) ? String(n) : n.toFixed(2) }` to `pricing.ts` and use it: gives `"15"` and `"10.50"`. Test it.
- `unit_price: '100'` (makanberadab) → `unit_price: String(MAKAN_BERADAB_PRICE)`
- `String(getBerkatSuggestion(event.pax))` unchanged (now imported)
- `setGajiPerkerja(String(getGajiSuggestion(event.pax)))` → `setGajiPerkerja(String(getGajiPekerja(event.pax)))`

- [ ] **Step 6: Verify**

Run: `pnpm build && pnpm test && pnpm lint` — all green. `grep -rn "10.50\|GAJI_TABLE\|getBerkat" src/pages` → only imports remain.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts src/pages/invoices/NewInvoice.tsx
git commit -m "refactor: extract pricing tables to src/lib/pricing.ts"
```

---

### Task 2: `src/lib/date-utils.ts`

**Files:**
- Create: `src/lib/date-utils.ts`, `src/lib/date-utils.test.ts`
- Modify: `src/lib/invoice-pdf.ts:31-41`, `src/lib/weekly-export-pdf.ts:26-34`, `src/pages/invoices/InvoiceDetail.tsx:26-31`, `src/pages/Invoices.tsx:16`

**Interfaces:**
- Produces: `tsToDate(ts: unknown): Date`, `fmtDateDMY(d: Date): string` ("DD/MM/YYYY")

- [ ] **Step 1: Failing tests**

```ts
// src/lib/date-utils.test.ts
import { describe, it, expect } from 'vitest'
import { tsToDate, fmtDateDMY } from './date-utils'

describe('tsToDate', () => {
  it('passes Date through', () => {
    const d = new Date(2026, 0, 5); expect(tsToDate(d)).toBe(d)
  })
  it('calls toDate() on Firestore Timestamp-like', () => {
    const d = new Date(2026, 4, 1)
    expect(tsToDate({ toDate: () => d })).toBe(d)
  })
  it('handles {seconds} and {_seconds}', () => {
    expect(tsToDate({ seconds: 86400 }).getTime()).toBe(86400_000)
    expect(tsToDate({ _seconds: 86400 }).getTime()).toBe(86400_000)
  })
  it('parses ISO string', () => {
    expect(tsToDate('2026-03-01T00:00:00Z').toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })
  it('falsy → now (not Invalid Date)', () => {
    expect(Number.isNaN(tsToDate(null).getTime())).toBe(false)
  })
})

describe('fmtDateDMY', () => {
  it('zero-pads DD/MM/YYYY', () => {
    expect(fmtDateDMY(new Date(2026, 0, 5))).toBe('05/01/2026')
    expect(fmtDateDMY(new Date(2026, 11, 25))).toBe('25/12/2026')
  })
})
```

- [ ] **Step 2: Run → FAIL (module missing)**

- [ ] **Step 3: Implement (weekly-export version, superset)**

```ts
// src/lib/date-utils.ts
/** Coerce Firestore Timestamp / admin-SDK JSON / string / Date into Date. */
export function tsToDate(ts: any): Date {
  if (!ts) return new Date()
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  if (typeof ts === 'string') return new Date(ts)
  if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000)
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  return new Date(ts)
}

/** DD/MM/YYYY — used on invoice PDF and InvoiceDetail. */
export function fmtDateDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Replace call-sites**

- `invoice-pdf.ts`: delete local `tsToDate` (31-37) and `fmtDate` (39-41). Add `import { tsToDate, fmtDateDMY } from './date-utils'`. Rename usage `fmtDate(invDate)` → `fmtDateDMY(invDate)`. **Keep** `export { tsToDate }` re-export? No — update importers instead: `Invoices.tsx:16` and `InvoiceDetail.tsx:9` change `tsToDate` import source to `@/lib/date-utils`.
- `weekly-export-pdf.ts`: delete local `tsToDate` (26-34), add `import { tsToDate } from './date-utils'`. `fmtDay`, `fmtNow`, `fmtWeekRange` stay.
- `InvoiceDetail.tsx`: delete local `fmtDate` (26-31), import `fmtDateDMY`, replace `fmtDate(invDate)` at line 211.

- [ ] **Step 6: Verify** `pnpm build && pnpm test && pnpm lint`. `grep -rn "function tsToDate\|function fmtDate(" src` → only `date-utils.ts` and `calibration-form-pdf.ts` (its `fmtDate()` is a different format — untouched).

- [ ] **Step 7: Commit** `refactor: single tsToDate/fmtDateDMY in date-utils`

---

### Task 3: `src/lib/pdf-common.ts`

**Files:**
- Create: `src/lib/pdf-common.ts`
- Modify: `src/lib/invoice-pdf.ts`, `src/lib/weekly-export-pdf.ts`, `src/lib/calibration-form-pdf.ts`, `src/pages/Dashboard.tsx:16`, `src/pages/settings/IngredientsSettings.tsx:21`, `src/pages/invoices/{NewInvoice,NewCustomInvoice,InvoiceDetail}.tsx` (import of `getLogoBase64`)

**Interfaces:**
- Produces:
```ts
export type RGB = [number, number, number]
export const A4_PORTRAIT  = { w: 210, h: 297 } as const
export const A4_LANDSCAPE = { w: 297, h: 210 } as const
export const PAGE_MARGIN = 14
export const COLOR = {
  ink:       [17, 24, 39]    as RGB,   // headings, table header bg
  brandRed:  [196, 32, 42]   as RGB,   // separator line, total
  gray:      [107, 114, 128] as RGB,   // body meta text
  grayLight: [156, 163, 175] as RGB,   // labels, item numbers
  line:      [229, 231, 235] as RGB,   // hairline dividers
  lineDark:  [209, 213, 219] as RGB,   // totals divider
  rowAlt:    [249, 249, 249] as RGB,   // zebra row
  white:     [255, 255, 255] as RGB,
}
export const COMPANY = {
  name: 'KAKMELL RESOURCES',
  address1: 'NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,',
  address2: '81700 PASIR GUDANG, JOHOR',
  phone: 'Phone: +6018-397 0769',
  bankName: 'HONG LEONG BANK',
  bankAccount: '32601052091',
}
export function fonts(pdf: jsPDF): { bold(sz: number): void; reg(sz: number): void; italic(sz: number): void }
export function getLogoBase64(): Promise<string>                       // moved verbatim
export function drawLogo(pdf, logo: string, box: { x: number; y: number; w: number; h: number }): void
/** Draws 3 address lines at 7.5pt gray starting at (x, y); returns y of last line. */
export function drawCompanyAddress(pdf, x: number, y: number): number
/** Divider at y, then bold/regular lines below, optional right-aligned page label. */
export function drawFooterNote(pdf, opts: { y: number; x: number; right: number; lines: { text: string; bold?: boolean; size: number; color?: RGB; gapAfter: number }[]; pageLabel?: string }): void
```

- [ ] **Step 1: Create `pdf-common.ts`** with the above. Bodies:

```ts
import type jsPDF from 'jspdf'

export function fonts(pdf: jsPDF) {
  return {
    bold:   (sz: number) => { pdf.setFont('helvetica', 'bold');   pdf.setFontSize(sz) },
    reg:    (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) },
    italic: (sz: number) => { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(sz) },
  }
}

export function getLogoBase64(): Promise<string> { /* verbatim from invoice-pdf.ts:87-101 */ }

export function drawLogo(pdf: jsPDF, logo: string, box: { x: number; y: number; w: number; h: number }) {
  pdf.addImage(logo, 'PNG', box.x, box.y, box.w, box.h)
}

export function drawCompanyAddress(pdf: jsPDF, x: number, y: number): number {
  const { reg } = fonts(pdf)
  reg(7.5); pdf.setTextColor(...COLOR.gray)
  pdf.text(COMPANY.address1, x, y); y += 4
  pdf.text(COMPANY.address2, x, y); y += 4
  pdf.text(COMPANY.phone, x, y)
  return y
}

export function drawFooterNote(pdf: jsPDF, opts: {...}) {
  const { bold, reg } = fonts(pdf)
  pdf.setDrawColor(...COLOR.line); pdf.setLineWidth(0.2)
  pdf.line(opts.x, opts.y, opts.right, opts.y)
  let fy = opts.y + 5
  for (const ln of opts.lines) {
    (ln.bold ? bold : reg)(ln.size)
    pdf.setTextColor(...(ln.color ?? COLOR.ink))
    pdf.text(ln.text, opts.x, fy)
    fy += ln.gapAfter
  }
  if (opts.pageLabel) {
    reg(6.5); pdf.setTextColor(...COLOR.grayLight)
    pdf.text(opts.pageLabel, opts.right, opts.y + 5, { align: 'right' })
  }
}
```

- [ ] **Step 2: Refactor `invoice-pdf.ts`** — mechanical substitutions, coordinates untouched:
  - delete `getLogoBase64` (87-101); import from `./pdf-common`
  - `const W = 210` → `const W = A4_PORTRAIT.w`; `const M = 14` → `const M = PAGE_MARGIN`
  - `const bold = …; const reg = …` → `const { bold, reg } = fonts(pdf)`
  - `pdf.addImage(logoBase64, 'PNG', M, y, 45, 15)` → `drawLogo(pdf, logoBase64, { x: M, y, w: 45, h: 15 })`
  - address block (3 `pdf.text` + `reg(7.5)` + colour) → `y = drawCompanyAddress(pdf, M, y)` (returns same y as before: y+8)
  - every RGB literal → `COLOR.*` spread (`pdf.setTextColor(...COLOR.gray)`) — map: 17,24,39→ink; 196,32,42→brandRed; 107,114,128→gray; 156,163,175→grayLight; 229,231,235→line; 209,213,219→lineDark; 249,249,249→rowAlt; 255,255,255→white
  - footer block (lines 232-246) → 
    ```ts
    drawFooterNote(pdf, { y: 268, x: M, right: W - M, pageLabel: 'Page 1 of 1', lines: [
      { text: 'Thank You For Your Business!', bold: true, size: 8,   gapAfter: 5   },
      { text: COMPANY.name,                   bold: true, size: 7.5, gapAfter: 4.5 },
      { text: COMPANY.bankAccount,                        size: 7.5, gapAfter: 4.5 },
      { text: COMPANY.bankName,                           size: 7.5, gapAfter: 0   },
    ]})
    ```
    Check against original: original sets `bold(7.5)` for company name then `reg(7.5)` for the two bank lines, colour ink for all — matches. Original draws page label with `reg(6.5)` grayLight at `footY + 5` right — matches.
  - `Customer ID: CUST-001` string stays inline (invoice-specific).
- [ ] **Step 3: Refactor `weekly-export-pdf.ts`** (minimal): `const { bold, reg } = fonts(pdf)`; `const RED = COLOR.brandRed`; `W = A4_PORTRAIT.w`, `MX = PAGE_MARGIN`; `pdf.addImage(logoBase64,'PNG',MX,MT,38,13)` → `drawLogo(pdf, logoBase64, { x: MX, y: MT, w: 38, h: 13 })`. Leave all other literals (this file has bespoke greys like 180,180,180). Do not restructure.
- [ ] **Step 4: Refactor `calibration-form-pdf.ts`** (minimal): `const { bold, reg, italic } = fonts(pdf)`; `W = A4_LANDSCAPE.w`, `H = A4_LANDSCAPE.h`; keep `M = 12`; `pdf.addImage(logoBase64,'PNG',W-M-36,y,36,13)` → `drawLogo(pdf, logoBase64, { x: W - M - 36, y, w: 36, h: 13 })`. Keep its own palette consts (BLACK/DARK/… are intentionally different).
- [ ] **Step 5: Fix importers of `getLogoBase64`**: `Dashboard.tsx:16`, `IngredientsSettings.tsx:21`, `NewInvoice.tsx:11`, `NewCustomInvoice.tsx:9`, `InvoiceDetail.tsx:9` → `from '@/lib/pdf-common'`.
- [ ] **Step 6: Verify** `pnpm build && pnpm test && pnpm lint`. `grep -rn "addImage\|setFont('helvetica'" src/lib` → only inside `pdf-common.ts`.
- [ ] **Step 7: Manual PDF byte check (executor)**: before Step 2, generate the three PDFs from the running app and keep them (`before-invoice.pdf`, `before-weekly.pdf`, `before-calib.pdf`). After Step 6 regenerate. jsPDF embeds a creation timestamp so bytes differ; compare visually side-by-side at 200% and/or `pdftotext -layout` diff if poppler available. Record result in the commit message.
- [ ] **Step 8: Commit** `refactor: shared jsPDF primitives in pdf-common`

---

### Task 4: `src/lib/document-number.ts` + rules + migration script

**Files:**
- Create: `src/lib/document-number.ts`, `src/lib/document-number.test.ts`, `scripts/seed-counters.ts`
- Modify: `firestore.rules` (after `invoices` block), `package.json` scripts, `NewInvoice.tsx:36-40,148`, `NewCustomInvoice.tsx:14-18,73`

**Interfaces:**
- Produces:
```ts
export type DocumentKind = 'invoice' | 'quotation'
export const DOCUMENT_PREFIX: Record<DocumentKind, string> = { invoice: 'INV', quotation: 'QUO' }
export function formatDocumentNumber(kind: DocumentKind, year: number, seq: number): string  // INV-2026-007
export function parseDocumentNumber(no: string): { kind: DocumentKind; year: number; seq: number } | null
export async function nextDocumentNumber(kind: DocumentKind, year = new Date().getFullYear()): Promise<string>
```
- Firestore: `counters/{kind}` document, fields `{ [year: string]: number }` e.g. `{ "2026": 12 }`.

- [ ] **Step 1: Failing tests (pure part)**

```ts
// src/lib/document-number.test.ts
import { describe, it, expect } from 'vitest'
import { formatDocumentNumber, parseDocumentNumber } from './document-number'

describe('formatDocumentNumber', () => {
  it('pads to 3: 001, 010, 100; grows beyond 999', () => {
    expect(formatDocumentNumber('invoice', 2026, 1)).toBe('INV-2026-001')
    expect(formatDocumentNumber('invoice', 2026, 10)).toBe('INV-2026-010')
    expect(formatDocumentNumber('invoice', 2026, 100)).toBe('INV-2026-100')
    expect(formatDocumentNumber('invoice', 2026, 1234)).toBe('INV-2026-1234')
    expect(formatDocumentNumber('quotation', 2027, 7)).toBe('QUO-2027-007')
  })
  it('year rollover: sequence is per year, new year restarts from 001', () => {
    // nextSequence is the pure core used by the transaction: (counterDoc, year) → next seq
    expect(nextSequence({ '2026': 42 }, 2026)).toBe(43)
    expect(nextSequence({ '2026': 42 }, 2027)).toBe(1)     // year field absent → init 0 → 1
    expect(nextSequence(undefined, 2026)).toBe(1)          // counter doc absent
    expect(formatDocumentNumber('invoice', 2027, nextSequence({ '2026': 42 }, 2027))).toBe('INV-2027-001')
  })
})

describe('parseDocumentNumber', () => {
  it('round-trips', () => {
    expect(parseDocumentNumber('INV-2026-042')).toEqual({ kind: 'invoice', year: 2026, seq: 42 })
    expect(parseDocumentNumber('QUO-2026-003')).toEqual({ kind: 'quotation', year: 2026, seq: 3 })
  })
  it('rejects garbage', () => {
    expect(parseDocumentNumber('INV-abc')).toBeNull()
    expect(parseDocumentNumber('')).toBeNull()
  })
})
```

Note: `nextDocumentNumber` touches Firestore; vitest has no emulator here. Keep it thin (one transaction) and untested by unit test — covered by manual regression. Mock-free by design: `src/lib/firebase.ts` import must not run in tests, so put the pure helpers **above** and the Firestore import must be lazy-safe. Simplest: `import { db } from '@/lib/firebase'` at top would initialise Firebase on import in vitest and fail on missing env. → Split: `document-number.ts` (pure, no firebase import) and `document-number.firestore.ts` (`nextDocumentNumber`, imports `db`). Tests import the pure file only.

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement pure module**

```ts
// src/lib/document-number.ts
export type DocumentKind = 'invoice' | 'quotation'
export const DOCUMENT_PREFIX: Record<DocumentKind, string> = { invoice: 'INV', quotation: 'QUO' }

export function formatDocumentNumber(kind: DocumentKind, year: number, seq: number): string {
  return `${DOCUMENT_PREFIX[kind]}-${year}-${String(seq).padStart(3, '0')}`
}

const RE = /^(INV|QUO)-(\d{4})-(\d+)$/
export function parseDocumentNumber(no: string): { kind: DocumentKind; year: number; seq: number } | null {
  const m = RE.exec(no ?? '')
  if (!m) return null
  const kind = (Object.keys(DOCUMENT_PREFIX) as DocumentKind[]).find(k => DOCUMENT_PREFIX[k] === m[1])!
  return { kind, year: Number(m[2]), seq: Number(m[3]) }
}

/** Counter doc shape: { "2026": 12, "2027": 3 } — year → last issued sequence. */
export type CounterDoc = Record<string, number>

/** Pure core of the transaction: missing doc or missing year field → 0 → next is 1. */
export function nextSequence(counter: CounterDoc | undefined, year: number): number {
  const current = counter?.[String(year)]
  return (typeof current === 'number' && Number.isFinite(current) ? current : 0) + 1
}
```

```ts
// src/lib/document-number.firestore.ts
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatDocumentNumber, nextSequence, type CounterDoc, type DocumentKind } from './document-number'

/**
 * Atomically increments counters/{kind}.{year} and returns the formatted number.
 * Fixes: race between two admins, and re-issue of a number after a delete.
 *
 * Retry: Firestore's runTransaction already retries on contention (default 5
 * attempts) — that covers two admins saving at once. We add ONE outer retry
 * only for the 'aborted' / 'unavailable' error codes (transient network),
 * so a flaky mobile connection does not surface as a failed save.
 */
export async function nextDocumentNumber(kind: DocumentKind, year = new Date().getFullYear()): Promise<string> {
  const ref = doc(db, 'counters', kind)
  const key = String(year)
  const run = () => runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const next = nextSequence(snap.exists() ? (snap.data() as CounterDoc) : undefined, year)
    tx.set(ref, { [key]: next }, { merge: true })
    return next
  })
  let seq: number
  try {
    seq = await run()
  } catch (err: any) {
    if (err?.code === 'aborted' || err?.code === 'unavailable') seq = await run()
    else throw err
  }
  return formatDocumentNumber(kind, year, seq)
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: `firestore.rules`** — insert after the `invoices` block:

```
    // ── counters ───────────────────────────────────────────────────────────
    // Running numbers for documents: counters/invoice, counters/quotation
    // Fields are years → last issued sequence, e.g. { "2026": 12 }
    match /counters/{kind} {
      allow read, write: if isAdmin();
    }
```

- [ ] **Step 6: Switch pages**
  - `NewInvoice.tsx`: delete `nextInvoiceNo` (36-40); `const invoiceNo = await nextDocumentNumber('invoice')`; import from `@/lib/document-number.firestore`.
  - `NewCustomInvoice.tsx`: same (14-18, 73).
  - Remove now-unused `getDocs`/`collection` imports only if no other use remains in each file (`NewInvoice` still uses them for the duplicate check — keep; `NewCustomInvoice` → remove `getDocs`).

- [ ] **Step 7: Migration script (manual run, never auto)**

```ts
// scripts/seed-counters.ts
// One-off: seed counters/invoice from the highest existing INV-YYYY-NNN per year.
// Usage:  pnpm seed:counters            (dry-run, prints plan)
//         pnpm seed:counters --write    (writes counters/invoice)
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? resolve(process.cwd(), 'firebase-service-account.json')
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
const db = getFirestore()

const RE = /^INV-(\d{4})-(\d+)$/
const write = process.argv.includes('--write')

async function main() {
  const snap = await db.collection('invoices').get()
  const maxByYear: Record<string, number> = {}
  const seen = new Map<string, string[]>()
  let unparsed = 0
  for (const d of snap.docs) {
    const no = d.data().invoice_no as string | undefined
    const m = no ? RE.exec(no) : null
    if (!m) { unparsed++; console.warn(`  skip ${d.id}: invoice_no=${no}`); continue }
    const [, year, seqStr] = m
    const seq = Number(seqStr)
    maxByYear[year] = Math.max(maxByYear[year] ?? 0, seq)
    seen.set(no!, [...(seen.get(no!) ?? []), d.id])
  }
  const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1)

  console.log(`invoices scanned: ${snap.size}, unparsed: ${unparsed}`)
  console.log('max per year:', maxByYear)
  if (dupes.length) {
    console.warn('DUPLICATE invoice_no detected (legacy count+1 bug):')
    for (const [no, ids] of dupes) console.warn(`  ${no} → ${ids.join(', ')}`)
  }

  const existing = await db.collection('counters').doc('invoice').get()
  if (existing.exists) console.log('counters/invoice already exists:', existing.data())

  if (!write) { console.log('\nDry run. Re-run with --write to seed counters/invoice.'); return }
  await db.collection('counters').doc('invoice').set(maxByYear, { merge: true })
  console.log('written counters/invoice =', maxByYear)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

`package.json` scripts: add `"seed:counters": "tsx scripts/seed-counters.ts"`.

**Deployment order (user runs manually, in this order):**
1. `firebase deploy --only firestore:rules` (adds `counters` block) — *not in this phase's automated steps*
2. `pnpm seed:counters` → review output → `pnpm seed:counters --write`
3. Deploy hosting build.
   If the new client ships before the counter is seeded, the first invoice becomes `INV-2026-001` (counter starts at 0) → wrong. Seed first.

- [ ] **Step 8: Verify** `pnpm build && pnpm test && pnpm lint`. `grep -rn "nextInvoiceNo\|snap.size + 1" src` → none.
- [ ] **Step 9: Commit** `refactor: transactional per-year document numbers (counters/{kind})`

---

### Task 5: `useLineItems` hook + `LineItemsEditor`

**Files:**
- Create: `src/hooks/useLineItems.ts`, `src/components/LineItemsEditor.tsx`
- Modify: `NewInvoice.tsx` (types 44-52, state 68, handlers 119-137, JSX 237-341), `NewCustomInvoice.tsx` (types 20-25, state 33-37, handlers ~50-63, JSX 197-282)

**Interfaces:**
```ts
// src/hooks/useLineItems.ts
export interface FormItem {
  id: string
  description: string
  qty: string
  unit_price: string
  protected?: boolean    // description locked, no delete button (NewInvoice preset rows)
  toggled?: boolean      // undefined = true; false → row dimmed + excluded from subtotal
  toggleable?: boolean   // leading cell renders checkbox instead of index (makanberadab)
  qtyLocked?: boolean    // qty input disabled (katering)
}
export function newBlankItem(id?: string): FormItem   // { id: id ?? `custom-${Date.now()}`, description:'', qty:'1', unit_price:'', toggled:true }
export function itemTotal(li: FormItem): number       // (parseFloat(qty)||0)*(parseFloat(unit_price)||0)
export function isActive(li: FormItem): boolean       // li.toggled !== false
export function useLineItems(initial: FormItem[] = [], opts: { minItems?: number } = {}): {
  items: FormItem[]
  setItems: React.Dispatch<React.SetStateAction<FormItem[]>>
  updateItem(id: string, field: keyof FormItem, value: string | boolean): void
  addItem(): void
  removeItem(id: string): void        // no-op when items.length <= minItems
  canRemove: boolean                  // items.length > minItems
  subtotal: number                    // Σ itemTotal over active items (useMemo)
  toLineItems(filter?: (li: FormItem) => boolean): InvoiceLineItem[]  // maps to persisted shape, is_deduction:false
}
```
```tsx
// src/components/LineItemsEditor.tsx
export interface LineItemsEditorProps {
  items: FormItem[]
  onUpdate(id: string, field: keyof FormItem, value: string | boolean): void
  onRemove(id: string): void
  onAdd(): void
  canRemove: boolean
  addButtonVariant: 'row' | 'compact'
}
export function LineItemsEditor(props: LineItemsEditorProps): JSX.Element
```
Editor uses `useLanguage().t` for `invoice.description`, `invoice.qty`, `invoice.unitPrice`, `invoice.itemPlaceholder`, `invoice.addItem` and `fmtRM` from `@/lib/invoice-pdf` — existing keys, no i18n change.

- [ ] **Step 1: Write hook** — lift `updateItem/addItem/removeItem/subtotal` verbatim from `NewInvoice.tsx:104-137`; `subtotal` filters `isActive`. `removeItem` guard from `NewCustomInvoice.tsx:60`. `toLineItems` = the `.map` inside each page's `save()`.
- [ ] **Step 2: Write editor** — one JSX, both class-sets preserved:
  - Outer + header: identical in both pages → copy from `NewInvoice.tsx:239-249`.
  - Row: `className={cn('grid items-center px-4 py-2.5 gap-1', li.toggled === false && 'opacity-40')}` (for custom page `toggled` is always true → no class, identical to today).
  - Leading: `li.toggleable ? <checkbox button …verbatim from NewInvoice 262-279> : <span className="text-xs text-ink-soft font-mono tabular-nums">{i+1}</span>`.
  - Description input: `disabled={!!li.protected}` with NewInvoice's class string (contains `disabled:bg-transparent disabled:cursor-default`). For the custom page the extra `disabled:*` utilities are inert when not disabled → identical render. ⚠ Class string differs by those two tokens; DOM `class` attribute differs textually but paint is identical. Accept (document in commit).
  - Qty input: `disabled={!!li.qtyLocked}` + NewInvoice class string. Same note.
  - Unit price + row total: identical in both pages.
  - Delete cell: `li.protected ? null : <button onClick={() => onRemove(li.id)} disabled={!canRemove} className="text-ink-soft/50 hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={13} /></button>`. NewInvoice passes `canRemove=true` always (minItems 0) → never disabled → same paint.
  - Add button: `addButtonVariant === 'row'` → NewInvoice markup verbatim (`Plus size={14}`); `'compact'` → NewCustomInvoice markup verbatim (`Plus size={13}`).
- [ ] **Step 3: Switch `NewInvoice.tsx`**: preset rows become
  ```ts
  { id: 'katering',     description: `Katering — ${event.hall_name} — ${event.pax} pax`, qty: String(event.pax), unit_price: fmtUnitPriceInput(getKateringUnitPrice(event.pax)), protected: true, toggled: true, qtyLocked: true },
  { id: 'makanberadab', description: 'Makan Beradab', qty: '1', unit_price: String(MAKAN_BERADAB_PRICE), protected: true, toggled: true, toggleable: true },
  { id: 'berkat',       description: 'Berkat', qty: '1', unit_price: String(getBerkatSuggestion(event.pax)), protected: false, toggled: true },
  ```
  `const { items, setItems, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems } = useLineItems()`; `save()` uses `toLineItems(isActive)`; JSX block 237-341 → `<LineItemsEditor items={items} onUpdate={updateItem} onRemove={removeItem} onAdd={addItem} canRemove={canRemove} addButtonVariant="row" />`.
- [ ] **Step 4: Switch `NewCustomInvoice.tsx`**: `useLineItems([newBlankItem('r1'), newBlankItem('r2'), newBlankItem('r3')], { minItems: 1 })`; `save()` keeps its own filter: `toLineItems(li => li.description.trim() !== '' && parseFloat(li.unit_price) > 0)` — and keep the pre-check `activeItems.length === 0` toast exactly as now; JSX → `<LineItemsEditor … addButtonVariant="compact" />`.
- [ ] **Step 5: Verify** build/test/lint. Visual diff: open both pages before/after in browser at same width, screenshot, compare (executor notes result).
- [ ] **Step 6: Commit** `refactor: shared LineItemsEditor + useLineItems`

---

### Task 6: `DocumentStatusBadge`

**Files:**
- Create: `src/components/DocumentStatusBadge.tsx`
- Modify: `src/pages/Invoices.tsx:22-26, 200-206, 218`, `src/pages/invoices/InvoiceDetail.tsx:14-24, 154-160, 177, 190`

**Interfaces:**
```ts
import type { DocumentKind } from '@/lib/document-number'   // 'invoice' | 'quotation' — do NOT redeclare
export interface StatusMeta { badge: BadgeStatus; labelKey: StringKey; strip: string }
// Partial: 'quotation' entry is added in Phase 2 together with its i18n keys
export const DOCUMENT_STATUS: Partial<Record<DocumentKind, Record<string, StatusMeta>>> = {
  invoice: {
    draft: { badge: 'neutral', labelKey: 'invoice.statusDraft', strip: 'bg-ink/15' },
    sent:  { badge: 'warn',    labelKey: 'invoice.statusSent',  strip: 'bg-warn'   },
    paid:  { badge: 'ok',      labelKey: 'invoice.statusPaid',  strip: 'bg-ok'     },
  },
}
export function getStatusMeta(kind: DocumentKind, status: string): StatusMeta   // falls back to draft meta
export function DocumentStatusBadge({ kind, status, className }: { kind: DocumentKind; status: string; className?: string }): JSX.Element
// renders <Badge status={meta.badge} className={className}>{t(meta.labelKey)}</Badge>
```

- [ ] **Step 1: Create component** (imports `Badge` from `@/components/ui-kit`, `useLanguage`, `type StringKey` from `@/lib/i18n`, `type DocumentKind` from `@/lib/document-number`).
- [ ] **Step 2: `Invoices.tsx`**: delete `STATUS_BADGE` + inline `statusLabel` map; `<Badge status={STATUS_BADGE[statusKey]}>{statusLabel}</Badge>` → `<DocumentStatusBadge kind="invoice" status={inv.status} />`.
- [ ] **Step 3: `InvoiceDetail.tsx`**: delete `STATUS_BADGE`, `STATUS_STRIP`, `statusLabel` map; badge → component; strip → `getStatusMeta('invoice', invoice.status).strip`.
- [ ] **Step 4: Verify** build/test/lint; `grep -rn "STATUS_BADGE\|STATUS_STRIP" src` → none.
- [ ] **Step 5: Commit** `refactor: DocumentStatusBadge`

---

### Task 7: Dead Functions removal

**Pre-check (mandatory, paste output in report):**
```
grep -n "export const \(createInvoice\|updateInvoiceStatus\|generateWeeklyExportData\) = " functions/src/index.ts
grep -rn "httpsCallable(" src
```
Expected: all three are `onCall(` (verified 2026-09-09: `generateWeeklyExportData` :99, `createInvoice` :139, `updateInvoiceStatus` :187 — all `onCall`); the only `httpsCallable` names in `src/` are `changeUserRole` and `cleanupOldTaskAssignmentsManual`. If `generateWeeklyExportData` is anything other than `onCall`, or any caller appears, STOP and report — do not delete it or the calculator.

**Files:**
- Modify: `functions/src/index.ts` — remove `LineItem`, `CreateInvoiceData`, `UpdateInvoiceStatusData`, `WeeklyExportData` types; remove `createInvoice`, `updateInvoiceStatus`, `generateWeeklyExportData`; remove `import { calculateIngredients } from "./ingredient-calculator.js"`; remove `Timestamp` from firebase-admin import if unused after.
- Delete: `functions/src/ingredient-calculator.ts`

- [ ] **Step 1**: `cd functions && npm run build` (tsc) must pass. `npm run lint` if configured.
- [ ] **Step 2**: Do NOT deploy. Note in commit: next `firebase deploy --only functions` will offer to delete 3 cloud functions — accept.
- [ ] **Step 3: Commit** `chore(functions): remove unused createInvoice/updateInvoiceStatus/generateWeeklyExportData and stale calculator`

---

## Final verification (before reporting done)

```bash
pnpm build          # tsc -b && vite build
pnpm test           # vitest — i18n key parity + calculator + new pricing/date/document-number tests
pnpm lint
cd functions && npm run build
```

Grep gates (all must return nothing in `src/pages`):
```
grep -rn "10.50\|GAJI_TABLE\|snap.size + 1\|nextInvoiceNo\|STATUS_BADGE\|function tsToDate\|addImage(" src/pages
```

### Manual regression list (user)
1. **Rules + counter first**: deploy rules, run `pnpm seed:counters` (dry), then `--write`. Confirm `counters/invoice` shows `{ "2026": <max> }` in console.
2. Create invoice from an event (`/events/:id` → Create Invoice): preset rows show `Katering … pax`, qty locked; Makan Beradab checkbox toggles + dims row; Berkat editable; delete hidden on preset rows; add-row button full-width; Gaji suggestion correct for pax. Save Draft → number is `INV-2026-(max+1)`.
3. Create custom invoice: 3 blank rows, delete disabled at 1 row, compact add button, gaji toggle, validation toasts. Save → next sequential number (not a reused one).
4. Two tabs, click save simultaneously → two different numbers.
5. Download PDF for: (a) regular invoice, (b) custom invoice, (c) weekly report from Dashboard (all / upcoming / selected), (d) calibration form from More → Ingredients. Compare against PDFs generated before the refactor — same layout, logo size/position, colours, footer, page label.
6. `/invoices` list: badges and labels unchanged in EN and BM; filters unchanged. `/invoices/:id`: status strip colour, badge, date `DD/MM/YYYY`, mark sent/paid, delete.
7. Global search still opens invoices.

### Diff summary (fill in at completion)
| | Files | Note |
|---|---|---|
| New | 10 | 5 lib + 2 tests-lib + 1 hook + 2 components + 1 script |
| Modified | 11 | 4 invoice pages, 3 pdf libs, Dashboard, IngredientsSettings, rules, package.json |
| Deleted | 1 (+3 exports) | functions calculator, dead callables |
| Net LOC | expected ≈ −150 | measured with `git diff --stat` at end |
