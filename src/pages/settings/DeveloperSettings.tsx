import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Lock, ShieldAlert, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRecord {
  uid: string
  full_name: string
  email: string
  role: string
}

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-[#1B4332]/10 text-[#1B4332]',
  kitchen: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
}

export default function DeveloperSettings() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()

  const [unlocked, setUnlocked]     = useState(false)
  const [password, setPassword]     = useState('')
  const [storedPw, setStoredPw]     = useState('')
  const [users, setUsers]           = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [staged, setStaged]         = useState<Record<string, string>>({})
  const [busy, setBusy]             = useState<string | null>(null)
  const [purging, setPurging]       = useState(false)

  useEffect(() => {
    if (!unlocked) return
    setLoadingUsers(true)
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserRecord, 'uid'>) })))
      setLoadingUsers(false)
    })
  }, [unlocked])

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setStoredPw(password)
    setUnlocked(true)
    setPassword('')
  }

  async function applyRole(uid: string) {
    const newRole = staged[uid]
    if (!newRole) return
    setBusy(uid)
    try {
      await httpsCallable(functions, 'changeUserRole')({ uid, newRole, devPassword: storedPw })
      toast.success(t('settings.toast.roleUpdated'))
      setStaged((prev) => { const next = { ...prev }; delete next[uid]; return next })
      if (uid === user?.uid) {
        toast.info(t('settings.toast.signingOut'))
        setTimeout(() => signOut(), 1200)
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed.'
      toast.error(msg.includes('password') ? t('settings.toast.wrongPassword') : msg)
      setUnlocked(false)
      setStoredPw('')
      setStaged({})
    } finally {
      setBusy(null)
    }
  }

  async function purgeOldTasks() {
    setPurging(true)
    try {
      const res = await httpsCallable(functions, 'cleanupOldTaskAssignmentsManual')({})
      const s = res.data as { datesDeleted: number; taskDocsDeleted: number; photosDeleted: number }
      toast.success(`${t('settings.toast.purgeDone')}: ${s.datesDeleted} dates, ${s.taskDocsDeleted} tasks, ${s.photosDeleted} photos`)
    } catch {
      toast.error(t('settings.toast.purgeFailed'))
    } finally {
      setPurging(false)
    }
  }

  /* ── Locked screen ───────────────────────────────────────────────────── */
  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto pt-4">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <ShieldAlert size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">{t('settings.devLocked')}</p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
              {t('settings.devPassword')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[#1B4332] text-white font-semibold py-2.5 rounded-lg hover:bg-[#163828] transition-colors disabled:opacity-40"
          >
            <Lock size={14} />
            {t('settings.devUnlock')}
          </button>
        </form>
      </div>
    )
  }

  /* ── Unlocked screen ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <ShieldAlert size={16} className="text-red-500 shrink-0" />
        <p className="text-xs text-red-600">{t('settings.devWarning')}</p>
      </div>

      {loadingUsers ? (
        <div className="py-8 text-center text-sm text-gray-400">{t('common.loading')}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('settings.developerAllUsers')} · {users.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {users.map((u) => {
              const currentRole  = u.role
              const stagedRole   = staged[u.uid]
              const hasChange    = stagedRole !== undefined && stagedRole !== currentRole
              return (
                <div key={u.uid} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                      {u.uid === user?.uid && (
                        <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full tracking-wide">
                          {t('settings.you')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_STYLES[currentRole] ?? 'bg-gray-100 text-gray-600')}>
                      {currentRole}
                    </span>
                    <select
                      value={stagedRole ?? currentRole}
                      disabled={busy === u.uid}
                      onChange={(e) => setStaged((prev) => ({ ...prev, [u.uid]: e.target.value }))}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#1B4332] disabled:opacity-40"
                    >
                      <option value="admin">admin</option>
                      <option value="kitchen">kitchen</option>
                      <option value="pending">pending</option>
                    </select>
                    {hasChange && (
                      <button
                        onClick={() => applyRole(u.uid)}
                        disabled={busy === u.uid}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors disabled:opacity-40"
                      >
                        {busy === u.uid ? '...' : t('settings.apply')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Manual task-data cleanup (mirrors nightly scheduled function) ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-gray-900">{t('settings.purgeOldTasks')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('settings.purgeOldTasksDesc')}</p>
        </div>
        <button
          onClick={purgeOldTasks}
          disabled={purging}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          <Trash2 size={13} />
          {purging ? '...' : t('settings.apply')}
        </button>
      </div>
    </div>
  )
}
