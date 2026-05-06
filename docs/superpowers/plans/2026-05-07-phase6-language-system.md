# Phase 6: Full Language System (EN/BM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand i18n coverage from auth-only to the full app, build a reusable `LanguageSwitcher` pill component, replace the inline toggle buttons on auth pages with it, add it to `AppLayout`'s header, and wire `Dashboard` to use `t()`.

**Architecture:** All strings live in a single `src/lib/i18n.ts` flat object keyed by dot-notation (`nav.dashboard`, `invoice.total`, etc.); TypeScript's `as const` + `keyof` enforces parity between `en` and `ms` at compile time. `LanguageSwitcher` is a thin button component that reads `useLanguage()` internally — callers only pass an optional `className`. Auth pages stop owning their own toggle logic; they delegate to `<LanguageSwitcher />`. BM-only strings (food categories, session names) use identical values in both `en` and `ms` entries — no special-casing needed.

**Tech Stack:** TypeScript `as const` type inference, Vitest, React, Tailwind CSS v3, `cn()` from `@/lib/utils`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/i18n.ts` | Replace | Expand from 26 → 119 keys across 8 sections |
| `src/lib/i18n.test.ts` | Update | Add spot-checks for new sections + BM-only key invariant |
| `src/components/LanguageSwitcher.tsx` | Create | Pill toggle button, `className` prop, uses `useLanguage()` |
| `src/pages/Login.tsx` | Modify | Swap inline button for `<LanguageSwitcher className="absolute top-4 right-4" />` |
| `src/pages/Register.tsx` | Modify | Same swap as Login |
| `src/components/layout/AppLayout.tsx` | Modify | Add slim header with `<LanguageSwitcher />` in top-right |
| `src/pages/Dashboard.tsx` | Modify | Use `t('dashboard.title')` instead of hardcoded string |

---

## Task 1: Expand i18n.ts + update tests

**Files:**
- Replace: `src/lib/i18n.ts`
- Modify: `src/lib/i18n.test.ts`

**Key design choices baked into the string table:**
- Session labels (`events.sessionMorning`, `events.sessionEvening`) are `'Siang'` / `'Malam'` in **both** `en` and `ms` — always BM per CLAUDE.md.
- Food category shorthands (`events.rice`, `events.chicken`, `ingredients.daging`, etc.) are BM in both languages for the same reason.
- `invoice.gajiPerkerja` is `'Staff Wages'` in `en` and `'Gaji Pekerja'` in `ms` — the BM term appears on the PDF regardless, but the UI label translates.

- [ ] **Step 1: Replace `src/lib/i18n.ts` with the full 119-key table**

```typescript
type Lang = 'en' | 'ms'

const strings = {
  en: {
    // ── Auth ──────────────────────────────────────────────────────────────
    'auth.login.title': 'Sign In',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Sign In',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.register': 'Register',
    'auth.login.error.invalidCredentials': 'Invalid email or password.',
    'auth.login.error.generic': 'Sign in failed. Please try again.',
    'auth.register.title': 'Create Account',
    'auth.register.fullName': 'Full Name',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.submit': 'Register',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.login': 'Sign In',
    'auth.register.error.emailInUse': 'This email is already registered.',
    'auth.register.error.weakPassword': 'Password must be at least 6 characters.',
    'auth.register.error.generic': 'Registration failed. Please try again.',
    'auth.pending.title': 'Account Pending Approval',
    'auth.pending.message': 'Your account is awaiting approval from the admin. You will be notified once access is granted.',
    'auth.pending.contact': 'Contact NORMILA at +6018-397 0769 for assistance.',
    'auth.pending.signOut': 'Sign Out',
    // ── Language toggle ────────────────────────────────────────────────────
    'lang.toggle': 'BM',
    // ── Navigation ────────────────────────────────────────────────────────
    'nav.dashboard': 'Dashboard',
    'nav.events': 'Events',
    'nav.ingredients': 'Ingredients',
    'nav.checklist': 'Checklist',
    'nav.invoices': 'Invoices',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    // ── Common actions / labels ────────────────────────────────────────────
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.remarks': 'Remarks',
    // ── Dashboard ─────────────────────────────────────────────────────────
    'dashboard.title': 'Dashboard',
    'dashboard.upcomingEvents': 'Upcoming Events',
    'dashboard.completedEvents': 'Completed',
    'dashboard.noEvents': 'No upcoming events',
    'dashboard.totalEvents': 'Total Events',
    'dashboard.thisWeek': 'This Week',
    // ── Events ────────────────────────────────────────────────────────────
    'events.title': 'Events',
    'events.new': 'New Event',
    'events.eventName': 'Event Name',
    'events.hall': 'Hall',
    'events.date': 'Date',
    'events.session': 'Session',
    'events.sessionMorning': 'Siang',   // BM only — both langs identical
    'events.sessionEvening': 'Malam',   // BM only — both langs identical
    'events.pax': 'Pax',
    'events.remarks': 'Remarks',
    'events.menuSelection': 'Menu Selection',
    'events.statusUpcoming': 'Upcoming',
    'events.statusCompleted': 'Completed',
    'events.statusCancelled': 'Cancelled',
    'events.noEvents': 'No events found',
    'events.confirmDelete': 'Delete this event?',
    'events.rice': 'Nasi',    // BM only
    'events.chicken': 'Ayam', // BM only
    // ── Ingredients ───────────────────────────────────────────────────────
    'ingredients.title': 'Ingredients',
    'ingredients.bracket': 'Pax Bracket',
    'ingredients.mainItems': 'Main Items',
    'ingredients.daging': 'Daging',   // BM only
    'ingredients.dalca': 'Dalca',     // BM only
    'ingredients.bubur': 'Bubur',     // BM only
    'ingredients.acar': 'Acar',       // BM only
    'ingredients.dagingBox': 'Beef Boxes',
    'ingredients.sliceBoxes': 'Slice Boxes',
    'ingredients.trimBoxes': 'Trim Box',
    'ingredients.variance': 'Variance',
    // ── Checklist ─────────────────────────────────────────────────────────
    'checklist.title': 'Daily Checklist',
    'checklist.resetConfirm': 'Reset checklist for today?',
    'checklist.allDone': 'All items checked',
    'checklist.lastUpdated': 'Last updated',
    // ── Invoice ───────────────────────────────────────────────────────────
    'invoice.title': 'Invoices',
    'invoice.new': 'New Invoice',
    'invoice.invoiceNo': 'Invoice No.',
    'invoice.invoiceDate': 'Invoice Date',
    'invoice.billedTo': 'Billed To',
    'invoice.description': 'Description',
    'invoice.qty': 'Qty',
    'invoice.unitPrice': 'Unit Price',
    'invoice.total': 'Total',
    'invoice.subtotal': 'Subtotal',
    'invoice.gajiPerkerja': 'Staff Wages',
    'invoice.statusDraft': 'Draft',
    'invoice.statusSent': 'Sent',
    'invoice.statusPaid': 'Paid',
    'invoice.generatePdf': 'Generate PDF',
    'invoice.markSent': 'Mark as Sent',
    'invoice.markPaid': 'Mark as Paid',
    'invoice.noInvoices': 'No invoices yet',
    // ── Settings ──────────────────────────────────────────────────────────
    'settings.title': 'Settings',
    'settings.users': 'Manage Users',
    'settings.menu': 'Menu Options',
    'settings.halls': 'Halls',
    'settings.devSettings': 'Developer Settings',
    'settings.approve': 'Approve',
    'settings.changeRole': 'Change Role',
    'settings.roleAdmin': 'Admin',
    'settings.roleKitchen': 'Kitchen Staff',
    'settings.rolePending': 'Pending',
    'settings.hallName': 'Hall Name',
    'settings.active': 'Active',
    'settings.inactive': 'Inactive',
    'settings.addHall': 'Add Hall',
    'settings.addMenu': 'Add Menu Item',
    'settings.category': 'Category',
    'settings.devPassword': 'Developer Password',
  },
  ms: {
    // ── Auth ──────────────────────────────────────────────────────────────
    'auth.login.title': 'Log Masuk',
    'auth.login.email': 'E-mel',
    'auth.login.password': 'Kata Laluan',
    'auth.login.submit': 'Log Masuk',
    'auth.login.noAccount': 'Tiada akaun?',
    'auth.login.register': 'Daftar',
    'auth.login.error.invalidCredentials': 'E-mel atau kata laluan tidak sah.',
    'auth.login.error.generic': 'Log masuk gagal. Sila cuba lagi.',
    'auth.register.title': 'Buat Akaun',
    'auth.register.fullName': 'Nama Penuh',
    'auth.register.email': 'E-mel',
    'auth.register.password': 'Kata Laluan',
    'auth.register.submit': 'Daftar',
    'auth.register.hasAccount': 'Sudah ada akaun?',
    'auth.register.login': 'Log Masuk',
    'auth.register.error.emailInUse': 'E-mel ini sudah didaftarkan.',
    'auth.register.error.weakPassword': 'Kata laluan mestilah sekurang-kurangnya 6 aksara.',
    'auth.register.error.generic': 'Pendaftaran gagal. Sila cuba lagi.',
    'auth.pending.title': 'Akaun Menunggu Kelulusan',
    'auth.pending.message': 'Akaun anda sedang menunggu kelulusan daripada pentadbir. Anda akan diberitahu setelah akses diberikan.',
    'auth.pending.contact': 'Hubungi NORMILA di +6018-397 0769 untuk bantuan.',
    'auth.pending.signOut': 'Log Keluar',
    // ── Language toggle ────────────────────────────────────────────────────
    'lang.toggle': 'EN',
    // ── Navigation ────────────────────────────────────────────────────────
    'nav.dashboard': 'Papan Pemuka',
    'nav.events': 'Acara',
    'nav.ingredients': 'Bahan',
    'nav.checklist': 'Senarai Semak',
    'nav.invoices': 'Invois',
    'nav.settings': 'Tetapan',
    'nav.signOut': 'Log Keluar',
    // ── Common actions / labels ────────────────────────────────────────────
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Padam',
    'common.edit': 'Edit',
    'common.add': 'Tambah',
    'common.loading': 'Memuatkan...',
    'common.confirm': 'Sahkan',
    'common.yes': 'Ya',
    'common.no': 'Tidak',
    'common.back': 'Kembali',
    'common.search': 'Cari',
    'common.actions': 'Tindakan',
    'common.status': 'Status',
    'common.date': 'Tarikh',
    'common.remarks': 'Catatan',
    // ── Dashboard ─────────────────────────────────────────────────────────
    'dashboard.title': 'Papan Pemuka',
    'dashboard.upcomingEvents': 'Acara Akan Datang',
    'dashboard.completedEvents': 'Selesai',
    'dashboard.noEvents': 'Tiada acara akan datang',
    'dashboard.totalEvents': 'Jumlah Acara',
    'dashboard.thisWeek': 'Minggu Ini',
    // ── Events ────────────────────────────────────────────────────────────
    'events.title': 'Acara',
    'events.new': 'Acara Baru',
    'events.eventName': 'Nama Majlis',
    'events.hall': 'Dewan',
    'events.date': 'Tarikh',
    'events.session': 'Sesi',
    'events.sessionMorning': 'Siang',   // BM only — same as en
    'events.sessionEvening': 'Malam',   // BM only — same as en
    'events.pax': 'Pax',
    'events.remarks': 'Catatan',
    'events.menuSelection': 'Pilihan Menu',
    'events.statusUpcoming': 'Akan Datang',
    'events.statusCompleted': 'Selesai',
    'events.statusCancelled': 'Dibatalkan',
    'events.noEvents': 'Tiada acara dijumpai',
    'events.confirmDelete': 'Padam acara ini?',
    'events.rice': 'Nasi',    // BM only — same as en
    'events.chicken': 'Ayam', // BM only — same as en
    // ── Ingredients ───────────────────────────────────────────────────────
    'ingredients.title': 'Bahan-bahan',
    'ingredients.bracket': 'Kuantiti Pax',
    'ingredients.mainItems': 'Bahan Utama',
    'ingredients.daging': 'Daging',   // BM only — same as en
    'ingredients.dalca': 'Dalca',     // BM only — same as en
    'ingredients.bubur': 'Bubur',     // BM only — same as en
    'ingredients.acar': 'Acar',       // BM only — same as en
    'ingredients.dagingBox': 'Kotak Daging',
    'ingredients.sliceBoxes': 'Kotak Potong',
    'ingredients.trimBoxes': 'Kotak Trim',
    'ingredients.variance': 'Lebihan',
    // ── Checklist ─────────────────────────────────────────────────────────
    'checklist.title': 'Senarai Semak Harian',
    'checklist.resetConfirm': 'Set semula senarai semak hari ini?',
    'checklist.allDone': 'Semua item ditandai',
    'checklist.lastUpdated': 'Kemaskini terakhir',
    // ── Invoice ───────────────────────────────────────────────────────────
    'invoice.title': 'Invois',
    'invoice.new': 'Invois Baru',
    'invoice.invoiceNo': 'No. Invois',
    'invoice.invoiceDate': 'Tarikh Invois',
    'invoice.billedTo': 'Kepada',
    'invoice.description': 'Penerangan',
    'invoice.qty': 'Kuantiti',
    'invoice.unitPrice': 'Harga Seunit',
    'invoice.total': 'Jumlah',
    'invoice.subtotal': 'Subtotal',
    'invoice.gajiPerkerja': 'Gaji Pekerja',
    'invoice.statusDraft': 'Draf',
    'invoice.statusSent': 'Dihantar',
    'invoice.statusPaid': 'Dibayar',
    'invoice.generatePdf': 'Jana PDF',
    'invoice.markSent': 'Tandakan Dihantar',
    'invoice.markPaid': 'Tandakan Dibayar',
    'invoice.noInvoices': 'Tiada invois lagi',
    // ── Settings ──────────────────────────────────────────────────────────
    'settings.title': 'Tetapan',
    'settings.users': 'Urus Pengguna',
    'settings.menu': 'Pilihan Menu',
    'settings.halls': 'Dewan',
    'settings.devSettings': 'Tetapan Pembangun',
    'settings.approve': 'Lulus',
    'settings.changeRole': 'Tukar Peranan',
    'settings.roleAdmin': 'Pentadbir',
    'settings.roleKitchen': 'Kakitangan Dapur',
    'settings.rolePending': 'Menunggu',
    'settings.hallName': 'Nama Dewan',
    'settings.active': 'Aktif',
    'settings.inactive': 'Tidak Aktif',
    'settings.addHall': 'Tambah Dewan',
    'settings.addMenu': 'Tambah Item Menu',
    'settings.category': 'Kategori',
    'settings.devPassword': 'Kata Laluan Pembangun',
  },
} as const

type StringKey = keyof typeof strings.en

export type { Lang, StringKey }
export { strings }

export function t(lang: Lang, key: StringKey): string {
  return strings[lang][key]
}
```

- [ ] **Step 2: Update `src/lib/i18n.test.ts` with new spot-checks**

```typescript
import { describe, it, expect } from 'vitest'
import { t, strings } from './i18n'

describe('t()', () => {
  it('returns English strings for en lang', () => {
    expect(t('en', 'auth.login.title')).toBe('Sign In')
    expect(t('en', 'auth.register.title')).toBe('Create Account')
    expect(t('en', 'auth.pending.title')).toBe('Account Pending Approval')
  })

  it('returns Malay strings for ms lang', () => {
    expect(t('ms', 'auth.login.title')).toBe('Log Masuk')
    expect(t('ms', 'auth.register.title')).toBe('Buat Akaun')
    expect(t('ms', 'auth.pending.title')).toBe('Akaun Menunggu Kelulusan')
  })

  it('lang toggle label is opposite language name', () => {
    expect(t('en', 'lang.toggle')).toBe('BM')
    expect(t('ms', 'lang.toggle')).toBe('EN')
  })

  it('en and ms have identical key sets', () => {
    const enKeys = Object.keys(strings.en).sort()
    const msKeys = Object.keys(strings.ms).sort()
    expect(enKeys).toEqual(msKeys)
  })

  it('nav section: en and ms differ where expected', () => {
    expect(t('en', 'nav.dashboard')).toBe('Dashboard')
    expect(t('ms', 'nav.dashboard')).toBe('Papan Pemuka')
    expect(t('en', 'nav.events')).toBe('Events')
    expect(t('ms', 'nav.events')).toBe('Acara')
    expect(t('en', 'nav.invoices')).toBe('Invoices')
    expect(t('ms', 'nav.invoices')).toBe('Invois')
  })

  it('common section translates correctly', () => {
    expect(t('en', 'common.save')).toBe('Save')
    expect(t('ms', 'common.save')).toBe('Simpan')
    expect(t('en', 'common.cancel')).toBe('Cancel')
    expect(t('ms', 'common.cancel')).toBe('Batal')
  })

  it('BM-only keys are identical in en and ms', () => {
    // Session labels stay Malay regardless of UI language
    expect(t('en', 'events.sessionMorning')).toBe('Siang')
    expect(t('ms', 'events.sessionMorning')).toBe('Siang')
    expect(t('en', 'events.sessionEvening')).toBe('Malam')
    expect(t('ms', 'events.sessionEvening')).toBe('Malam')
    // Food category names stay Malay
    expect(t('en', 'events.rice')).toBe('Nasi')
    expect(t('ms', 'events.rice')).toBe('Nasi')
    expect(t('en', 'ingredients.daging')).toBe('Daging')
    expect(t('ms', 'ingredients.daging')).toBe('Daging')
  })

  it('invoice section translates correctly', () => {
    expect(t('en', 'invoice.gajiPerkerja')).toBe('Staff Wages')
    expect(t('ms', 'invoice.gajiPerkerja')).toBe('Gaji Pekerja')
    expect(t('en', 'invoice.statusDraft')).toBe('Draft')
    expect(t('ms', 'invoice.statusDraft')).toBe('Draf')
  })

  it('settings section translates correctly', () => {
    expect(t('en', 'settings.approve')).toBe('Approve')
    expect(t('ms', 'settings.approve')).toBe('Lulus')
    expect(t('en', 'settings.roleKitchen')).toBe('Kitchen Staff')
    expect(t('ms', 'settings.roleKitchen')).toBe('Kakitangan Dapur')
  })
})
```

- [ ] **Step 3: Run tests**

```
pnpm test
```

Expected: 10 tests pass across `i18n.test.ts` (6 new + 4 existing) plus 38 from `ingredient-calculator.test.ts` — **48 total**.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat: expand i18n to full app coverage (119 keys, 8 sections)"
```

---

## Task 2: LanguageSwitcher component

**Files:**
- Create: `src/components/LanguageSwitcher.tsx`

- [ ] **Step 1: Create `src/components/LanguageSwitcher.tsx`**

```tsx
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function LanguageSwitcher({ className }: Props) {
  const { t, toggleLang } = useLanguage()
  return (
    <button
      onClick={toggleLang}
      type="button"
      className={cn(
        'text-xs font-semibold px-2 py-1 rounded border border-[#1B4332]/30 text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors select-none',
        className
      )}
    >
      {t('lang.toggle')}
    </button>
  )
}
```

- [ ] **Step 2: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/LanguageSwitcher.tsx
git commit -m "feat: add LanguageSwitcher pill component"
```

---

## Task 3: Refactor Login + Register to use LanguageSwitcher

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Register.tsx`

Both pages have this inline block to remove:
```tsx
<button
  onClick={toggleLang}
  className="absolute top-4 right-4 text-sm font-medium text-[#1B4332] hover:underline"
  type="button"
>
  {t('lang.toggle')}
</button>
```

Replace it with `<LanguageSwitcher className="absolute top-4 right-4" />`.

Also remove `toggleLang` from the `useLanguage()` destructuring in each file.

- [ ] **Step 1: Update `src/pages/Login.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'sonner'
import { auth } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Login() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        toast.error(t('auth.login.error.invalidCredentials'))
      } else {
        toast.error(t('auth.login.error.generic'))
      }
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <LanguageSwitcher className="absolute top-4 right-4" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-0">
          <p className="text-xl font-bold tracking-wide text-[#1B4332]">KAKMELL RESOURCES</p>
          <CardTitle className="text-base text-muted-foreground font-normal mt-1">
            {t('auth.login.title')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#1B4332] text-white hover:bg-[#1B4332]/90 h-10"
            >
              {loading ? '...' : t('auth.login.submit')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>{t('auth.login.noAccount')}</span>
          <Link to="/register" className="font-medium text-[#1B4332] hover:underline">
            {t('auth.login.register')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/pages/Register.tsx`**

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Register() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', credential.user.uid), {
        full_name: fullName,
        email: credential.user.email,
        role: 'pending',
        created_at: serverTimestamp(),
      })
      navigate('/pending')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        toast.error(t('auth.register.error.emailInUse'))
      } else if (code === 'auth/weak-password') {
        toast.error(t('auth.register.error.weakPassword'))
      } else {
        toast.error(t('auth.register.error.generic'))
      }
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <LanguageSwitcher className="absolute top-4 right-4" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-0">
          <p className="text-xl font-bold tracking-wide text-[#1B4332]">KAKMELL RESOURCES</p>
          <CardTitle className="text-base text-muted-foreground font-normal mt-1">
            {t('auth.register.title')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">{t('auth.register.fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.register.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.register.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#1B4332] text-white hover:bg-[#1B4332]/90 h-10"
            >
              {loading ? '...' : t('auth.register.submit')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>{t('auth.register.hasAccount')}</span>
          <Link to="/login" className="font-medium text-[#1B4332] hover:underline">
            {t('auth.register.login')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Login.tsx src/pages/Register.tsx
git commit -m "refactor: replace inline lang toggle with LanguageSwitcher on auth pages"
```

---

## Task 4: AppLayout header + Dashboard i18n

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Update `src/components/layout/AppLayout.tsx`**

Add a slim `h-12` header bar inside the main column — to the right of the sidebar — with `LanguageSwitcher` pinned top-right. The sidebar stays outside the column to ensure the header only spans the content area on desktop.

```tsx
import { Outlet } from 'react-router-dom'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — full navigation UI in Phase 7 */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar" />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-12 shrink-0 border-b border-border flex items-center justify-end px-4">
          <LanguageSwitcher />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/pages/Dashboard.tsx`**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Dashboard() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/pages/Dashboard.tsx
git commit -m "feat: add header with LanguageSwitcher to AppLayout, wire Dashboard i18n"
```

---

## Task 5: Final verification

**Files:** (none modified)

- [ ] **Step 1: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 2: Full test run**

```
pnpm test
```

Expected: **48 tests pass** — 38 ingredient calculator + 10 i18n.

- [ ] **Step 3: Dev server smoke test**

```
pnpm dev
```

Open `http://localhost:5173`:
1. `/login` → shows "BM" pill top-right → click → labels switch to Malay → pill shows "EN" → click → back to English
2. `/register` → same toggle behaviour
3. Log in as admin → `/dashboard` heading reads "Dashboard" in EN or "Papan Pemuka" in MS

- [ ] **Step 4: Final commit (if any fix was needed)**

If step 1–3 required changes, commit them. Otherwise skip.

```bash
git add -A
git commit -m "fix: language system post-review corrections"
```

---

## Self-Review

**Spec coverage:**
- [x] `src/lib/i18n.ts` expanded to 119 keys across `auth`, `lang`, `nav`, `common`, `dashboard`, `events`, `ingredients`, `checklist`, `invoice`, `settings`
- [x] BM-only keys (`events.sessionMorning/Evening`, `events.rice/chicken`, `ingredients.daging/dalca/bubur/acar`) identical in both `en` and `ms`
- [x] `LanguageSwitcher` — `className` prop, pill style, `useLanguage()` internally
- [x] `Login.tsx` — inline button removed, `<LanguageSwitcher className="absolute top-4 right-4" />` added, `toggleLang` removed from destructuring
- [x] `Register.tsx` — same as Login
- [x] `Pending.tsx` — no toggle to replace, left unchanged ✓
- [x] `AppLayout.tsx` — slim header with `LanguageSwitcher` pinned top-right, only spans content column (not over sidebar)
- [x] `Dashboard.tsx` — uses `t('dashboard.title')`
- [x] Tests: 4 existing pass + 6 new spot-checks = 10 i18n tests total

**Placeholders:** None.

**Type consistency:**
- `StringKey` inferred from `keyof typeof strings.en` — all 119 keys are automatically typed, any missing `ms` key causes a TS compile error ✓
- `LanguageSwitcher` uses `Props { className?: string }` — consumed as `<LanguageSwitcher className="..." />` in all three call sites ✓
- `useLanguage()` returns `{ t, toggleLang, ... }` — `toggleLang` used only inside `LanguageSwitcher`, removed from page destructurings ✓
