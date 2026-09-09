import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Search } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GlobalSearch from '@/components/GlobalSearch'

const PAGE_LABEL_KEYS: Record<string, string> = {
  '/dashboard':   'nav.home',
  '/events':      'nav.events',
  '/tasks':       'nav.tasks',
  '/ingredients': 'nav.ingredients',
  '/checklist':   'nav.checklist',
  '/invoices':    'nav.invoices',
  '/more':        'nav.more',
}

export default function AppLayout() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const location = useLocation()
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
    <div className="flex min-h-screen bg-bg">
      <div className="print:hidden"><Sidebar /></div>
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Slim top bar: title left, search + language right. No logo on
            inner pages — logo lives on Home and the sidebar. */}
        <header className="sticky top-0 z-40 h-12 shrink-0 bg-surface/80 backdrop-blur-md border-b border-line flex items-center justify-between px-4 print:hidden">
          <span className="text-sm font-semibold text-ink">
            {labelKey ? t(labelKey as Parameters<typeof t>[0]) : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
              aria-label={t('common.search')}
            >
              <Search size={16} />
            </button>
            <LanguageSwitcher />
          </div>
        </header>
        {/* overflow-x-clip: page can never scroll sideways, and unlike
            overflow-hidden it doesn't break md:sticky action bars inside */}
        <main className="flex-1 min-w-0 overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>
      <div className="print:hidden"><BottomNav /></div>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} isAdmin={isAdmin} />
    </div>
  )
}
