import { NavLink } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  ListChecks,
  Receipt,
  FileText,
  CheckSquare,
  MoreHorizontal,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useMyPendingTasksToday } from '@/hooks/useMyPendingTasksToday'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Badge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  roles: ('admin' | 'kitchen')[]
  taskDot?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: Home,           labelKey: 'nav.home',      roles: ['admin', 'kitchen'] },
  { to: '/events',    icon: CalendarDays,   labelKey: 'nav.events',    roles: ['admin'] },
  { to: '/tasks',     icon: ListChecks,     labelKey: 'nav.tasks',     roles: ['admin', 'kitchen'], taskDot: true },
  { to: '/invoices',  icon: Receipt,        labelKey: 'nav.invoices',  roles: ['admin'] },
  { to: '/quotations', icon: FileText,      labelKey: 'nav.quotations', roles: ['admin'] },
  { to: '/checklist', icon: CheckSquare,    labelKey: 'nav.checklist', roles: ['kitchen'] },
  { to: '/more',      icon: MoreHorizontal, labelKey: 'nav.more',      roles: ['admin', 'kitchen'] },
]

export default function Sidebar() {
  const { userDoc, signOut } = useAuth()
  const { t } = useLanguage()
  const pendingTasks = useMyPendingTasksToday()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-surface border-r border-line">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <img src="/logo.png" alt="KAKMELL RESOURCES" className="h-12 w-auto object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 min-h-12 px-3 rounded-lg text-sm transition-colors border-l-[3px]',
                isActive
                  ? 'bg-ink/5 text-ink font-semibold border-ink'
                  : 'text-ink-soft hover:text-ink hover:bg-ink/[0.03] border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <item.icon size={18} strokeWidth={isActive ? 2.3 : 1.7} />
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

      {/* Bottom: user block */}
      <div className="border-t border-line p-3 space-y-2">
        <div className="flex items-center gap-2 px-2 pt-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{userDoc?.full_name ?? ''}</p>
          </div>
          <Badge status="neutral">{role}</Badge>
        </div>
        <div className="px-2">
          <LanguageSwitcher />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 min-h-12 px-3 rounded-lg text-sm text-ink-soft hover:text-ink hover:bg-ink/[0.03] transition-colors"
        >
          <LogOut size={17} strokeWidth={1.7} />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </aside>
  )
}
