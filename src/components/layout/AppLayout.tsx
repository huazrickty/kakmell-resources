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
