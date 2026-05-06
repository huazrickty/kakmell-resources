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
  { to: '/dashboard',   icon: LayoutDashboard, labelKey: 'nav.dashboard',  roles: ['admin', 'kitchen'] },
  { to: '/events',      icon: CalendarDays,    labelKey: 'nav.events',      roles: ['admin'] },
  { to: '/ingredients', icon: Package,          labelKey: 'nav.ingredients', roles: ['admin', 'kitchen'] },
  { to: '/checklist',   icon: CheckSquare,      labelKey: 'nav.checklist',   roles: ['admin', 'kitchen'] },
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
