import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  CheckSquare,
  ListChecks,
  Receipt,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  roles: ('admin' | 'kitchen')[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav.dashboard',  roles: ['admin', 'kitchen'] },
  { to: '/events',      icon: CalendarDays,    labelKey: 'nav.events',      roles: ['admin'] },
  { to: '/ingredients', icon: Package,          labelKey: 'nav.ingredients', roles: ['admin', 'kitchen'] },
  { to: '/checklist',   icon: CheckSquare,      labelKey: 'nav.checklist',   roles: ['admin', 'kitchen'] },
  { to: '/tasks',       icon: ListChecks,       labelKey: 'nav.tasks',       roles: ['admin', 'kitchen'] },
  { to: '/invoices',    icon: Receipt,          labelKey: 'nav.invoices',    roles: ['admin'] },
  { to: '/settings',    icon: SettingsIcon,     labelKey: 'nav.settings',    roles: ['admin'] },
]

export default function Sidebar() {
  const { userDoc, signOut } = useAuth()
  const { t } = useLanguage()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-100">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-red-50 text-gray-900 font-semibold border-l-[3px] border-red-600 pl-[9px]'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-l-[3px] border-transparent pl-[9px]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  className={isActive ? 'text-red-600' : 'text-gray-400'}
                />
                <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: language + sign out */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <div className="px-2 py-1.5">
          <LanguageSwitcher />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={16} strokeWidth={1.7} />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </aside>
  )
}
