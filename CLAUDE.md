# CLAUDE.md — KAKMELL RESOURCES v2
# Kitchen Management System

## 🎯 Project Overview
A bilingual (English/Malay) PWA for KAKMELL RESOURCES — a catering kitchen operation.
Built for non-IT users. Simple, beautiful, mobile-first.

**BUSINESS CONTEXT:**
- KAKMELL RESOURCES = kitchen/food only
- ZB Group = hall owner, marketer, wedding planner (separate business)
- ZB Group gives event data to Kakmell → Kakmell keys in here
- ZB Group pays Kakmell for cooking → Invoice: Kakmell → ZB Group
- This app = purely internal kitchen operations tool

## 🏗️ Tech Stack
- **Frontend**: React 19 + Vite 5 (SPA)
- **Package Manager**: pnpm
- **Language**: TypeScript
- **UI**: Tailwind CSS v3 + shadcn/ui
- **Icons**: lucide-react
- **Firebase**: Auth + Firestore + Storage + Functions (Gen 2) + Hosting
- **Firebase Admin SDK**: in Functions (server-side role management)
- **PDF**: jsPDF (client-side generation)
- **PWA**: vite-plugin-pwa
- **Routing**: React Router v7 (`createBrowserRouter`, route guards in `src/router/index.tsx`)
- **State**: React Context (auth + language)

## 👥 Roles (2 only)

| Role | Siapa | Akses |
|------|-------|-------|
| `admin` | Manager Kakmell | Full access |
| `kitchen` | Kitchen staff | Dashboard + full ingredients + checklist |
| `pending` | New user | Zero access — waiting approval |

**Role storage:** Firestore `users/{uid}` document, field `role`
**Auth flow:**
1. Register → create auth user + Firestore users doc (role: pending)
2. Admin approves via Settings → update role field
3. Middleware (React Router guard) checks role on every route

## 📦 Firestore Collections

### users/{uid}
```
full_name: string
email: string
role: string          // pending | admin | kitchen
approved_at: timestamp
approved_by: string   // uid of admin who approved
created_at: timestamp
```

### events/{eventId}
```
nama_majlis: string
hall_name: string
tarikh: timestamp
sesi: string          // siang | malam
pax: number
remarks: string
menu_selection: {
  nasi: string,
  ayam: string,
  daging: string,
  acar: string,
  bubur: string,
  air_panas: string   // Teh O | Kopi O
}
status: string        // upcoming | completed | cancelled
created_by: string    // uid
created_at: timestamp
```

### halls/{hallId}
```
name: string
is_active: boolean
```

### menu_options/{optionId}
```
category: string      // nasi|ayam|daging|acar|dalca|bubur|buah|air
name_ms: string
is_active: boolean
```

### checklist/{eventId}/staff/{uid}
```
date: string          // YYYY-MM-DD (resets daily)
checked: string[]     // array of checked lauk names
updated_at: timestamp
```
Note: Checklist synced real-time across all kitchen staff via Firestore

### invoices/{invoiceId}
```
event_id: string | null     // null for custom invoices
type?: 'custom'             // custom invoice (no event)
reference?: string          // custom invoice free-text reference
invoice_no: string          // INV-YYYY-NNN from counters/invoice (per-year, transactional)
invoice_date: timestamp
billed_to: string           // "ZB GROUP SDN BHD" for event invoices; free text for custom
line_items: array of {
  description: string
  qty: number
  unit_price: number        // may be NEGATIVE for a discount line carried from a quotation
  total: number
  is_deduction: boolean
}
subtotal: number
gaji_pekerja: number        // stored as positive, displayed as deduction
total: number
status: string              // draft | sent | paid
created_at: timestamp
```

### quotations/{quotationId}  (Sebut Harga — admin only)
```
quotation_no: string        // QUO-YYYY-NNN from counters/quotation
quotation_date: timestamp
valid_until: timestamp      // default quotation_date + 14 days, editable
event_id: string | null
event_name: string          // SNAPSHOT at creation — never re-read from the event
pax: number                 // SNAPSHOT; 0 when unknown
customer: { name: string, phone?: string, address?: string }   // free-text customer
line_items: same shape as invoices.line_items
subtotal: number
discount?: number           // RM, 0..subtotal
total: number               // subtotal - discount
status: string              // draft | sent | accepted | rejected  ('expired' is DERIVED from valid_until, never stored)
revision_of?: string        // parent quotation id (one event can have many quotes / revisions)
converted_invoice_id?: string  // set by NewInvoice/NewCustomInvoice when ?quotationId= is used
notes?: string
created_by: string
created_at: timestamp
updated_at: timestamp
```
Composite index: `quotations (event_id ASC, created_at DESC)`.

### counters/{kind}  (kind = invoice | quotation; admin only)
```
{ "2024": 7, "2025": 98, "2026": 272 }   // year → last issued sequence
```
Numbers are issued by `nextDocumentNumber(kind, year)` in a Firestore transaction.
Gaps are expected (burned numbers are never reused). Seed/repair with `pnpm seed:counters` (dry-run) / `--write`.

## 🔥 Firebase Functions (Gen 2)

### approveUser(uid, role, adminUid)
- Updates Firestore users/{uid} role field
- Sets approved_at + approved_by
- Called from Settings → Urus Pengguna

### changeUserRole(uid, newRole)
- Updates Firestore users/{uid} role
- Used by Developer Settings
- Requires caller to be admin OR have dev password verified

### cleanupOldTaskAssignments (onSchedule, daily 03:00 MYT) + cleanupOldTaskAssignmentsManual (onCall, admin)
- Deletes `daily_assignments/{date}` older than 30 days and the matching `task-photos/{date}/` Storage objects

Note: all PDFs (invoice, quotation, weekly export, calibration form) are generated **client-side** with jsPDF.
The former `createInvoice` / `updateInvoiceStatus` / `generateWeeklyExportData` callables were removed (never called by the client).

## 🧮 Ingredient Calculator — HARDCODED in /src/lib/ingredient-calculator.ts

Bracket lookup table (NOT in Firestore — hardcoded for speed + offline):

### getBracket(pax): number
Round UP to: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
- pax ≤ 100 → 100
- pax > 1000 → -1 (calculateIngredients returns null — flag custom)
- Admin overrides per bracket live in Firestore `ingredient_overrides` (see `ingredient-calculator-dynamic.ts`).
  The tables below are the historical reference; `src/lib/ingredient-calculator.ts` is the source of truth.

### Main Items Lookup:
| Pax  | Beras(bag) | Ayam(ekor) | Daging(kg) | Paceri(biji) | Oren(biji) | Gula(L) |
|------|-----------|------------|------------|-------------|-----------|---------|
| 300  | 2         | 20         | 18         | 20          | 25        | 10      |
| 400  | 3         | 28         | 24         | 25          | 30        | 10      |
| 500  | 3.5       | 35         | 30         | 35          | 30        | 15      |
| 600  | 4         | 42         | 36         | 40          | 30        | 20      |
| 700  | 4.5       | 50         | 42         | 45          | 30        | 20      |
| 800  | 5.5       | 55         | 48         | 50          | 30        | 25      |
| 900  | 6         | 65         | 54         | 60          | 35        | 30      |
| 1000 | 7         | 70         | 60         | 70          | 40        | 30      |

### Daging Box Calculation:
- Slice: 17kg/kotak, trimming: 22kg/kotak (max 1 kotak fixed)
- slice_boxes = ceil(daging_kg / 17)
- variance = (slice_boxes × 17) - daging_kg

### Dalca Lookup:
| Pax  | Kacang Dall | Terung  | Kentang              | Karot       | Kacang Panjang | Serbuk Kari |
|------|------------|---------|----------------------|-------------|----------------|-------------|
| 300  | 1kg        | 2kg     | 1 bag                | 10 biji     | 1kg            | 0.5kg       |
| 400  | 1kg        | 2.5kg   | 1 bag                | 3.5kg       | 1kg            | —           |
| 500  | 1.5kg      | 3kg     | 1 bag                | —           | 1.5kg          | 1kg         |
| 600  | 2kg        | 3.5kg   | 1.5 bag              | —           | 1.5kg          | 1kg         |
| 700  | 2kg        | 4kg     | 1.5 bag              | —           | 2kg            | —           |
| 800  | 2.5kg      | 5kg     | 1.5 bag+kotak(4.5kg) | kotak 4.5kg | 2kg            | —           |
| 900  | 3kg        | 6kg     | 2 bag                | 6kg         | 2.5kg          | —           |
| 1000 | 3kg (CAP)  | 7kg     | 2 bag                | 7kg         | 3kg            | 2kg         |

### Bubur (FLAT — same all pax):
- Pulut Hitam: 2kg + 1 tin santan
- Kacang Hijau: 2kg + 1 tin santan
- Bubur Jagung: 2 beg (4kg) + 2 kotak santan

### Acar & Paceri:
| Item              | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 |
|-------------------|-----|-----|-----|-----|-----|-----|-----|------|
| Timun/Acar (kg)   | 10  | —   | 15  | —   | 20  | 25  | —   | 30   |
| Nenas/Acar (biji) | 10  | —   | 10  | —   | 10  | 12  | —   | 20   |
| Paceri Nenas(biji)| 20  | 25  | 35  | 40  | 45  | 50  | 60  | 70   |

## 💰 Invoice Module

### Business Rules
- **FROM:** KAKMELL RESOURCES
- **TO:** ZB GROUP SDN BHD
- **Address:** NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI, 81700 PASIR GUDANG, JOHOR
- **Phone:** +6018-397 0769
- **Tax:** 0% always
- **Currency:** RM

### Line Items Logic (all prices live in `src/lib/pricing.ts` — never hardcode in pages)
1. **Katering** — auto from event: `pax × getKateringUnitPrice(pax)` → **RM15.00 if pax < 300, else RM10.50** (editable)
2. **Makan Beradab** — optional toggle, flat `MAKAN_BERADAB_PRICE` = RM100
3. **Berkat** — `getBerkatSuggestion(pax)`: ≤500 → RM100, ≤800 → RM200, else RM300 (editable)
4. **Custom add-ons** — admin adds manually (description + qty + unit price)
5. **Gaji Pekerja** — `getGajiPekerja(pax)` from the table below, shown as a deduction (invoice only, never on quotations)

### Gaji Pekerja Lookup (kawin events, round UP to nearest bracket)
| Pax  | Gaji Pekerja |
|------|-------------|
| 300  | RM530       |
| 400  | RM590       |
| 500  | RM850       |
| 650  | RM910       |
| 700  | RM970       |
| 800  | RM1,030     |
| 1000 | RM1,150     |
| 1300 | RM1,680     |
| 1500 | RM2,000     |

Admin can override the suggested amount.

### Invoice PDF Layout (jsPDF, A4 portrait)

**HEADER (left):**
```
KAKMELL RESOURCES  ← large, bold, green #1B4332
NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,
81700 PASIR GUDANG, JOHOR
Phone: +6018-397 0769
```

**HEADER (right):**
```
INVOICE
Date: DD/MM/YYYY
Invoice #: INV-YYYY-NNN
Customer ID: CUST-001
```

**BILL TO:**
```
ZB GROUP SDN BHD
```

**LINE ITEMS TABLE:**
Columns: `ITEM# | DESCRIPTION | QTY | UNIT PRICE | TAX | TOTAL`

**FOOTER:**
```
SUBTOTAL:        [amount]
TAXABLE:         -
TAX RATE:        0.000%
TAX:             -
S & H:           -
GAJI PEKERJA:    ([amount])   ← shown in brackets as deduction
TOTAL:           [amount]

"Thank You For Your Business!"
"If you have any questions about this invoice, please contact"
"NORMILA (018-3970769)"
"Make all checks payable to KAKMELL RESOURCES"
```

## 🧩 Shared Document Layer (invoice + quotation compose these — do NOT duplicate)

| Module | Exports | Purpose |
|---|---|---|
| `src/lib/pricing.ts` | `MAKAN_BERADAB_PRICE`, `getKateringUnitPrice(pax)`, `GAJI_TABLE`, `getGajiPekerja(pax)`, `getBerkatSuggestion(pax)`, `fmtUnitPriceInput(n)` | The only place RM prices live |
| `src/lib/date-utils.ts` | `tsToDate(ts)`, `fmtDateDMY(d)` | Timestamp/Date coercion, DD/MM/YYYY |
| `src/lib/document-number.ts` | `DocumentKind`, `DOCUMENT_PREFIX`, `formatDocumentNumber(kind, year, seq)`, `parseDocumentNumber(no)`, `nextSequence(counter, year)` | Pure numbering (unit-tested) |
| `src/lib/document-number.firestore.ts` | `nextDocumentNumber(kind, year)` | Transactional counter `counters/{kind}`; `year` = document date, never the clock |
| `src/lib/document-status.ts` + `src/components/DocumentStatusBadge.tsx` | `DOCUMENT_STATUS`, `getStatusMeta(kind, status)`, `<DocumentStatusBadge kind status />` | Badge tone / i18n label / colour strip per status |
| `src/lib/pdf-common.ts` | `A4_PORTRAIT`, `A4_LANDSCAPE`, `PAGE_MARGIN`, `COLOR`, `COMPANY`, `fonts(pdf)`, `getLogoBase64()`, `drawLogo`, `drawCompanyAddress`, `drawFooterNote` | jsPDF primitives shared by all PDFs |
| `src/lib/invoice-pdf.ts` | `InvoiceLineItem`, `InvoiceDoc`, `fmtRM`, `sanitizePart`, `fmtFilenameDate`, `buildInvoiceFilename`, `generateInvoicePDF` | Invoice PDF |
| `src/lib/quotations.ts` | `QuotationDoc`, `QuotationStatus`, `VALIDITY_DAYS`, `defaultValidUntil`, `effectiveStatus`, `computeTotals`, `quoteToInvoicePayload`, `buildQuotationFilename` | Quotation types + pure rules |
| `src/lib/quotation-pdf.ts` | `generateQuotationPDF(q, logo, filename?)` | Quotation PDF (no bank details, no gaji) |
| `src/hooks/useLineItems.ts` | `FormItem`, `newBlankItem`, `itemTotal`, `isActive`, `fromLineItems`, `useLineItems(initial, {minItems})` | Editable line-item state |
| `src/components/LineItemsEditor.tsx` | `<LineItemsEditor items onUpdate onRemove onAdd canRemove addButtonVariant />` | Line-item table UI |
| `src/hooks/useQuotations.ts` | `useQuotations({eventId?, limit?, enabled?})`, `useQuotation(id)`, `useRevisionChildren(id)` | Bounded quotation reads |
| `src/lib/activity-logger.ts` | `logActivity({...})` | categories: event, invoice, quotation, user, ingredient, settings, task, menu |

Rules: prices only from `pricing.ts`; numbers only from `nextDocumentNumber`; new PDFs build on `pdf-common`; line items only via `useLineItems` + `LineItemsEditor`; a quotation discount converts to a **negative** invoice line (`Diskaun (QUO-…)`) — never dropped.

## 🍽️ Menu Options (seed to Firestore)
- nasi: Nasi Briyani, Nasi Minyak, Nasi Jagung
- ayam: Ayam Masak Merah (auto-selected)
- daging: Daging Briyani, Daging Black Pepper, Daging Masak Hitam, Daging Kuzi, Daging Masak Kurma
- acar: Paceri Nenas, Pencuk
- dalca: Dalca (auto-included, no selection)
- bubur: Bubur Pulut Hitam, Bubur Kacang Hijau, Bubur Jagung
- buah: Oren (auto-included)
- air: Teh O, Kopi O (pilih 1) — Air Anggur/Kordial auto-included
- kuih: BUKAN tanggungjawab Kakmell

## 🎨 UI/UX Design Direction
- Distinctive, warm, professional — NOT generic shadcn
- Primary: deep forest green (#1B4332)
- Accent: warm amber/gold for highlights
- Background: warm off-white (#FAFAF8)
- Cards: subtle shadow, warm radius, slight texture
- Mobile-first, fully responsive desktop sidebar
- Min tap target: 48px
- Logo: /public/logo.png (top left sidebar)
- PWA icons: /public/icon-192.png, /public/icon-512.png

## 📁 Project Structure
```
kakmell-v2/
├── public/
│   ├── logo.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ui/              — shadcn components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── EventCard.tsx
│   │   ├── IngredientTable.tsx
│   │   ├── KitchenModal.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── LanguageContext.tsx
│   ├── lib/
│   │   ├── firebase.ts       — init app, auth, firestore, storage
│   │   ├── ingredient-calculator.ts
│   │   └── i18n.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Pending.tsx
│   │   ├── Dashboard.tsx
│   │   ├── events/
│   │   │   ├── NewEvent.tsx
│   │   │   └── EventDetail.tsx
│   │   └── settings/
│   │       ├── Settings.tsx
│   │       ├── UsersSettings.tsx
│   │       ├── MenuSettings.tsx
│   │       └── HallsSettings.tsx
│   ├── router/
│   │   └── index.tsx         — React Router + role guards
│   ├── App.tsx
│   └── main.tsx
├── functions/
│   ├── src/
│   │   └── index.ts          — Firebase Functions Gen 2
│   └── package.json
├── firebase.json
├── firestore.rules
├── .firebaserc
└── vite.config.ts
```

## 🚫 Do NOT
- No deposit/payment tracking on events
- No pricing on event form
- No hall staff / hall owner roles
- Kitchen staff CAN see full ingredient quantities
- No complex validation that blocks submission
- Menu + ingredient names ALWAYS in BM regardless of language

## 💡 Dev Notes
- Checklist synced real-time via Firestore (not localStorage)
  Resets daily — check if stored date matches today, if not clear
- Developer Settings: real role change via Firebase Function
  After change → signOut() → redirect login
- Ingredient calculator is client-side only (hardcoded lookup table)
  Works offline after PWA cache
