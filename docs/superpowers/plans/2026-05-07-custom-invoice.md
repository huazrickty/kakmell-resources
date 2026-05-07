# Custom Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tambah Invois Baru" button to the Invoices page that creates a fully custom invoice (not tied to any event), with its own form page, Firestore document, and PDF generation.

**Architecture:** Four targeted changes — update the shared `InvoiceDoc` type and PDF renderer to support custom invoices, add the entry-point button to `Invoices.tsx`, create the new `NewCustomInvoice.tsx` form page, and register its route before the `/:id` wildcard.

**Tech Stack:** React 18, TypeScript, Firestore SDK v9, jsPDF, Tailwind CSS, lucide-react, sonner

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/lib/invoice-pdf.ts` | **Modify** | `event_id: string → string \| null`; add `type?`, `reference?`; use `invoice.billed_to` instead of hardcoded string; skip "Event:" line when eventName is empty |
| `src/pages/Invoices.tsx` | **Modify** | Add "Tambah Invois Baru" button top-right (admin only) |
| `src/pages/invoices/NewCustomInvoice.tsx` | **Create** | Full custom invoice form |
| `src/router/index.tsx` | **Modify** | Register `/invoices/custom/new` before `/invoices/:id` |

---

## Task 1 — Update `src/lib/invoice-pdf.ts`

**Files:**
- Modify: `src/lib/invoice-pdf.ts`

- [ ] **Step 1: Update the `InvoiceDoc` interface**

Find:
```typescript
export interface InvoiceDoc {
  id: string
  event_id: string
  invoice_no: string
  invoice_date: any
  billed_to: string
  line_items: InvoiceLineItem[]
  subtotal: number
  gaji_pekerja: number
  total: number
  status: 'draft' | 'sent' | 'paid'
  created_at: any
}
```

Replace with:
```typescript
export interface InvoiceDoc {
  id: string
  event_id: string | null
  invoice_no: string
  invoice_date: any
  billed_to: string
  line_items: InvoiceLineItem[]
  subtotal: number
  gaji_pekerja: number
  total: number
  status: 'draft' | 'sent' | 'paid'
  created_at: any
  type?: 'custom'
  reference?: string
}
```

- [ ] **Step 2: Fix `billed_to` hardcoding and make event line conditional**

Find this block inside `generateInvoicePDF` (around line 102):
```typescript
  // ── Bill To ───────────────────────────────────────────────────────────────
  reg(7); pdf.setTextColor(156, 163, 175)
  pdf.text('BILL TO:', M, y); y += 4.5
  bold(9); pdf.setTextColor(17, 24, 39)
  pdf.text('ZB GROUP SDN BHD', M, y); y += 4.5
  reg(7.5); pdf.setTextColor(107, 114, 128)
  pdf.text(`Event: ${eventName}`, M, y); y += 9
```

Replace with:
```typescript
  // ── Bill To ───────────────────────────────────────────────────────────────
  reg(7); pdf.setTextColor(156, 163, 175)
  pdf.text('BILL TO:', M, y); y += 4.5
  bold(9); pdf.setTextColor(17, 24, 39)
  pdf.text(invoice.billed_to, M, y); y += 4.5
  if (eventName) {
    reg(7.5); pdf.setTextColor(107, 114, 128)
    pdf.text(`Event: ${eventName}`, M, y); y += 4.5
  }
  y += 4.5
```

- [ ] **Step 3: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors. (Existing callers in `NewInvoice.tsx` and `InvoiceDetail.tsx` still compile because `string` is assignable to `string | null`.)

- [ ] **Step 4: Commit**

```
git add src/lib/invoice-pdf.ts
git commit -m "feat: extend InvoiceDoc for custom invoices, fix billed_to hardcoding in PDF"
```

---

## Task 2 — Update `src/pages/Invoices.tsx`

**Files:**
- Modify: `src/pages/Invoices.tsx`

- [ ] **Step 1: Add `Plus` to the lucide-react import**

Find:
```tsx
import { FileText, Trash2 } from 'lucide-react'
```

Replace with:
```tsx
import { FileText, Plus, Trash2 } from 'lucide-react'
```

- [ ] **Step 2: Replace the header count span with a flex row containing the count + button**

Find:
```tsx
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('invoice.title')}</h1>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {invoices.length} invois
        </span>
      </div>
```

Replace with:
```tsx
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('invoice.title')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {invoices.length} invois
          </span>
          {isAdmin && (
            <button
              onClick={() => navigate('/invoices/custom/new')}
              className="flex items-center gap-1.5 bg-[#1B4332] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#163828] transition-colors"
            >
              <Plus size={13} />
              Tambah Invois Baru
            </button>
          )}
        </div>
      </div>
```

- [ ] **Step 3: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src/pages/Invoices.tsx
git commit -m "feat: add Tambah Invois Baru button to Invoices page"
```

---

## Task 3 — Create `src/pages/invoices/NewCustomInvoice.tsx`

**Files:**
- Create: `src/pages/invoices/NewCustomInvoice.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Plus, FileDown, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { generateInvoicePDF, getLogoBase64, fmtRM, type InvoiceDoc } from '@/lib/invoice-pdf'
import { cn } from '@/lib/utils'

async function nextInvoiceNo(): Promise<string> {
  const snap = await getDocs(collection(db, 'invoices'))
  const num  = snap.size + 1
  return `INV-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
}

interface FormItem {
  id: string
  description: string
  qty: string
  unit_price: string
}

export default function NewCustomInvoice() {
  const navigate           = useNavigate()
  const { user, userDoc }  = useAuth()
  const isAdmin            = userDoc?.role === 'admin'

  const [billedTo, setBilledTo]     = useState('')
  const [reference, setReference]   = useState('')
  const [items, setItems]           = useState<FormItem[]>([
    { id: 'r1', description: '', qty: '1', unit_price: '' },
    { id: 'r2', description: '', qty: '1', unit_price: '' },
    { id: 'r3', description: '', qty: '1', unit_price: '' },
  ])
  const [gajiToggle, setGajiToggle] = useState(false)
  const [gajiAmount, setGajiAmount] = useState('')
  const [saving, setSaving]         = useState(false)

  const subtotal = useMemo(() =>
    items.reduce((sum, li) =>
      sum + (parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0), 0),
  [items])

  const gajiNum = gajiToggle ? (parseFloat(gajiAmount) || 0) : 0
  const total   = subtotal - gajiNum

  function updateItem(id: string, field: keyof FormItem, value: string) {
    setItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li))
  }

  function addItem() {
    setItems(prev => [...prev, { id: `r-${Date.now()}`, description: '', qty: '1', unit_price: '' }])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems(prev => prev.filter(li => li.id !== id))
  }

  async function save(andDownload = false) {
    if (!user) return
    if (!billedTo.trim()) { toast.error('Sila masukkan nama penerima invois.'); return }
    const activeItems = items.filter(li => li.description.trim() && parseFloat(li.unit_price) > 0)
    if (activeItems.length === 0) { toast.error('Sila masukkan sekurang-kurangnya 1 item dengan harga.'); return }

    setSaving(true)
    try {
      const invoiceNo = await nextInvoiceNo()
      const lineItems = activeItems.map(li => ({
        description:  li.description,
        qty:          parseFloat(li.qty) || 0,
        unit_price:   parseFloat(li.unit_price) || 0,
        total:        (parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0),
        is_deduction: false,
      }))

      const docRef = await addDoc(collection(db, 'invoices'), {
        event_id:     null,
        type:         'custom',
        reference:    reference.trim(),
        invoice_no:   invoiceNo,
        invoice_date: serverTimestamp(),
        billed_to:    billedTo.trim(),
        line_items:   lineItems,
        subtotal,
        gaji_pekerja: gajiNum,
        total,
        status:       'draft',
        created_at:   serverTimestamp(),
      })

      if (andDownload) {
        const inv: InvoiceDoc = {
          id:           docRef.id,
          event_id:     null,
          type:         'custom',
          reference:    reference.trim(),
          invoice_no:   invoiceNo,
          invoice_date: new Date(),
          billed_to:    billedTo.trim(),
          line_items:   lineItems,
          subtotal,
          gaji_pekerja: gajiNum,
          total,
          status:       'draft',
          created_at:   new Date(),
        }
        const logoBase64 = await getLogoBase64()
        await generateInvoicePDF(inv, reference.trim(), logoBase64)
      }

      toast.success('Invois disimpan.')
      navigate(`/invoices/${docRef.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Ralat. Cuba lagi.')
      setSaving(false)
    }
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invois Tersuai</h1>
          <p className="text-sm text-gray-500">Invois bebas tanpa acara</p>
        </div>
      </div>

      {/* FROM — read-only */}
      <div className="bg-[#1B4332] rounded-xl px-5 py-4 mb-5">
        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1.5">Dari</p>
        <p className="text-white font-bold text-sm">KAKMELL RESOURCES</p>
        <p className="text-white/60 text-xs mt-0.5">
          NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI, 81700 PASIR GUDANG, JOHOR
        </p>
        <p className="text-white/60 text-xs">Phone: +6018-397 0769</p>
      </div>

      {/* BILL TO + REFERENCE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-4 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Kepada (Bill To)
          </label>
          <input
            type="text"
            value={billedTo}
            onChange={e => setBilledTo(e.target.value)}
            placeholder="ZB GROUP SDN BHD atau nama lain"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] placeholder:font-normal placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Rujukan / Reference{' '}
            <span className="text-gray-300 font-normal normal-case">(pilihan)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="cth. Majlis Ali &amp; Siti — 9 Mei 2026"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Line items table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div
          className="grid items-center bg-gray-50 border-b border-gray-100 px-4 py-2.5"
          style={{ gridTemplateColumns: '24px 1fr 72px 96px 28px' }}
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Penerangan</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Qty</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right pr-2">Harga (RM)</span>
          <span />
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((li, i) => {
            const qty      = parseFloat(li.qty) || 0
            const unit     = parseFloat(li.unit_price) || 0
            const rowTotal = qty * unit
            return (
              <div
                key={li.id}
                className="grid items-center px-4 py-2.5 gap-1"
                style={{ gridTemplateColumns: '24px 1fr 72px 96px 28px' }}
              >
                <span className="text-xs text-gray-400 font-mono tabular-nums">{i + 1}</span>

                <input
                  type="text"
                  value={li.description}
                  onChange={e => updateItem(li.id, 'description', e.target.value)}
                  placeholder="Penerangan item"
                  className="text-sm text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none w-full"
                />

                <input
                  type="number"
                  value={li.qty}
                  onChange={e => updateItem(li.id, 'qty', e.target.value)}
                  className="text-sm text-right text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none w-full tabular-nums"
                />

                <div>
                  <input
                    type="number"
                    value={li.unit_price}
                    onChange={e => updateItem(li.id, 'unit_price', e.target.value)}
                    step="0.01"
                    placeholder="0.00"
                    className="text-sm text-right text-gray-800 py-1 px-1.5 rounded border border-transparent focus:border-gray-200 focus:outline-none w-full tabular-nums"
                  />
                  {unit > 0 && qty > 0 && (
                    <p className="text-[10px] text-gray-400 text-right mt-0.5 pr-1.5 tabular-nums">
                      = {fmtRM(rowTotal)}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => removeItem(li.id)}
                    disabled={items.length <= 1}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:text-[#163828] transition-colors"
          >
            <Plus size={13} />
            Tambah Item
          </button>
        </div>
      </div>

      {/* Gaji Pekerja toggle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGajiToggle(prev => !prev)}
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
              gajiToggle
                ? 'bg-[#1B4332] border-[#1B4332]'
                : 'border-gray-300 bg-white'
            )}
          >
            {gajiToggle && (
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <span className="text-sm text-gray-700 font-medium">Tambah Potongan Gaji Pekerja</span>
        </div>

        {gajiToggle && (
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-sm text-gray-500">Jumlah gaji pekerja (ditolak dari jumlah)</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-500">RM</span>
              <input
                type="number"
                value={gajiAmount}
                onChange={e => setGajiAmount(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="w-28 text-right border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-600 focus:outline-none focus:border-[#1B4332] tabular-nums"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-6">
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-gray-900 tabular-nums">{fmtRM(subtotal)}</span>
          </div>
          {gajiToggle && gajiNum > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Gaji Pekerja</span>
              <span className="font-semibold text-red-600 tabular-nums">({fmtRM(gajiNum)})</span>
            </div>
          )}
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900 text-base">JUMLAH</span>
            <span className="font-black text-xl text-[#1B4332] tabular-nums">{fmtRM(total)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 justify-end">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
        >
          Batal
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          <Save size={14} />
          Simpan Draf
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <FileDown size={14} />
          {saving ? 'Menyimpan...' : 'Jana & Muat Turun PDF'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/pages/invoices/NewCustomInvoice.tsx
git commit -m "feat: add NewCustomInvoice page"
```

---

## Task 4 — Update `src/router/index.tsx`

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Add import for `NewCustomInvoice`**

Find:
```tsx
import NewInvoice from '@/pages/invoices/NewInvoice'
```

Replace with:
```tsx
import NewInvoice from '@/pages/invoices/NewInvoice'
import NewCustomInvoice from '@/pages/invoices/NewCustomInvoice'
```

- [ ] **Step 2: Register the route before `/invoices/:id`**

Find:
```tsx
          { path: '/invoices/new', element: <NewInvoice /> },
          { path: '/invoices/:id', element: <InvoiceDetail /> },
```

Replace with:
```tsx
          { path: '/invoices/new',        element: <NewInvoice /> },
          { path: '/invoices/custom/new', element: <NewCustomInvoice /> },
          { path: '/invoices/:id',        element: <InvoiceDetail /> },
```

- [ ] **Step 3: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src/router/index.tsx
git commit -m "feat: register /invoices/custom/new route"
```

---

## Task 5 — Final build verification

- [ ] **Step 1: Full build**

```
pnpm build
```

Expected: build succeeds (warnings about chunk size are pre-existing and acceptable).

- [ ] **Step 2: List all changed files**

```
git log --name-only --oneline -5
```

---

## Self-Review

**Spec coverage:**
- "Tambah Invois Baru" button top-right admin only → Task 2 ✓
- `/invoices/custom/new` route → Task 4 ✓
- FROM header read-only → Task 3 (green banner) ✓
- BILL TO free text input → Task 3 ✓
- Optional reference field → Task 3 ✓
- 3 blank rows, add/delete rows, minimum 1 → Task 3 ✓
- Gaji Pekerja toggle → Task 3 ✓
- Subtotal / Gaji / Jumlah totals → Task 3 ✓
- Simpan Draf + Jana & Muat Turun PDF → Task 3 ✓
- Firestore: `event_id: null`, `type: 'custom'`, `reference` → Task 3 ✓
- PDF uses `invoice.billed_to` instead of hardcoded string → Task 1 ✓
- PDF skips "Event:" line when eventName is empty → Task 1 ✓
- `InvoiceDoc.event_id: string | null` → Task 1 ✓
- Admin-only guard in NewCustomInvoice → Task 3 (`if (!isAdmin) return <Navigate>`) ✓

**Type consistency:**
- `InvoiceDoc` updated in Task 1 — used in Task 3 ✓
- `generateInvoicePDF(inv, reference.trim(), logoBase64)` — reference is `string`, eventName param is `string` ✓
- `nextInvoiceNo()` signature identical to the one in `NewInvoice.tsx` ✓
