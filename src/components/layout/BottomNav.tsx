import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  CheckSquare,
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
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', roles: ['admin', 'kitchen'] },
  { to: '/events',    icon: CalendarDays,    labelKey: 'nav.events',    roles: ['admin'] },
  { to: '/invoices',  icon: Receipt,         labelKey: 'nav.invoices',  roles: ['admin'] },
  { to: '/checklist', icon: CheckSquare,     labelKey: 'nav.checklist', roles: ['admin', 'kitchen'] },
]

export default function BottomNav() {
  const { userDoc } = useAuth()
  const { t } = useLanguage()
  const role = userDoc?.role ?? 'kitchen'

  const visibleItems = BOTTOM_NAV_ITEMS.filter((item) =>
    item.roles.includes(role as 'admin' | 'kitchen')
  )

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative h-16',
              isActive ? 'text-red-600' : 'text-gray-400'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-red-600" />
              )}
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
