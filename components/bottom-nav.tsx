'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NAV_ITEMS } from '@/lib/nav-items'
import { logoutAction } from '@/app/actions/auth'
import { LogOut, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

function getRoleFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split(';').find(c => c.trim().startsWith('kakmell_role='))
  return match ? match.split('=')[1].trim() : ''
}

export function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [role, setRole] = useState('')

  useEffect(() => {
    setRole(getRoleFromCookie())
  }, [])

  async function handleLogout() {
    await logoutAction()
    router.push('/login')
  }

  const isHallRole = role === 'hall_staff' || role === 'hall_owner'

  // ── Hall staff: minimal nav (Jadual Acara + Keluar) ───────────────────────
  if (isHallRole) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t safe-area-pb lg:hidden">
        <div className="flex">
          <Link
            href="/hall-view"
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium transition-colors',
              pathname.startsWith('/hall-view') ? 'text-green-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <CalendarDays size={22} strokeWidth={pathname.startsWith('/hall-view') ? 2.5 : 1.8} />
            <span>Jadual</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span>Keluar</span>
          </button>
        </div>
      </nav>
    )
  }

  // ── Admin / kitchen: full nav ─────────────────────────────────────────────
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t safe-area-pb lg:hidden">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium transition-colors',
                active ? 'text-green-700' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  )
}
