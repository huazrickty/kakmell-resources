# Phase 8: Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dashboard page with role-based views — admin sees 4 stat cards + upcoming/completed event lists; kitchen staff see upcoming events only.

**Architecture:** A `useEvents` real-time Firestore hook feeds both the stat cards and event lists. The `EventSummaryCard` component renders a calendar date-stamp layout. All derived counts (upcoming, completed, this week) are computed in the Dashboard from a single `events` array — no extra queries. Role check comes from `useAuth().userDoc.role`.

**Tech Stack:** React 18, Firestore `onSnapshot`, date-fns 4.1.0, lucide-react, Tailwind CSS v3, Plus Jakarta Sans.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useEvents.ts` | Real-time Firestore subscription for events collection |
| Create | `src/components/EventSummaryCard.tsx` | Calendar date-stamp event card component |
| Modify | `src/pages/Dashboard.tsx` | Full rewrite — stat cards + event lists, role-based |

---

### Task 1: useEvents Hook

**Files:**
- Create: `src/hooks/useEvents.ts`

- [ ] **Step 1: Create src/hooks/useEvents.ts**

```typescript
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface EventDoc {
  id: string
  nama_majlis: string
  hall_name: string
  tarikh: Timestamp
  sesi: 'siang' | 'malam'
  pax: number
  status: 'upcoming' | 'completed' | 'cancelled'
  remarks: string
}

export function useEvents(): { events: EventDoc[]; loading: boolean } {
  const [events, setEvents] = useState<EventDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('tarikh', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EventDoc, 'id'>) }))
      )
      setLoading(false)
    })
    return unsub
  }, [])

  return { events, loading }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors. (No runtime test needed — this is a Firestore hook, requires live DB.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEvents.ts
git commit -m "feat: add useEvents real-time Firestore hook"
```

---

### Task 2: EventSummaryCard Component

**Files:**
- Create: `src/components/EventSummaryCard.tsx`

- [ ] **Step 1: Create src/components/EventSummaryCard.tsx**

```tsx
import { format } from 'date-fns'
import { Sun, Moon, MapPin, Users } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import type { EventDoc } from '@/hooks/useEvents'

interface Props {
  event: EventDoc
}

const STATUS_STYLES = {
  upcoming:  'bg-red-50 text-red-700 border border-red-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const DATE_STYLES = {
  upcoming:  'text-red-600',
  completed: 'text-gray-400',
  cancelled: 'text-gray-300 line-through',
}

const BORDER_STYLES = {
  upcoming:  'border-l-4 border-red-600',
  completed: 'border-l-4 border-gray-200',
  cancelled: 'border-l-4 border-gray-100',
}

const STATUS_LABEL_KEYS = {
  upcoming:  'events.statusUpcoming',
  completed: 'events.statusCompleted',
  cancelled: 'events.statusCancelled',
} as const

export default function EventSummaryCard({ event }: Props) {
  const { t } = useLanguage()
  const date = event.tarikh.toDate()
  const day = format(date, 'd')
  const month = format(date, 'MMM').toUpperCase()

  return (
    <div
      className={cn(
        'flex bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden',
        BORDER_STYLES[event.status]
      )}
    >
      {/* Date stamp */}
      <div className={cn('flex flex-col items-center justify-center w-16 shrink-0 py-4', DATE_STYLES[event.status])}>
        <span className="text-2xl font-bold leading-none">{day}</span>
        <span className="text-[10px] font-semibold tracking-widest mt-0.5">{month}</span>
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-100 my-3" />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1.5">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
          {event.nama_majlis}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {event.hall_name && (
            <span className="flex items-center gap-1">
              <MapPin size={11} strokeWidth={1.8} />
              {event.hall_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            {event.sesi === 'siang' ? (
              <Sun size={11} strokeWidth={1.8} className="text-amber-500" />
            ) : (
              <Moon size={11} strokeWidth={1.8} className="text-indigo-400" />
            )}
            {t(event.sesi === 'siang' ? 'events.sessionMorning' : 'events.sessionEvening')}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} strokeWidth={1.8} />
            {event.pax} pax
          </span>
        </div>

        <span
          className={cn(
            'self-start text-[10px] font-semibold px-2 py-0.5 rounded-full',
            STATUS_STYLES[event.status]
          )}
        >
          {t(STATUS_LABEL_KEYS[event.status])}
        </span>
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
git add src/components/EventSummaryCard.tsx
git commit -m "feat: add EventSummaryCard component with calendar date-stamp layout"
```

---

### Task 3: Dashboard Page

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Write src/pages/Dashboard.tsx**

```tsx
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { CalendarDays, Clock, CheckCircle2, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import EventSummaryCard from '@/components/EventSummaryCard'

function SkeletonCard() {
  return (
    <div className="flex bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-16 shrink-0 bg-gray-100" />
      <div className="w-px bg-gray-100" />
      <div className="flex-1 px-4 py-3 flex flex-col gap-2">
        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-16 mt-0.5" />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  accent?: 'red' | 'green' | 'amber' | 'neutral'
}

function StatCard({ label, value, icon: Icon, accent = 'neutral' }: StatCardProps) {
  const numClass = {
    red:     'text-red-600',
    green:   'text-green-600',
    amber:   'text-amber-500',
    neutral: 'text-gray-900',
  }[accent]

  const iconClass = {
    red:     'text-red-200',
    green:   'text-green-200',
    amber:   'text-amber-200',
    neutral: 'text-gray-200',
  }[accent]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={18} strokeWidth={1.6} className={iconClass} />
      </div>
      <span className={`text-3xl font-bold leading-none ${numClass}`}>{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const { events, loading } = useEvents()
  const isAdmin = userDoc?.role === 'admin'

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const upcoming  = events.filter((e) => e.status === 'upcoming')
  const completed = events.filter((e) => e.status === 'completed')
  const thisWeek  = events.filter((e) =>
    isWithinInterval(e.tarikh.toDate(), { start: weekStart, end: weekEnd })
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Stat cards — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('dashboard.totalEvents')}
            value={events.length}
            icon={CalendarDays}
            accent="neutral"
          />
          <StatCard
            label={t('dashboard.upcomingEvents')}
            value={upcoming.length}
            icon={Clock}
            accent="red"
          />
          <StatCard
            label={t('dashboard.completedEvents')}
            value={completed.length}
            icon={CheckCircle2}
            accent="green"
          />
          <StatCard
            label={t('dashboard.thisWeek')}
            value={thisWeek.length}
            icon={CalendarCheck}
            accent="amber"
          />
        </div>
      )}

      {/* Upcoming Events */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {t('dashboard.upcomingEvents')}
        </h2>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center">
            <p className="text-sm text-gray-400">{t('dashboard.noEvents')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventSummaryCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Completed Events — admin only, last 5 */}
      {isAdmin && !loading && completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t('dashboard.completedEvents')}
          </h2>
          <div className="space-y-3">
            {completed.slice(-5).reverse().map((event) => (
              <EventSummaryCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Run tests**

Run: `pnpm test`

Expected: all tests pass (Dashboard has no unit tests — Firestore hooks require live DB).

- [ ] **Step 4: Start dev server and visually verify**

Run: `pnpm dev`

Open `http://localhost:5173/dashboard`.

Admin view — verify:
- 4 stat cards visible in a 2-column grid on mobile, 4-column on desktop
- "Upcoming Events" section heading
- Skeleton shimmer cards appear during load
- Empty state appears if no upcoming events
- "Completed" section appears below if any completed events exist

Kitchen view — verify:
- No stat cards visible
- Only "Upcoming Events" section shown

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: Dashboard page — stat cards, event list, role-based views"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| useEvents hook with onSnapshot | Task 1 |
| EventDoc interface exported | Task 1 |
| EventSummaryCard with date-stamp layout | Task 2 |
| Red left border for upcoming, gray for others | Task 2 |
| Sun/Moon session indicator | Task 2 |
| Status badge with correct colors | Task 2 |
| Pax display | Task 2 |
| Admin stat cards (4) | Task 3 |
| Total / Upcoming / Completed / This Week counts | Task 3 |
| Upcoming events list | Task 3 |
| Completed events list (last 5, admin only) | Task 3 |
| Kitchen view — no stats, upcoming only | Task 3 |
| Skeleton loading state (3 cards) | Task 3 |
| Empty state message | Task 3 |
| date-fns used for formatting and week calc | Tasks 2, 3 |

### Placeholder Check

No TBD, TODO, or incomplete steps found.

### Type Consistency

- `EventDoc` defined in `src/hooks/useEvents.ts`, imported in both `EventSummaryCard.tsx` and `Dashboard.tsx` — single source of truth.
- `useEvents()` returns `{ events: EventDoc[], loading: boolean }` — consumed correctly in Dashboard.
- `STATUS_LABEL_KEYS` typed as `const` with exact string union keys matching `EventDoc['status']` — no runtime key misses.
- `StatCard` props: `icon: React.ElementType` — matches pattern used in Sidebar.tsx.
- `completed.slice(-5).reverse()` — slice is safe on empty arrays, returns last 5 chronologically reversed (most recent first). Guard `completed.length > 0` prevents rendering empty section.
