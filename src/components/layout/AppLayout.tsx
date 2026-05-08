import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Settings, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GlobalSearch from '@/components/GlobalSearch'

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
  const { userDoc } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const labelKey = PAGE_LABEL_KEYS[location.pathname]
  const isAdmin = userDoc?.role === 'admin'
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <div className="print:hidden"><Sidebar /></div>
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-12 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 print:hidden">
          <span className="text-sm font-medium text-gray-500">
            {labelKey ? t(labelKey as Parameters<typeof t>[0]) : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <LanguageSwitcher />
            {isAdmin && (
              <button
                onClick={() => navigate('/settings')}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>
      <div className="print:hidden"><BottomNav /></div>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} isAdmin={isAdmin} />
    </div>
  )
}
