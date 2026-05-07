import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { type StringKey } from '@/lib/i18n'
import { ShieldOff, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import UsersSettings      from '@/pages/settings/UsersSettings'
import MenuSettings       from '@/pages/settings/MenuSettings'
import HallsSettings      from '@/pages/settings/HallsSettings'
import DeveloperSettings  from '@/pages/settings/DeveloperSettings'

type Tab = 'users' | 'menu' | 'halls' | 'dev'

const TABS: { id: Tab; label: (t: (k: StringKey) => string) => string }[] = [
  { id: 'users', label: (t) => t('settings.users') },
  { id: 'menu',  label: (t) => t('settings.menu') },
  { id: 'halls', label: (t) => t('settings.halls') },
  { id: 'dev',   label: (t) => t('settings.devSettings') },
]

function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl py-3.5 text-sm transition-colors min-h-[48px]"
      >
        <LogOut size={16} />
        Log Keluar / Sign Out
      </button>
    </div>
  )
}

export default function Settings() {
  const { userDoc, signOut } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab]               = useState<Tab>('users')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'pending'))
    return onSnapshot(q, (snap) => setPendingCount(snap.size))
  }, [])

  if (userDoc?.role !== 'admin') {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
          <ShieldOff size={36} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">Admin access only</p>
          <p className="text-xs text-gray-400">This section is restricted to administrators.</p>
        </div>
        <SignOutButton signOut={signOut} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-900 mb-5">{t('settings.title')}</h1>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 mb-6 -mx-4 px-4 overflow-x-auto gap-0 scrollbar-none">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'relative shrink-0 pb-3 pt-1 px-4 text-sm font-semibold transition-colors whitespace-nowrap',
              tab === id
                ? 'text-[#1B4332]'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            {label(t)}
            {/* Pending badge on Users tab */}
            {id === 'users' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                {pendingCount}
              </span>
            )}
            {/* Active underline */}
            {tab === id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1B4332] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      {tab === 'users' && <UsersSettings />}
      {tab === 'menu'  && <MenuSettings />}
      {tab === 'halls' && <HallsSettings />}
      {tab === 'dev'   && <DeveloperSettings />}

      <SignOutButton signOut={signOut} />
    </div>
  )
}
