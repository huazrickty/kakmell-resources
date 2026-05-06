import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — full navigation UI in Phase 6 */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar" />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
