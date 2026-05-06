import { Outlet, useLocation } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const PAGE_LABEL_KEYS: Record<string, string> = {
  '/dashboard':   'nav.dashboard',
  '/events':      'nav.events',
  '/ingredients': 'nav.ingredients',
  '/checklist':   'nav.checklist',
  '/invoices':    'nav.invoices',
  '/settings':    'nav.settings',
}

export default function AppLayout() {
  const { t } = useLanguage()
  const location = useLocation()
  const labelKey = PAGE_LABEL_KEYS[location.pathname]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-12 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <span className="text-sm font-medium text-gray-500">
            {labelKey ? t(labelKey as Parameters<typeof t>[0]) : ''}
          </span>
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
