# Phase 2 — Quotation (Sebut Harga) Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `quotations` module (list / new / detail / PDF / revision / convert-to-invoice) that composes the Phase 1 shared document layer instead of duplicating invoice code.

**Architecture:** New Firestore collection `quotations` (admin-only), three pages under `/quotations`, one PDF generator on `pdf-common`, one pure helpers module (`src/lib/quotations.ts`) that owns the types, validity/expiry rules and the quote→invoice payload. Numbers come from `nextDocumentNumber('quotation', quotationDate.getFullYear())`. Shared layer is extended in exactly four places (listed below); nothing in the invoice flow changes behaviour except accepting an optional `?quotationId=` prefill.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Firebase JS SDK 12 (Firestore), jsPDF 4, Vitest 4, Tailwind 3, ui-kit components.

**Spec:** User message 2026-09-09 "FASA 2 — QUOTATION FEATURE" (fixed decisions + schema + pages + nav + PDF + i18n + verification). This plan argues from it.

## Global Constraints (verbatim from spec)

- Collection baru: `quotations`. Bukan reuse `invoices`.
- Recipient: customer bebas taip sendiri.
- Satu event boleh banyak quotation (revisi).
- PDF: breakdown penuh, TIADA bank details, TIADA potongan gaji pekerja.
- Nombor: `nextDocumentNumber('quotation', <tahun dari quotation_date>)`.
- Harga dari `pricing.ts` sahaja. Line item guna `LineItemsEditor` + `useLineItems`.
- JANGAN tambah item ke-6 dalam BottomNav. Sidebar desktop boleh tambah item penuh.
- Dashboard: JANGAN masukkan quotation dalam revenue chart.
- List query guna `limit` + `orderBy`, jangan `onSnapshot` seluruh collection.
- i18n: semua key `quotation.*` dalam `en` DAN `ms` (parity test). BM: "Sebut Harga".
- `pnpm build` + `pnpm test` lulus; `pnpm lint` tak melebihi baseline **25 problems (23 errors, 2 warnings)**.
- JANGAN deploy apa-apa.
- Branch: `feature/quotations` from `main` (`d4b3bc0`). Commit format `feat(quotations): …`, one commit per task, attribution lines as in Phase 1, `git -c core.safecrlf=false commit`.
- Working tree at start has ` M .firebase/hosting.ZGlzdA.cache` (deploy artifact). Task 0 commits it as `chore: hosting cache after phase 1 deploy` so every task diff is clean.

---

## Shared layer — exact exports used (read 2026-09-09 from `main`)

| Module | Export (signature) | Used by |
|---|---|---|
| `src/lib/pricing.ts` | `getKateringUnitPrice(pax: number): number` · `MAKAN_BERADAB_PRICE = 100` · `getBerkatSuggestion(pax: number): number` · `fmtUnitPriceInput(n: number): string` | NewQuotation pre-populate from event |
| `src/lib/date-utils.ts` | `tsToDate(ts: unknown): Date` · `fmtDateDMY(d: Date): string` | list, detail, PDF, helpers |
| `src/lib/pdf-common.ts` | `A4_PORTRAIT` · `PAGE_MARGIN` · `COLOR` · `COMPANY` · `fonts(pdf)` → `{bold, reg, italic}` · `getLogoBase64(): Promise<string>` · `drawLogo(pdf, logo, {x,y,w,h})` · `drawCompanyAddress(pdf, x, y): number` · `drawFooterNote(pdf, {y, x, right, lines[], pageLabel?})` | `quotation-pdf.ts` |
| `src/lib/document-number.ts` | `type DocumentKind = 'invoice' \| 'quotation'` · `parseDocumentNumber(no)` | types, tests |
| `src/lib/document-number.firestore.ts` | `nextDocumentNumber(kind: DocumentKind, year: number): Promise<string>` | NewQuotation save |
| `src/lib/document-status.ts` | `DOCUMENT_STATUS` · `getStatusMeta(kind, status): StatusMeta` | detail strip, list |
| `src/components/DocumentStatusBadge.tsx` | `<DocumentStatusBadge kind status className? />` | list, detail |
| `src/hooks/useLineItems.ts` | `FormItem` · `newBlankItem(id?)` · `itemTotal(li)` · `isActive(li)` · `useLineItems(initial?, {minItems?})` → `{ items, setItems, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems(filter?) }` | NewQuotation form |
| `src/components/LineItemsEditor.tsx` | `<LineItemsEditor items onUpdate onRemove onAdd canRemove addButtonVariant="row"\|"compact" />` | NewQuotation form |
| `src/lib/invoice-pdf.ts` | `InvoiceLineItem` (shape of `line_items[]`) · `fmtRM(n)` | reused as `line_items` element type + money format |
| `src/lib/activity-logger.ts` | `logActivity({action, category, description, entity_id?, entity_name?, performed_by, performed_by_name})` | all quote mutations |

### Shared layer — extensions required (the ONLY shared edits)

1. `src/lib/document-status.ts` — add `quotation` entry to `DOCUMENT_STATUS` (draft/sent/accepted/rejected/expired). Type stays `Partial<Record<DocumentKind, …>>`.
2. `src/hooks/useLineItems.ts` — add `fromLineItems(items: InvoiceLineItem[], idPrefix?: string): FormItem[]` (inverse of `toLineItems`; needed by revision prefill and convert-to-invoice prefill).
3. `src/lib/activity-logger.ts` — category union `+ 'quotation'`.
4. `src/pages/invoices/NewInvoice.tsx` + `NewCustomInvoice.tsx` — accept optional `?quotationId=` (prefill items/billed-to from the quote; after save write `converted_invoice_id` back). No change when the param is absent.

Nothing else in Phase 1 modules changes.

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/quotations.ts` | Types (`QuotationDoc`, `QuotationStatus`, `QuotationCustomer`), `QUOTATION_STATUSES`, `defaultValidUntil`, `effectiveStatus`, `quoteToInvoicePayload`, `buildQuotationFilename`, `computeTotals` |
| Create | `src/lib/quotations.test.ts` | Unit tests for the pure helpers |
| Create | `src/lib/quotation-pdf.ts` | `generateQuotationPDF(quote, logoBase64, filename?)` on `pdf-common` |
| Create | `src/hooks/useQuotations.ts` | `useQuotations({ eventId?, limit? })` bounded list; `useQuotation(id)`; `useQuotationRevisionMap` |
| Create | `src/pages/Quotations.tsx` | List + filter + stats (template `Invoices.tsx`) |
| Create | `src/pages/quotations/NewQuotation.tsx` | Form (template `NewCustomInvoice.tsx`) — `?eventId=`, `?revisionOf=` |
| Create | `src/pages/quotations/QuotationDetail.tsx` | Detail + status + PDF + Buat Revisi + Tukar ke Invoice (template `InvoiceDetail.tsx`) |
| Modify | `src/lib/document-status.ts` | + quotation statuses |
| Modify | `src/hooks/useLineItems.ts` | + `fromLineItems` |
| Modify | `src/lib/activity-logger.ts` | + `'quotation'` |
| Modify | `src/lib/i18n.ts` | + `quotation.*`, `nav.quotations`, `activityLog.filterQuotations` (en + ms) |
| Modify | `src/router/index.tsx` | + 3 routes (order: `/quotations/new`, `/quotations/:id`, `/quotations`) |
| Modify | `src/components/layout/Sidebar.tsx` | + nav item (admin) |
| Modify | `src/pages/More.tsx` | + row "Sebut Harga" under Operations (admin) → `/quotations` (see Decision D1) |
| Modify | `src/pages/events/EventDetail.tsx` | + "Buat Sebut Harga" / "Sebut Harga (n)" row |
| Modify | `src/pages/invoices/NewInvoice.tsx`, `NewCustomInvoice.tsx` | `?quotationId=` prefill + write-back |
| Modify | `src/components/GlobalSearch.tsx` | + quotations section |
| Modify | `src/pages/settings/ActivityLog.tsx` | + quotation category (type, icon, colour, label, filter list) |
| Modify | `firestore.rules` | + `match /quotations/{quotationId}` admin-only |
| Modify | `firestore.indexes.json` | + composite `(event_id ASC, created_at DESC)` on `quotations` |
| Modify | `CLAUDE.md` | Phase 1 corrections + "Shared document layer" section + quotations collection (separate final commit) |

---

## Decisions to confirm (D1–D4) — plan proceeds with these unless you override

- **D1 — /more entry.** `MoreSection.tsx` `SECTIONS` wraps a *settings component* in its own back-button + `<h1>` header at `/more/:section`. The quotations list page has its own header (like `Invoices.tsx`), so registering it in `SECTIONS` would double the header and give it a second URL. Plan: add a `ListRow` "Sebut Harga" to `More.tsx` under **Operations Data** (admin) that navigates to `/quotations`. Entry point is still "under /more" for mobile; BottomNav untouched; Sidebar gets the full item.
- **D2 — `expired` (APPROVED, amended).** Computed ONLY. `effectiveStatus(q, now)` returns `'expired'` for display when `status ∈ {draft, sent}` and `valid_until < now`; badge/strip use the effective status. **No manual "mark expired" action; nothing ever writes `status: 'expired'` to Firestore** — the value stays in the type for display only. Accepted/rejected/converted quotes never show as expired.
- **D3 — List subscription (APPROVED, amended).** `onSnapshot` on `query(quotations, orderBy('created_at','desc'), limit(100))` — bounded, real-time like invoices. Filters (week/month/year/range/status) apply client-side on those ≤100 docs. **When the snapshot holds exactly 100 docs, render a caption under the list: `quotation.showingLatest` ("Menunjukkan 100 sebut harga terkini." / "Showing the latest 100 quotations.")** so the user knows filters run on a subset. Event-scoped list (`?eventId=`) uses `where('event_id','==',id)` + same orderBy — this is the composite index.
- **D4 — Convert target page.** Quote **with** `event_id` → `/invoices/new?eventId=<event>&quotationId=<q>` (NewInvoice; keeps its "invoice already exists for event" redirect). Quote **without** event → `/invoices/custom/new?quotationId=<q>` (billed_to = customer.name, reference = quotation_no). In both, line items come from the quote (gaji pekerja stays invoice-side, suggested from pax as today). **FINAL (D4 approved):** a quote discount > 0 is carried as an extra line item `"Diskaun (QUO-YYYY-NNN)"`, qty 1, unit_price = −discount (negative). **No fallback that drops the discount** — dropping it would bill more than the customer agreed (money bug). `LineItemsEditor` already accepts negative numbers, `toLineItems` keeps the sign, the invoice PDF prints the negative row total and the subtotal nets it.
- **Convert prefill transport (user amendment): NO sessionStorage.** The invoice pages read `?quotationId=` and load the quote from Firestore via `useQuotation(quotationId)`; `quoteToInvoicePayload(q)` runs inside the invoice page. URL + Firestore = single source of truth; refresh/share-safe; no stale state.

---

### Task 0: Branch + housekeeping

- [ ] `git checkout -b feature/quotations main`
- [ ] `git add .firebase/hosting.ZGlzdA.cache && git -c core.safecrlf=false commit -m "chore: hosting cache after phase 1 deploy"` (+ attribution)
- [ ] Confirm baseline: `pnpm build` ✓, `pnpm test` 96 passed, `pnpm lint` 25 problems.

---

### Task 1: `src/lib/quotations.ts` (pure) + tests + `document-status` + `useLineItems.fromLineItems`

**Files:** Create `src/lib/quotations.ts`, `src/lib/quotations.test.ts`. Modify `src/lib/document-status.ts`, `src/hooks/useLineItems.ts`, `src/lib/activity-logger.ts`.

**Produces:**
```ts
// src/lib/quotations.ts
import type { Timestamp } from 'firebase/firestore'
import type { InvoiceLineItem } from '@/lib/invoice-pdf'
import type { FormItem } from '@/hooks/useLineItems'
import { fmtDateDMY, tsToDate } from '@/lib/date-utils'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export const QUOTATION_STATUSES: readonly QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired']
export const VALIDITY_DAYS = 14

export interface QuotationCustomer { name: string; phone?: string; address?: string }

export interface QuotationDoc {
  id: string
  quotation_no: string
  quotation_date: Timestamp | Date
  valid_until: Timestamp | Date
  event_id: string | null
  event_name: string            // snapshot ('' when standalone)
  pax: number                   // snapshot (0 when unknown)
  customer: QuotationCustomer
  line_items: InvoiceLineItem[] // same element shape as invoices
  subtotal: number
  discount?: number             // RM, >= 0
  total: number                 // subtotal - discount
  status: QuotationStatus
  revision_of?: string          // parent quotation id
  converted_invoice_id?: string
  notes?: string
  created_by: string
  created_at: Timestamp | Date
  updated_at: Timestamp | Date
}

/** quotation_date + VALIDITY_DAYS, same clock time. */
export function defaultValidUntil(quotationDate: Date, days = VALIDITY_DAYS): Date

/** Display status: draft/sent past valid_until → 'expired'. Never mutates. */
export function effectiveStatus(q: Pick<QuotationDoc, 'status' | 'valid_until'>, now = new Date()): QuotationStatus

/** subtotal from active items, discount clamped to [0, subtotal], total. */
export function computeTotals(subtotal: number, discount: number): { subtotal: number; discount: number; total: number }

export interface InvoicePrefill {
  target: '/invoices/new' | '/invoices/custom/new'
  search: string                // "?eventId=…&quotationId=…" or "?quotationId=…"
  items: FormItem[]             // description/qty/unit_price as strings; discount → extra negative line (D4)
  billedTo: string              // customer.name (custom target only)
  reference: string             // quotation_no (custom target only)
}
export function quoteToInvoicePayload(q: QuotationDoc): InvoicePrefill

/** QUO-2026-001_NamaCustomer_09092026.pdf — reuses the sanitise rules of buildInvoiceFilename */
export function buildQuotationFilename(q: Pick<QuotationDoc, 'quotation_no' | 'customer' | 'quotation_date'>): string
```
`quoteToInvoicePayload` is pure; the invoice pages call it after loading the quote with `useQuotation(quotationId)` (no sessionStorage — see D4 amendment).

`document-status.ts` addition:
```ts
quotation: {
  draft:    { badge: 'neutral', labelKey: 'quotation.statusDraft',    strip: 'bg-ink/15' },
  sent:     { badge: 'warn',    labelKey: 'quotation.statusSent',     strip: 'bg-warn'   },
  accepted: { badge: 'ok',      labelKey: 'quotation.statusAccepted', strip: 'bg-ok'     },
  rejected: { badge: 'danger',  labelKey: 'quotation.statusRejected', strip: 'bg-danger' },
  expired:  { badge: 'neutral', labelKey: 'quotation.statusExpired',  strip: 'bg-ink/30' },
},
```
(`StringKey` typing means these i18n keys must exist → Task 2 lands in the same commit or before; do Task 2 first in execution order, or add the keys in this task.)

`useLineItems.ts` addition:
```ts
export function fromLineItems(items: InvoiceLineItem[], idPrefix = 'li'): FormItem[] {
  return items.map((li, i) => ({ id: `${idPrefix}-${i}-${Date.now()}`, description: li.description, qty: String(li.qty), unit_price: fmtUnitPriceInput(li.unit_price) }))
}
```
`activity-logger.ts`: `category: 'event' | 'invoice' | 'quotation' | 'user' | 'ingredient' | 'settings' | 'task' | 'menu'`.

- [ ] Tests (write first, run → fail): `defaultValidUntil` (+14 d, custom days, month rollover); `effectiveStatus` (draft+past → expired; sent+future → sent; accepted+past → accepted; rejected+past → rejected; stored expired → expired); `computeTotals` (clamp negative discount to 0, clamp > subtotal); `quoteToInvoicePayload` (event → `/invoices/new` + both params; standalone → custom target + billedTo/reference; items strings; discount → extra line `unit_price: '-50'`); `buildQuotationFilename` (sanitised, ≤ 80 chars); `getStatusMeta('quotation', 'accepted').badge === 'ok'`, unknown → draft; `fromLineItems` round-trip with `toLineItems` totals equal; `parseDocumentNumber('QUO-2026-007')`.
- [ ] Implement; `pnpm test` green; `pnpm lint` unchanged.
- [ ] Commit `feat(quotations): pure helpers, status meta, fromLineItems`.

---

### Task 2: i18n keys (en + ms)

**Files:** `src/lib/i18n.ts` — new block `// ── Quotation ──` after the Invoice block in BOTH languages, plus `nav.quotations`, `more.quotations`, `activityLog.filterQuotations`.

Keys (en → ms):
```
nav.quotations                Quotations → Sebut Harga
more.quotations               Quotations → Sebut Harga
activityLog.filterQuotations  Quotations → Sebut Harga
quotation.title               Quotations → Sebut Harga
quotation.new                 New Quotation → Sebut Harga Baru
quotation.newFromEvent        Create Quotation → Buat Sebut Harga
quotation.viewForEvent        Quotations ({n}) → Sebut Harga ({n})      // {n} replaced by concat, no interpolation engine
quotation.quotationNo         Quotation No. → No. Sebut Harga
quotation.quotationDate       Quotation Date → Tarikh Sebut Harga
quotation.validUntil          Valid Until → Sah Sehingga
quotation.customer            Customer → Pelanggan
quotation.customerName        Customer Name → Nama Pelanggan
quotation.customerPhone       Phone → Telefon
quotation.customerAddress     Address → Alamat
quotation.customerNamePlaceholder  Customer or company name → Nama pelanggan atau syarikat
quotation.event               Event → Acara
quotation.standalone          No event (standalone) → Tanpa acara
quotation.pax                 Pax → Pax
quotation.discount            Discount → Diskaun
quotation.notes               Notes → Catatan
quotation.notesPlaceholder    Terms, remarks… → Syarat, catatan…
quotation.statusDraft         Draft → Draf
quotation.statusSent          Sent → Dihantar
quotation.statusAccepted      Accepted → Diterima
quotation.statusRejected      Rejected → Ditolak
quotation.statusExpired       Expired → Tamat Tempoh
quotation.markSent            Mark as Sent → Tanda Dihantar
quotation.markAccepted        Mark as Accepted → Tanda Diterima
quotation.markRejected        Mark as Rejected → Tanda Ditolak
quotation.showingLatest       Showing the latest 100 quotations. → Menunjukkan 100 sebut harga terkini.
quotation.fromQuotation       From quotation → Dari sebut harga
quotation.makeRevision        Create Revision → Buat Revisi
quotation.revisionOf          Revision of → Revisi bagi
quotation.hasNewerRevision    Newer revision exists → Ada revisi lebih baru
quotation.convertToInvoice    Convert to Invoice → Tukar ke Invois
quotation.viewInvoice         View Invoice → Lihat Invois
quotation.converted           Converted to invoice → Telah ditukar ke invois
quotation.saveDraft           Save Draft → Simpan Draf
quotation.saveDownload        Generate & Download PDF → Jana & Muat Turun PDF
quotation.downloadPdf         Download PDF → Muat Turun PDF
quotation.saving              Saving... → Menyimpan...
quotation.delete              Delete Quotation → Padam Sebut Harga
quotation.deleteConfirmText   Delete this quotation? This action cannot be undone. → Padam sebut harga ini? Tindakan ini tidak boleh dibatalkan.
quotation.noQuotations        No quotations yet → Tiada sebut harga lagi
quotation.noQuotationsThisPeriod  No quotations in this period. → Tiada sebut harga dalam tempoh ini.
quotation.countLabel          quotations → sebut harga
quotation.totalQuoted         Total Quoted → Jumlah Disebut
quotation.accepted            Accepted → Diterima
quotation.pending             Pending → Menunggu
quotation.notFound            Quotation not found. → Sebut harga tidak ditemui.
quotation.eventNotFound       Event not found. → Acara tidak ditemui.
quotation.filterStatusAll     All statuses → Semua status
quotation.validation.customer Please enter customer name. → Sila masukkan nama pelanggan.
quotation.validation.items    Please enter at least 1 item with a price. → Sila masukkan sekurang-kurangnya 1 item berharga.
quotation.validation.validUntil  Valid-until date must be after quotation date. → Tarikh sah sehingga mesti selepas tarikh sebut harga.
quotation.toast.saved         Quotation saved. → Sebut harga disimpan.
quotation.toast.deleted       Quotation deleted. → Sebut harga dipadam.
quotation.toast.statusUpdated Status updated. → Status dikemas kini.
quotation.pdf.title           SEBUT HARGA / QUOTATION (same both langs — PDF is BM/EN fixed)
```
Filters/date labels reuse `invoice.filterWeek` … `invoice.filterApply`, `invoice.description/qty/unitPrice/addItem/itemPlaceholder`, `common.cancel`, `common.deleteConfirmAction`.

- [ ] Add keys, run `pnpm test` → `i18n.test.ts` key-parity passes.
- [ ] Commit `feat(quotations): i18n keys (en/ms)`.

---

### Task 3: Firestore rules + index + hooks

**Files:** `firestore.rules`, `firestore.indexes.json`, create `src/hooks/useQuotations.ts`.

```
    // ── quotations ─────────────────────────────────────────────────────────
    match /quotations/{quotationId} {
      allow read, write: if isAdmin();
    }
```
```json
{ "indexes": [
  { "collectionGroup": "quotations", "queryScope": "COLLECTION",
    "fields": [ { "fieldPath": "event_id", "order": "ASCENDING" }, { "fieldPath": "created_at", "order": "DESCENDING" } ] }
], "fieldOverrides": [] }
```
(remove the comment block in `firestore.indexes.json` — JSON with comments is only tolerated by the CLI; keep it valid JSON.)

```ts
// src/hooks/useQuotations.ts
export function useQuotations(opts: { eventId?: string; limit?: number } = {}): { quotations: QuotationDoc[]; loading: boolean }
//   query: [where('event_id','==',eventId)?] + orderBy('created_at','desc') + limit(opts.limit ?? 100); onSnapshot
export function useQuotation(id: string): { quotation: QuotationDoc | null; loading: boolean }   // onSnapshot(doc)
export function useRevisionChildren(id: string): { childIds: string[] }   // where('revision_of','==',id) limit 5, getDocs
```
- [ ] Commit `feat(quotations): rules, index, data hooks`. (Rules/index NOT deployed — user deploys.)

---

### Task 4: `src/lib/quotation-pdf.ts`

**Files:** Create `src/lib/quotation-pdf.ts`. **Interfaces:** `generateQuotationPDF(q: QuotationDoc, logoBase64: string, filename?: string): Promise<void>`.

Layout (A4 portrait, `PAGE_MARGIN`, all primitives from `pdf-common`):
1. `drawLogo(pdf, logo, { x: M, y: M, w: 45, h: 15 })`; `y = drawCompanyAddress(pdf, M, M + 18)`.
2. Right block: `bold(14)` `SEBUT HARGA` / `reg(9)` `QUOTATION` under it; `reg(7.5)` gray: `Tarikh: DD/MM/YYYY`, `No.: QUO-YYYY-NNN`, `Sah sehingga: DD/MM/YYYY`. No `Customer ID`.
3. Red separator (`COLOR.brandRed`, 0.71).
4. `KEPADA / TO:` block — `customer.name` bold 9, phone + address lines reg 7.5 gray (skip empty). Then `Acara: {event_name} — {pax} pax` if event_name.
5. Table header identical to invoice (`ITEM# / DESCRIPTION / QTY / UNIT PRICE / TOTAL`; no TAX column → widen DESC to 106mm; columns `ITEM_X=M, DESC_X=M+12, QTY_X=M+125, UNIT_X=M+140, TOT_X=W−M`). Zebra rows `COLOR.rowAlt`. Wrap description with `splitTextToSize(desc, 106)` and draw ALL lines (row height = 7 × lines) — quotes have long descriptions.
6. **Overflow guard:** if `y > 240` before drawing a row → `pdf.addPage()`, redraw table header at `y = M`, continue; page label `Page n of N` set via `pdf.putTotalPages('{total}')` idiom or a second pass. Keep totals + footer on the last page.
7. Totals: `SUBTOTAL`, `DISKAUN` (only if > 0, shown as `(RM x)` in `COLOR.brandRed`), rule, `JUMLAH / TOTAL` bold 11 brandRed.
8. Notes block (if `notes`): `reg(7.5)` wrapped at 120mm, label `Catatan:`.
9. Footer via `drawFooterNote(pdf, { y: 250, x: M, right: W−M, pageLabel, lines: [ {text: `Sah sehingga ${fmtDateDMY(validUntil)}`, bold:true, size:8, gapAfter:4.5}, {text:'Harga tertakluk pada perubahan tanpa notis.', size:7.5, gapAfter:4.5}, {text:'Sebut harga ini bukan invois.', size:7.5, gapAfter:0} ] })` — **no bank lines, no "Thank You"**.
10. Signature area at `y = 268`: two boxes — left `Disediakan oleh: ______  KAKMELL RESOURCES`, right `Diterima oleh: ______  Nama / Tarikh` (lines drawn with `pdf.line`, `COLOR.lineDark`).
11. `pdf.save(filename ?? \`${q.quotation_no}.pdf\`)`.

- [ ] Scratch byte-check as in Phase 1 is not applicable (new file); instead generate one PDF via the Phase 1 scratch `gen.mts` pattern with a 3-item + long-description + discount + notes fixture and a 40-item fixture (forces page 2). Attach paths in the report.
- [ ] Commit `feat(quotations): PDF generator on pdf-common`.

---

### Task 5: Pages — `NewQuotation.tsx`

**Files:** Create `src/pages/quotations/NewQuotation.tsx`. Route `/quotations/new`. Query params: `eventId`, `revisionOf`.

Form state: `customer {name, phone, address}`, `quotationDate` (ISO `yyyy-MM-dd`, default today), `validUntil` (default `defaultValidUntil(quotationDate)`; recomputed when quotationDate changes **only if the user has not edited validUntil**), `pax` (number, from event or manual when standalone), `discount` (string), `notes`, `useLineItems(initial, { minItems: 1 })`.

Pre-populate:
- `?eventId=` → `useEvent(id)`; banner like NewInvoice; `event_name = nama_majlis`, `pax = event.pax`; items = `[Katering — {hall} — {pax} pax: qty pax (qtyLocked, protected), unit fmtUnitPriceInput(getKateringUnitPrice(pax))]`, `[Makan Beradab: 1 × MAKAN_BERADAB_PRICE, toggleable]`, `[Berkat: 1 × getBerkatSuggestion(pax)]`. Multiple quotes per event allowed → NO "already exists" redirect.
- `?revisionOf=` → `useQuotation(id)` → copy customer, event snapshot, pax, discount, notes, `fromLineItems(line_items, 'rev')`; header shows `Revisi bagi QUO-…`.
- neither → blank (3 rows via `newBlankItem('r1'..'r3')`).

Save (`andDownload`):
1. Validate: customer.name non-empty; ≥1 item with description + price > 0 (`isFilled` as in NewCustomInvoice); `validUntil > quotationDate`.
2. `const no = await nextDocumentNumber('quotation', new Date(quotationDate).getFullYear())` — **year from the form date**.
3. `addDoc('quotations', { quotation_no, quotation_date: Timestamp.fromDate(...), valid_until, event_id, event_name, pax, customer (trimmed, omit empty optional fields), line_items: toLineItems(isFilled), subtotal, discount, total, status:'draft', revision_of?, notes?, created_by: user.uid, created_at: serverTimestamp(), updated_at: serverTimestamp() })`.
4. If `andDownload`: `getLogoBase64()` → `generateQuotationPDF(doc, logo, buildQuotationFilename(...))`.
5. `logActivity({ action: 'quotation_created', category: 'quotation', description: \`Sebut harga ${no} dicipta untuk ${customer.name}\`, … })`; toast; `navigate(/quotations/${id})`.

UI: `LineItemsEditor addButtonVariant="compact"`; discount + totals card (`Subtotal`, `Diskaun` red, `TOTAL`); sticky action bar copied from NewCustomInvoice; inputs from ui-kit `Input`/`Textarea`.

- [ ] Commit `feat(quotations): new quotation form`.

---

### Task 6: Pages — `Quotations.tsx` (list) + `QuotationDetail.tsx`

**List** (`/quotations`, optional `?eventId=`): `useQuotations({ eventId })`; stats `Count / Total Quoted / Accepted / Pending`; `Segmented` period filter (reuse invoice keys) + a second `Segmented` for status (`all` + 5); rows: `quotation_no`, `customer.name` (+ `event_name`), `<DocumentStatusBadge kind="quotation" status={effectiveStatus(q)} />`, total, date; "Ada revisi lebih baru" `Pill` when `revisionParents.has(q.id)` (computed from loaded rows); delete via `BottomSheet` confirm (same pattern as invoices). Primary CTA "Sebut Harga Baru" → `/quotations/new`.

**Detail** (`/quotations/:id`): `useQuotation(id)` + `useRevisionChildren(id)`; strip `getStatusMeta('quotation', effectiveStatus(q)).strip`; badge; document card mirrors PDF (customer block, event line, items table, subtotal/discount/total, notes, valid-until); banners: "Revisi bagi QUO-…" (link) / "Ada revisi lebih baru" (link to child) / "Telah ditukar ke invois" (link `/invoices/{converted_invoice_id}`). Actions sheet (`BottomSheet`):
- Download PDF (always)
- Mark as Sent (draft) · Mark as Accepted (draft/sent) · Mark as Rejected (draft/sent). (No "mark expired" — D2.)
- Buat Revisi (any status; → `/quotations/new?revisionOf=id`)
- Tukar ke Invois (**only `status === 'accepted'` and no `converted_invoice_id`**) → `const p = quoteToInvoicePayload(q); navigate(p.target + p.search)` — the invoice page loads the quote itself.
- Delete (draft/rejected/expired only; accepted+converted refuse with toast) → confirm.
Every status write: `updateDoc(ref, { status, updated_at: serverTimestamp() })` + `logActivity`.

- [ ] Commit `feat(quotations): list and detail pages`.

---

### Task 7: Routes, nav, EventDetail, GlobalSearch, ActivityLog, invoice prefill/write-back

- Router: add `{ path: '/quotations/new' }`, `{ path: '/quotations/:id' }`, `{ path: '/quotations' }` before `/more`.
- `Sidebar.tsx` `NAV_ITEMS`: `{ to: '/quotations', icon: FileText, labelKey: 'nav.quotations', roles: ['admin'] }` after invoices. `BottomNav.tsx` untouched.
- `More.tsx`: `ListRow leading={<FileText/>} label={t('more.quotations')} onClick={() => navigate('/quotations')}` in Operations (D1).
- `EventDetail.tsx`: `useQuotations({ eventId: id, limit: 5 })` → row `quotation.newFromEvent` → `/quotations/new?eventId=${id}`; if count > 0, a second row `Sebut Harga (n)` → `/quotations?eventId=${id}`.
- `GlobalSearch.tsx`: admin-only fetch `query(quotations, orderBy('created_at','desc'), limit(200))`; filter `quotation_no` / `customer.name`; section "Sebut Harga"; `STATUS_COLORS` + accepted/rejected/expired; navigate `/quotations/${id}`.
- `ActivityLog.tsx`: `Category` + `'quotation'`; `CAT_ICON.quotation = <FileText size={15}/>`; `CAT_COLOR.quotation = 'bg-warn/10 text-warn'`; `catLabels.quotation = t('activityLog.filterQuotations')`; add to the filter array.
- `NewInvoice.tsx` / `NewCustomInvoice.tsx`: read `quotationId` from `useSearchParams`; `const { quotation, loading: quoteLoading } = useQuotation(quotationId)` (hook tolerates `''` → `null`, no subscription); when it arrives, `const p = quoteToInvoicePayload(quotation)` → NewInvoice: inside the existing pre-populate effect, `if (quotationId && quotation) setItems(p.items) else setItems(presets)` (wait for `quoteLoading` before pre-populating; gaji suggestion from pax unchanged); custom page: `setBilledTo(p.billedTo)`, `setReference(p.reference)`, `setItems(p.items)`. Banner "Dari sebut harga QUO-…" above the table. If `quotationId` is set but the quote does not exist → toast `quotation.notFound`, continue with normal presets. After successful `addDoc`, `if (quotationId) await updateDoc(doc(db,'quotations',quotationId), { converted_invoice_id: docRef.id, updated_at: serverTimestamp() })` + `logActivity('quotation_converted')`. Without the param: zero change (regression-safe).
- [ ] Commit `feat(quotations): routes, navigation, search, activity log, invoice prefill`.

---

### Task 8: Verification + CLAUDE.md (separate commit)

- [ ] `pnpm build` ✓ · `pnpm test` ✓ (96 + new) · `pnpm lint` ≤ 25 problems and none in new files · `firebase deploy` **not** run.
- [ ] Grep gates: `grep -rn "10.50\|GAJI_TABLE\|bank\|HONG LEONG\|32601052091" src/lib/quotation-pdf.ts src/pages/quotations` → none. `grep -rn "onSnapshot(collection(db, 'quotations')" src` → none (must be a `query(...)` with limit).
- [ ] Manual flow (Chrome, dev server, rules deployed by user first — the `quotations` rule + index must be live or every write is permission-denied): (1) quote from event → number `QUO-2026-001`; (2) standalone quote → `QUO-2026-002`; (3) revision of (1) → `QUO-2026-003`, parent shows "Ada revisi lebih baru"; (4) mark (2) accepted → Tukar ke Invois → invoice saved with next `INV-2026-NNN` (counter continues from 272 → `273`), quote shows "Telah ditukar"; then delete test docs (quotes + the invoice), confirm counters `{invoice: 273, quotation: 3}` via `seed:counters` dry-run (invoice) + admin read (quotation).
- [ ] Confirm existing invoices untouched: `Invoices.tsx`/`InvoiceDetail.tsx` diff = 0 lines; NewInvoice/NewCustomInvoice diff limited to the `quotationId` branch; run the Phase 1 PDF byte-check script again for invoice/weekly/calibration → identical.
- [ ] `CLAUDE.md`: fix prices (RM10.50 / RM15 <300 pax), brackets 100–1000, React 19, React Router 7, remove Laksa Penang; add `quotations` collection schema; add "Shared document layer" section listing each module's exports (copy the table at the top of this plan). Commit `docs: CLAUDE.md — phase 1/2 corrections and shared document layer`.

## Self-review
- Spec coverage: collection ✓ schema ✓ snapshots ✓ rules ✓ index ✓ 3 pages ✓ eventId prefill ✓ standalone ✓ revision + badge ✓ convert (accepted only) + write-back ✓ nav (no BottomNav) ✓ Sidebar ✓ EventDetail ✓ PDF (title, customer block, table, discount, footer, signature, no bank) ✓ i18n both ✓ activity (3 places) ✓ GlobalSearch ✓ Dashboard untouched ✓ bounded list query ✓ verification ✓ no deploy ✓.
- Open items needing your word: D1–D4 above.
