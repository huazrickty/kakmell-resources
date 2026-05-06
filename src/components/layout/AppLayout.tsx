import { Outlet } from 'react-router-dom'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — full navigation UI in Phase 7 */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar" />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="h-12 shrink-0 border-b border-border flex items-center justify-end px-4">
          <LanguageSwitcher />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
