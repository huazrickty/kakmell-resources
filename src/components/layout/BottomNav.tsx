import { NavLink } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  ListChecks,
  Receipt,
  CheckSquare,
  MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useMyPendingTasksToday } from '@/hooks/useMyPendingTasksToday'
import { cn } from '@/lib/utils'

interface BottomNavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  roles: ('admin' | 'kitchen')[]
  taskDot?: boolean
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { to: '/dashboard', icon: Home,           labelKey: 'nav.home',      roles: ['admin', 'kitchen'] },
  { to: '/events',    icon: CalendarDays,   labelKey: 'nav.events',    roles: ['admin'] },
  { to: '/tasks',     icon: ListChecks,     labelKey: 'nav.tasks',     roles: ['admin', 'kitchen'], taskDot: true },
  { to: '/invoices',  icon: Receipt,        labelKey: 'nav.invoices',  roles: ['admin'] },
  { to: '/checklist', icon: CheckSquare,    labelKey: 'nav.checklist', roles: ['kitchen'] },
  { to: '/more',      icon: MoreHorizontal, labelKey: 'nav.more',      roles: ['admin', 'kitchen'] },
]

export default function BottomNav() {
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const pendingTasks = useMyPendingTasksToday()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = BOTTOM_NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-t border-line flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors h-16 min-w-12',
              isActive ? 'text-ink font-semibold' : 'text-ink-soft font-medium'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <item.icon size={21} strokeWidth={isActive ? 2.4 : 1.7} />
                {/* Red dot = critical status: user has pending tasks today */}
                {item.taskDot && pendingTasks > 0 && (
                  <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </span>
              <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
