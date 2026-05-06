# Phase 7: App Layout + Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full app shell — branded sidebar (desktop), bottom nav (mobile), and correct role-based navigation for admin and kitchen roles.

**Architecture:** Sidebar and BottomNav are separate components wired into AppLayout. Role-based visibility is computed from `useAuth().userDoc.role` directly in each nav component. Stub pages added for all routes; router updated with all 6 protected routes.

**Tech Stack:** React 18, React Router v6 NavLink, Tailwind CSS v3, lucide-react, Plus Jakarta Sans (Google Fonts).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `index.html` | Add Google Fonts preconnect + stylesheet for Plus Jakarta Sans |
| Modify | `tailwind.config.js` | Update fontFamily to use Plus Jakarta Sans |
| Modify | `src/index.css` | Update brand CSS variables (primary, background, sidebar) |
| Create | `src/components/layout/Sidebar.tsx` | Desktop sidebar — logo, role-based nav, sign out |
| Create | `src/components/layout/BottomNav.tsx` | Mobile bottom nav — role-based icons |
| Modify | `src/components/layout/AppLayout.tsx` | Wire Sidebar + BottomNav into shell |
| Create | `src/pages/Events.tsx` | Stub page |
| Create | `src/pages/Ingredients.tsx` | Stub page |
| Create | `src/pages/Checklist.tsx` | Stub page |
| Create | `src/pages/Invoices.tsx` | Stub page |
| Create | `src/pages/Settings.tsx` | Stub page |
| Modify | `src/router/index.tsx` | Add all 5 new protected routes |

---

### Task 1: Font Setup

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Add Plus Jakarta Sans font link to index.html**

Replace the contents of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KAKMELL RESOURCES</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Update tailwind.config.js fontFamily**

In `tailwind.config.js`, replace the `fontFamily` block:

```js
fontFamily: {
  sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
  heading: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
},
```

- [ ] **Step 3: Commit**

```bash
git add index.html tailwind.config.js
git commit -m "feat: add Plus Jakarta Sans font"
```

---

### Task 2: Brand CSS Variables

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update CSS variables in src/index.css**

Replace the `:root` block (lines 6–28) with:

```css
@layer base {
  :root {
    --background: 60 9% 98%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 154 43% 18%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 154 43% 18%;
    --radius: 0.5rem;
    --sidebar: 154 43% 18%;
  }
}
```

- [ ] **Step 2: Verify dev server shows warm white background**

Run: `pnpm dev`

Open `http://localhost:5173/login` — background should be a warm off-white, not pure white. The Login card and forest green brand text remain correct.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: update brand CSS variables to forest green + warm white"
```

---

### Task 3: Sidebar Component

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create src/components/layout/Sidebar.tsx**

```tsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  CheckSquare,
  Receipt,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  roles: ('admin' | 'kitchen')[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav.dashboard',    roles: ['admin', 'kitchen'] },
  { to: '/events',      icon: CalendarDays,    labelKey: 'nav.events',        roles: ['admin'] },
  { to: '/ingredients', icon: Package,          labelKey: 'nav.ingredients',   roles: ['admin', 'kitchen'] },
  { to: '/checklist',   icon: CheckSquare,      labelKey: 'nav.checklist',     roles: ['admin', 'kitchen'] },
  { to: '/invoices',    icon: Receipt,          labelKey: 'nav.invoices',      roles: ['admin'] },
  { to: '/settings',    icon: SettingsIcon,     labelKey: 'nav.settings',      roles: ['admin'] },
]

export default function Sidebar() {
  const { userDoc, signOut } = useAuth()
  const { t } = useLanguage()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#1B4332]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <p className="text-white font-bold text-xs tracking-[0.15em] uppercase leading-tight">
          Kakmell
        </p>
        <p className="text-white/70 font-medium text-[10px] tracking-[0.1em] uppercase">
          Resources
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white border-l-2 border-amber-400 pl-[10px]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white border-l-2 border-transparent pl-[10px]'
              )
            }
          >
            <item.icon size={17} strokeWidth={1.8} />
            <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <LogOut size={17} strokeWidth={1.8} />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors related to Sidebar.tsx. (Other pre-existing errors are fine.)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Sidebar component with role-based nav"
```

---

### Task 4: BottomNav Component

**Files:**
- Create: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Create src/components/layout/BottomNav.tsx**

```tsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  CheckSquare,
  Receipt,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface BottomNavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  roles: ('admin' | 'kitchen')[]
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav.dashboard',  roles: ['admin', 'kitchen'] },
  { to: '/events',      icon: CalendarDays,    labelKey: 'nav.events',      roles: ['admin'] },
  { to: '/ingredients', icon: Package,          labelKey: 'nav.ingredients', roles: ['admin', 'kitchen'] },
  { to: '/checklist',   icon: CheckSquare,      labelKey: 'nav.checklist',   roles: ['admin', 'kitchen'] },
  { to: '/invoices',    icon: Receipt,          labelKey: 'nav.invoices',    roles: ['admin'] },
]

export default function BottomNav() {
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = BOTTOM_NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-border flex items-stretch">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#1B4332]' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/BottomNav.tsx
git commit -m "feat: add BottomNav component with role-based mobile nav"
```

---

### Task 5: Rewrite AppLayout

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Replace AppLayout.tsx contents**

```tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-12 shrink-0 border-b border-border flex items-center justify-end px-4">
          <LanguageSwitcher />
        </header>
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify desktop layout**

Run: `pnpm dev`

Open `http://localhost:5173/dashboard` — verify:
- Forest green sidebar visible on left (≥768px viewport)
- "KAKMELL RESOURCES" branding at top of sidebar
- Dashboard nav item highlighted with amber left border
- LanguageSwitcher in top-right header
- No sidebar on mobile (< 768px)
- Bottom nav appears on mobile

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: wire Sidebar and BottomNav into AppLayout"
```

---

### Task 6: Stub Pages

**Files:**
- Create: `src/pages/Events.tsx`
- Create: `src/pages/Ingredients.tsx`
- Create: `src/pages/Checklist.tsx`
- Create: `src/pages/Invoices.tsx`
- Create: `src/pages/Settings.tsx`

- [ ] **Step 1: Create src/pages/Events.tsx**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Events() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('events.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 2: Create src/pages/Ingredients.tsx**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Ingredients() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('ingredients.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 3: Create src/pages/Checklist.tsx**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Checklist() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('checklist.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 4: Create src/pages/Invoices.tsx**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Invoices() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('invoice.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 5: Create src/pages/Settings.tsx**

```tsx
import { useLanguage } from '@/context/LanguageContext'

export default function Settings() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Events.tsx src/pages/Ingredients.tsx src/pages/Checklist.tsx src/pages/Invoices.tsx src/pages/Settings.tsx
git commit -m "feat: add stub pages for all protected routes"
```

---

### Task 7: Router Update

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Replace src/router/index.tsx with all routes**

```tsx
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Pending from '@/pages/Pending'
import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
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
          { path: '/dashboard',   element: <Dashboard /> },
          { path: '/events',      element: <Events /> },
          { path: '/ingredients', element: <Ingredients /> },
          { path: '/checklist',   element: <Checklist /> },
          { path: '/invoices',    element: <Invoices /> },
          { path: '/settings',    element: <Settings /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no new errors.

- [ ] **Step 3: Verify all routes work in browser**

Run: `pnpm dev`

Navigate to each route and confirm:
- `/dashboard` — "Dashboard" / "Papan Pemuka" heading
- `/events` — "Events" / "Acara" heading
- `/ingredients` — "Ingredients" / "Bahan-bahan" heading
- `/checklist` — "Daily Checklist" / "Senarai Semak Harian" heading
- `/invoices` — "Invoices" / "Invois" heading
- `/settings` — "Settings" / "Tetapan" heading

Confirm sidebar nav highlights the active route on each.

- [ ] **Step 4: Commit**

```bash
git add src/router/index.tsx
git commit -m "feat: add all protected routes to router"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Plus Jakarta Sans font | Task 1 |
| tailwind.config.js fontFamily | Task 1 |
| CSS brand variables (primary, background, sidebar) | Task 2 |
| Sidebar with role-based nav | Task 3 |
| Sidebar logo area | Task 3 |
| Sidebar sign out button | Task 3 |
| Active nav item amber left border | Task 3 |
| BottomNav for mobile | Task 4 |
| BottomNav role-based items (3 for kitchen, 5 for admin) | Task 4 |
| AppLayout wired with Sidebar + BottomNav | Task 5 |
| pb-16 on mobile to avoid BottomNav overlap | Task 5 |
| 5 stub pages | Task 6 |
| All 6 routes in router | Task 7 |

### Placeholder Check

No TBD, TODO, or "similar to Task N" references found. All steps contain complete code.

### Type Consistency

- `NAV_ITEMS` in Sidebar uses `labelKey: string` cast to `Parameters<typeof t>[0]` — consistent with how t() is typed in i18n.ts (flat string union).
- `BOTTOM_NAV_ITEMS` in BottomNav uses the same pattern.
- `signOut` comes from `useAuth()` which exports `signOut: () => Promise<void>` — used directly as `onClick` handler, correct.
- `userDoc?.role` typed as `'pending' | 'admin' | 'kitchen'` — filtered against `'admin' | 'kitchen'` union, no type error.
