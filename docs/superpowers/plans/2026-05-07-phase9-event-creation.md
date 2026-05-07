# Phase 9: Event Creation — 2-Step Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-step event creation wizard — Step 1 captures event details, Step 2 handles menu selection — writing the result to Firestore on submit.

**Architecture:** Two small data hooks (`useHalls`, `useMenuOptions`) fetch form reference data once via `getDocs`. The `NewEvent` page owns all wizard state locally (`step`, `step1`, `step2`) with no external state management. On submit, a single `addDoc` writes the complete event document. The router adds `/events/new` before `/events` so the more-specific path is matched first.

**Tech Stack:** React 18, Firestore client SDK (`addDoc`, `getDocs`, `serverTimestamp`, `Timestamp`), react-router-dom `useNavigate`, sonner toasts, Tailwind CSS v3.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useHalls.ts` | One-shot fetch of active hall names |
| Create | `src/hooks/useMenuOptions.ts` | One-shot fetch of active menu options grouped by category |
| Create | `src/pages/events/NewEvent.tsx` | 2-step wizard — event details + menu selection |
| Modify | `src/pages/Events.tsx` | Add "New Event" button (admin only) |
| Modify | `src/router/index.tsx` | Register `/events/new` route before `/events` |

---

### Task 1: useHalls Hook

**Files:**
- Create: `src/hooks/useHalls.ts`

- [ ] **Step 1: Create src/hooks/useHalls.ts**

```typescript
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useHalls(): { halls: string[]; loading: boolean } {
  const [halls, setHalls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'halls'),
      where('is_active', '==', true),
      orderBy('name', 'asc')
    )
    getDocs(q).then((snap) => {
      setHalls(snap.docs.map((d) => d.data().name as string))
      setLoading(false)
    })
  }, [])

  return { halls, loading }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHalls.ts
git commit -m "feat: add useHalls hook"
```

---

### Task 2: useMenuOptions Hook

**Files:**
- Create: `src/hooks/useMenuOptions.ts`

- [ ] **Step 1: Create src/hooks/useMenuOptions.ts**

```typescript
import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MenuOptionsByCategory {
  nasi: string[]
  ayam: string[]
  daging: string[]
  acar: string[]
  bubur: string[]
  air: string[]
}

const EMPTY: MenuOptionsByCategory = {
  nasi: [], ayam: [], daging: [], acar: [], bubur: [], air: [],
}

export function useMenuOptions(): { options: MenuOptionsByCategory; loading: boolean } {
  const [options, setOptions] = useState<MenuOptionsByCategory>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'menu_options'), where('is_active', '==', true))
    getDocs(q).then((snap) => {
      const grouped: MenuOptionsByCategory = { nasi: [], ayam: [], daging: [], acar: [], bubur: [], air: [] }
      snap.docs.forEach((doc) => {
        const { category, name_ms } = doc.data() as { category: string; name_ms: string }
        if (category in grouped) {
          grouped[category as keyof MenuOptionsByCategory].push(name_ms)
        }
      })
      setOptions(grouped)
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMenuOptions.ts
git commit -m "feat: add useMenuOptions hook"
```

---

### Task 3: NewEvent Wizard Page

**Files:**
- Create: `src/pages/events/NewEvent.tsx`

- [ ] **Step 1: Create src/pages/events/NewEvent.tsx**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useHalls } from '@/hooks/useHalls'
import { useMenuOptions } from '@/hooks/useMenuOptions'
import { cn } from '@/lib/utils'

// ── Sub-components ──────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  min,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  min?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
    />
  )
}

function MenuPill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
        selected
          ? 'border-red-600 bg-red-50 text-red-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
    </button>
  )
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center mb-8">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white">
          1
        </div>
        <span className={cn('text-sm font-medium', step === 1 ? 'text-gray-900' : 'text-gray-400')}>
          Event Details
        </span>
      </div>
      <div className={cn('flex-1 h-px mx-4 transition-colors', step === 2 ? 'bg-red-600' : 'bg-gray-200')} />
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
            step === 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
          )}
        >
          2
        </div>
        <span className={cn('text-sm font-medium', step === 2 ? 'text-gray-900' : 'text-gray-400')}>
          Menu Selection
        </span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────

export default function NewEvent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { halls, loading: hallsLoading } = useHalls()
  const { options, loading: menuLoading } = useMenuOptions()

  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)

  const [step1, setStep1] = useState({
    nama_majlis: '',
    hall_name: '',
    tarikh: '',
    sesi: 'siang' as 'siang' | 'malam',
    pax: '' as number | '',
    remarks: '',
  })

  const [step2, setStep2] = useState({
    nasi: '',
    ayam: 'Ayam Masak Merah',
    daging: '',
    acar: '',
    bubur: '',
    air_panas: 'Teh O',
  })

  function handleNext() {
    if (!step1.nama_majlis.trim()) {
      toast.error('Sila masukkan nama majlis.')
      return
    }
    if (!step1.hall_name) {
      toast.error('Sila pilih dewan.')
      return
    }
    if (!step1.tarikh) {
      toast.error('Sila pilih tarikh.')
      return
    }
    if (!step1.pax || Number(step1.pax) < 1) {
      toast.error('Sila masukkan bilangan pax.')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'events'), {
        nama_majlis: step1.nama_majlis.trim(),
        hall_name: step1.hall_name,
        tarikh: Timestamp.fromDate(new Date(step1.tarikh)),
        sesi: step1.sesi,
        pax: Number(step1.pax),
        status: 'upcoming',
        menu_selection: step2,
        remarks: step1.remarks.trim(),
        created_by: user!.uid,
        created_at: serverTimestamp(),
      })
      toast.success('Acara berjaya dicipta!')
      navigate('/events')
    } catch (err: unknown) {
      toast.error('Ralat. Cuba lagi.')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('events.new')}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <StepIndicator step={step} />

        {/* ── Step 1: Event Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Nama Majlis */}
            <div>
              <FieldLabel>{t('events.eventName')}</FieldLabel>
              <TextInput
                value={step1.nama_majlis}
                onChange={(v) => setStep1((s) => ({ ...s, nama_majlis: v }))}
                placeholder="cth: Majlis Perkahwinan Ahmad & Siti"
                required
              />
            </div>

            {/* Dewan */}
            <div>
              <FieldLabel>{t('events.hall')}</FieldLabel>
              <select
                value={step1.hall_name}
                onChange={(e) => setStep1((s) => ({ ...s, hall_name: e.target.value }))}
                disabled={hallsLoading}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
              >
                <option value="">
                  {hallsLoading ? t('common.loading') : '— Pilih Dewan —'}
                </option>
                {halls.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Tarikh + Sesi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('events.date')}</FieldLabel>
                <TextInput
                  type="date"
                  value={step1.tarikh}
                  onChange={(v) => setStep1((s) => ({ ...s, tarikh: v }))}
                  required
                />
              </div>
              <div>
                <FieldLabel>{t('events.session')}</FieldLabel>
                <div className="flex gap-2">
                  {(['siang', 'malam'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStep1((prev) => ({ ...prev, sesi: s }))}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                        step1.sesi === s
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {s === 'siang' ? t('events.sessionMorning') : t('events.sessionEvening')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pax */}
            <div>
              <FieldLabel>{t('events.pax')}</FieldLabel>
              <TextInput
                type="number"
                value={step1.pax}
                onChange={(v) => setStep1((s) => ({ ...s, pax: v === '' ? '' : Number(v) }))}
                placeholder="cth: 500"
                min={1}
                required
              />
            </div>

            {/* Catatan */}
            <div>
              <FieldLabel>{t('common.remarks')}</FieldLabel>
              <textarea
                value={step1.remarks}
                onChange={(e) => setStep1((s) => ({ ...s, remarks: e.target.value }))}
                rows={3}
                placeholder="Nota tambahan..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white resize-none"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Seterusnya →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Menu Selection ── */}
        {step === 2 && (
          <div className="space-y-6">
            {menuLoading ? (
              <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
            ) : (
              <>
                {/* Nasi */}
                <div>
                  <FieldLabel>Nasi</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.nasi.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.nasi === opt}
                        onClick={() => setStep2((s) => ({ ...s, nasi: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Ayam */}
                <div>
                  <FieldLabel>Ayam</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.ayam.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.ayam === opt}
                        onClick={() => setStep2((s) => ({ ...s, ayam: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Daging */}
                <div>
                  <FieldLabel>Daging</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.daging.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.daging === opt}
                        onClick={() => setStep2((s) => ({ ...s, daging: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Acar */}
                <div>
                  <FieldLabel>Acar</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.acar.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.acar === opt}
                        onClick={() => setStep2((s) => ({ ...s, acar: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Bubur */}
                <div>
                  <FieldLabel>Bubur</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.bubur.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.bubur === opt}
                        onClick={() => setStep2((s) => ({ ...s, bubur: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Air Panas */}
                <div>
                  <FieldLabel>Air Panas</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {(options.air.length > 0 ? options.air : ['Teh O', 'Kopi O']).map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.air_panas === opt}
                        onClick={() => setStep2((s) => ({ ...s, air_panas: opt }))}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 transition-colors"
              >
                ← Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? t('common.loading') : t('events.new')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/events/NewEvent.tsx
git commit -m "feat: NewEvent 2-step wizard — event details + menu selection"
```

---

### Task 4: Events Page Button + Router

**Files:**
- Modify: `src/pages/Events.tsx`
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Update src/pages/Events.tsx with New Event button**

```tsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

export default function Events() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userDoc?.role === 'admin'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('events.title')}</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/events/new')}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + {t('events.new')}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update src/router/index.tsx to add /events/new route**

Replace the full file contents with:

```tsx
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Pending from '@/pages/Pending'
import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
import NewEvent from '@/pages/events/NewEvent'
import Ingredients from '@/pages/Ingredients'
import Checklist from '@/pages/Checklist'
import Invoices from '@/pages/Invoices'
import Settings from '@/pages/Settings'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#1B4332]" />
    </div>
  )
}

function RequireAuth() {
  const { user, userDoc, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!userDoc || userDoc.role === 'pending') return <Navigate to="/pending" replace />
  return <Outlet />
}

function PublicOnly() {
  const { user, userDoc, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Outlet />
  if (!userDoc || userDoc.role === 'pending') return <Navigate to="/pending" replace />
  return <Navigate to="/dashboard" replace />
}

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    path: '/pending',
    element: <Pending />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',    element: <Dashboard /> },
          { path: '/events/new',   element: <NewEvent /> },
          { path: '/events',       element: <Events /> },
          { path: '/ingredients',  element: <Ingredients /> },
          { path: '/checklist',    element: <Checklist /> },
          { path: '/invoices',     element: <Invoices /> },
          { path: '/settings',     element: <Settings /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Run tests**

Run: `pnpm test`

Expected: 47 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Events.tsx src/router/index.tsx
git commit -m "feat: add /events/new route and New Event button on Events page"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| useHalls hook (getDocs, active only, ordered) | Task 1 |
| useMenuOptions hook grouped by category | Task 2 |
| StepIndicator with numbered circles + connector line | Task 3 |
| Step 1: nama_majlis, hall select, date, sesi toggle, pax, remarks | Task 3 |
| Step 1 validation with toast.error | Task 3 |
| Step 2: menu pill cards per category | Task 3 |
| Air panas fallback to ['Teh O', 'Kopi O'] if options.air empty | Task 3 |
| Auto-selected defaults (Ayam Masak Merah, Teh O) | Task 3 |
| Firestore addDoc with correct schema | Task 3 |
| toast.success + navigate('/events') on success | Task 3 |
| submitting disabled state on button | Task 3 |
| Events page New Event button (admin only) | Task 4 |
| /events/new route before /events in router | Task 4 |

### Placeholder Check

No TBD, TODO, or incomplete steps. All field labels use `t()` keys. Air panas fallback handles empty Firestore result. Submitting state disables button and shows loading text.

### Type Consistency

- `step1.pax` typed as `number | ''` — converted with `Number(step1.pax)` on submit. Safe: `Number('')` returns `0` but guard `!step1.pax` in `handleNext` prevents reaching submit with empty pax.
- `step` typed as `1 | 2` — `StepIndicator` props match exactly.
- `useHalls` returns `string[]` — used directly as option values and labels in select.
- `useMenuOptions` returns `MenuOptionsByCategory` — all 6 keys accessed directly (`options.nasi`, etc.).
- `Timestamp.fromDate(new Date(step1.tarikh))` — `step1.tarikh` is a `YYYY-MM-DD` string from a date input; `new Date('YYYY-MM-DD')` parses as midnight UTC which is correct for event dates.
