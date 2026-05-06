# Phase 5: Auth + Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete authentication flow — login, register, pending pages, role-based React Router v7 guards, and bilingual i18n context — so the app routes correctly based on Firebase Auth state and Firestore user role.

**Architecture:** Three layers: (1) `AuthContext` wraps Firebase `onAuthStateChanged` + Firestore user doc into a single React context with a `loading` guard that prevents premature redirects during the auth→Firestore fetch sequence; (2) React Router v7 with `RequireAuth` and `PublicOnly` component-guards that read from context and redirect based on role; (3) Three auth pages (Login, Register, Pending) that use shadcn components and `LanguageContext` for en/ms switching.

**Tech Stack:** React 18, React Router DOM v7 (`createBrowserRouter` + `RouterProvider`), Firebase Auth (`onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`), Firestore (`setDoc`, `getDoc`, `serverTimestamp`), TypeScript strict, Tailwind CSS v3 + shadcn/ui (Card, CardHeader, CardContent, CardFooter, Input, Button, Label), sonner (toasts), next-themes (ThemeProvider for Toaster), Vitest (i18n unit tests)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/i18n.ts` | Create | Translation strings (en/ms) + `t()` lookup function |
| `src/lib/i18n.test.ts` | Create | Vitest tests — key completeness + value spot-checks |
| `src/context/LanguageContext.tsx` | Create | en/ms toggle, `localStorage` persist, `useLanguage()` hook |
| `src/context/AuthContext.tsx` | Create | Firebase Auth + Firestore user doc, loading guard, `useAuth()` hook |
| `src/components/layout/AppLayout.tsx` | Create | Sidebar shell (placeholder) + `<Outlet />` for protected pages |
| `src/pages/Dashboard.tsx` | Create | Stub — heading only, placeholder for Phase 6+ |
| `src/pages/Login.tsx` | Create | Email + password form, sonner error toasts |
| `src/pages/Register.tsx` | Create | Full name + email + password form, creates Firestore doc |
| `src/pages/Pending.tsx` | Create | Waiting message + sign out button |
| `src/router/index.tsx` | Create | `createBrowserRouter` with `RequireAuth` and `PublicOnly` guards |
| `src/App.tsx` | Replace | `RouterProvider` + `ThemeProvider` + all context providers + `Toaster` |

---

## Task 1: i18n string table

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/lib/i18n.test.ts`

- [ ] **Step 1: Create `src/lib/i18n.ts`**

```typescript
type Lang = 'en' | 'ms'

const strings = {
  en: {
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
    'lang.toggle': 'BM',
  },
  ms: {
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
    'lang.toggle': 'EN',
  },
} as const

type StringKey = keyof typeof strings.en

export type { Lang, StringKey }
export { strings }

export function t(lang: Lang, key: StringKey): string {
  return strings[lang][key]
}
```

- [ ] **Step 2: Create `src/lib/i18n.test.ts`**

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
})
```

- [ ] **Step 3: Run tests**

```
pnpm test
```

Expected: 4 tests pass in `src/lib/i18n.test.ts`. (38 pre-existing ingredient calculator tests also pass.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n.test.ts
git commit -m "feat: add i18n string table (en/ms) for auth pages"
```

---

## Task 2: LanguageContext

**Files:**
- Create: `src/context/LanguageContext.tsx`

- [ ] **Step 1: Create `src/context/LanguageContext.tsx`**

```tsx
import { createContext, useContext, useState } from 'react'
import { type Lang, type StringKey, t as translate } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: StringKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('kakmell_lang')
    return stored === 'ms' ? 'ms' : 'en'
  })

  function setLang(newLang: Lang) {
    setLangState(newLang)
    localStorage.setItem('kakmell_lang', newLang)
  }

  function toggleLang() {
    setLang(lang === 'en' ? 'ms' : 'en')
  }

  function t(key: StringKey): string {
    return translate(lang, key)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/LanguageContext.tsx
git commit -m "feat: add LanguageContext (en/ms toggle, localStorage persist)"
```

---

## Task 3: AuthContext

**Files:**
- Create: `src/context/AuthContext.tsx`

**Key design:** `loading` is reset to `true` at the start of every `onAuthStateChanged` callback (not just on mount). This prevents a race condition where `user` is set but `userDoc` is not yet fetched — guards would otherwise see `userDoc === null` and redirect to `/pending` prematurely.

- [ ] **Step 1: Create `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export interface UserDoc {
  full_name: string
  email: string
  role: 'pending' | 'admin' | 'kitchen'
}

interface AuthContextValue {
  user: User | null
  userDoc: UserDoc | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null)
      } else {
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: add AuthContext (Firebase Auth + Firestore user doc, loading guard)"
```

---

## Task 4: AppLayout shell + Dashboard stub

**Files:**
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — full navigation UI in Phase 6 */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar" />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/pages/Dashboard.tsx`**

```tsx
export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/pages/Dashboard.tsx
git commit -m "feat: add AppLayout shell and Dashboard stub"
```

---

## Task 5: Login page

**Files:**
- Create: `src/pages/Login.tsx`

**Redirect logic:** After `signInWithEmailAndPassword` resolves, the `AuthContext` `onAuthStateChanged` callback fires, fetches `userDoc`, and sets `loading = false`. The `PublicOnly` guard then re-renders and performs the redirect automatically — no manual `navigate()` call needed in the Login page.

- [ ] **Step 1: Create `src/pages/Login.tsx`**

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

export default function Login() {
  const { t, toggleLang } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Redirect handled automatically by PublicOnly guard in router
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        toast.error(t('auth.login.error.invalidCredentials'))
      } else {
        toast.error(t('auth.login.error.generic'))
      }
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 text-sm font-medium text-[#1B4332] hover:underline"
        type="button"
      >
        {t('lang.toggle')}
      </button>

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

- [ ] **Step 2: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add Login page (email/password, sonner errors, i18n)"
```

---

## Task 6: Register page

**Files:**
- Create: `src/pages/Register.tsx`

**Firestore write:** `setDoc` uses the email from `userCredential.user.email` (not from the form) to guarantee it matches `request.auth.token.email` in the security rules. The document shape `{ full_name, email, role: 'pending', created_at }` exactly matches the Firestore security rule's `hasOnly()` check.

- [ ] **Step 1: Create `src/pages/Register.tsx`**

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

export default function Register() {
  const { t, toggleLang } = useLanguage()
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
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 text-sm font-medium text-[#1B4332] hover:underline"
        type="button"
      >
        {t('lang.toggle')}
      </button>

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

- [ ] **Step 2: Commit**

```bash
git add src/pages/Register.tsx
git commit -m "feat: add Register page (creates users/{uid} with role: pending, i18n)"
```

---

## Task 7: Pending page

**Files:**
- Create: `src/pages/Pending.tsx`

- [ ] **Step 1: Create `src/pages/Pending.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Pending() {
  const { signOut, loading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#1B4332]" />
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B4332]/10 mb-2">
            <Clock className="h-7 w-7 text-[#1B4332]" />
          </div>
          <CardTitle className="text-lg">{t('auth.pending.title')}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>{t('auth.pending.message')}</p>
          <p className="font-medium text-foreground">{t('auth.pending.contact')}</p>
        </CardContent>

        <CardFooter className="justify-center">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="text-[#1B4332] border-[#1B4332]/30 hover:bg-[#1B4332]/5"
          >
            {t('auth.pending.signOut')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Pending.tsx
git commit -m "feat: add Pending page (approval waiting message + sign out)"
```

---

## Task 8: Router + App.tsx + type check

**Files:**
- Create: `src/router/index.tsx`
- Replace: `src/App.tsx`

**Guard logic:**
- `RequireAuth` — if no user → `/login`; if no `userDoc` (Firestore doc missing) → `/pending`; if role `pending` → `/pending`; otherwise render `<Outlet />`
- `PublicOnly` — if loading → spinner; if no user → `<Outlet />`; if user has active role → `/dashboard`; if pending → `/pending`

- [ ] **Step 1: Create `src/router/index.tsx`**

```tsx
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Pending from '@/pages/Pending'
import Dashboard from '@/pages/Dashboard'

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
          { path: '/dashboard', element: <Dashboard /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { router } from '@/router/index'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>
        <LanguageProvider>
          <RouterProvider router={router} />
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: TypeScript check**

```
pnpm tsc --noEmit
```

Expected: no output, exit code 0.

If you see `useNavigate` unused import error in `src/router/index.tsx`: remove the `useNavigate` import (it was included in a draft but not needed after the router guard approach was finalised).

- [ ] **Step 4: Run tests to confirm nothing broken**

```
pnpm test
```

Expected: 42 tests pass (38 ingredient calculator + 4 i18n).

- [ ] **Step 5: Start dev server and test manually**

```
pnpm dev
```

Test these scenarios:
1. Open `http://localhost:5173` → should redirect to `/login`
2. Click Register → fill form → submit → redirected to `/pending`
3. Click Sign Out on `/pending` → back to `/login`
4. Log in with the seeded admin account → redirected to `/dashboard`
5. Toggle language on login/register page → labels change between English and Malay

- [ ] **Step 6: Commit**

```bash
git add src/router/index.tsx src/App.tsx
git commit -m "feat: Phase 5 complete — auth flow, router guards, i18n, login/register/pending pages"
```

---

## Self-Review

**Spec coverage:**
- [x] AuthContext — `onAuthStateChanged` + Firestore user doc fetch + loading guard for race condition
- [x] LanguageContext — en/ms toggle, `localStorage` persist with key `kakmell_lang`
- [x] i18n — full string table with tested key parity between en and ms
- [x] Login page — email + password, sonner error toasts, lang toggle, link to register
- [x] Register page — full_name + email + password, `setDoc users/{uid}` with exact field set matching security rules, navigate to `/pending`
- [x] Pending page — waiting message, admin contact info, sign out button with navigate to `/login`
- [x] Router — `createBrowserRouter`, `RequireAuth` guard, `PublicOnly` guard, `/dashboard` stub
- [x] AppLayout — sidebar placeholder (hidden on mobile) + `<Outlet />`
- [x] Dashboard stub — heading only
- [x] App.tsx — `RouterProvider` + `ThemeProvider` + `AuthProvider` + `LanguageProvider` + `Toaster`
- [x] `loading = true` reset at start of every `onAuthStateChanged` callback (race condition prevention)
- [x] `RequireAuth` treats missing `userDoc` as pending (safe fallback)
- [x] Register uses `credential.user.email` (not form value) for Firestore doc — matches security rule check

**Placeholders:** None.

**Type consistency:**
- `UserDoc.role` is `'pending' | 'admin' | 'kitchen'` in AuthContext — used consistently in guards ✓
- `StringKey` type from i18n is used in `t()` calls across all pages ✓
- `useAuth()` returns `{ user, userDoc, loading, signOut }` — all four consumed correctly in guards and pages ✓
- `useLanguage()` returns `{ lang, setLang, toggleLang, t }` — `t` and `toggleLang` used in all three auth pages ✓
