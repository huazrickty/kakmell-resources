'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/nav-items'
import { logoutAction } from '@/app/actions/auth'
import { LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

function getRoleFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split(';').find(c => c.trim().startsWith('kakmell_role='))
  return match ? match.split('=')[1].trim() : ''
}

export function SideNav() {
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

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-20 bg-white border-r border-gray-200">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <p className="text-sm font-bold text-gray-900 tracking-wide">KAKMELL RESOURCES</p>
        <p className="text-xs text-gray-400 mt-0.5">Pengurusan Katering</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Admin-only: User Management link */}
        {role === 'admin' && (
          <Link
            href="/settings/users"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/settings/users')
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Users size={19} strokeWidth={pathname.startsWith('/settings/users') ? 2.5 : 1.8} className="shrink-0" />
            Pengguna
          </Link>
        )}
      </nav>

      {/* Footer: logout */}
      <div className="px-3 py-3 border-t border-gray-100 shrink-0">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          Log Keluar
        </button>
        <p className="text-[11px] text-gray-400 px-3 mt-2">© 2026 Kakmell Resources</p>
      </div>
    </aside>
  )
}
