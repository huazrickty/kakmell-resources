import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UserRecord {
  uid: string
  full_name: string
  email: string
  role: 'pending' | 'admin' | 'kitchen'
}

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-[#1B4332]/10 text-[#1B4332] border border-[#1B4332]/20',
  kitchen: 'bg-blue-50 text-blue-700 border border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', kitchen: 'Kitchen', pending: 'Pending',
}

export default function UsersSettings() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [users, setUsers]   = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]     = useState<string | null>(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserRecord, 'uid'>) })))
      setLoading(false)
    })
  }, [])

  async function approve(uid: string, role: 'admin' | 'kitchen') {
    setBusy(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        role,
        approved_at: serverTimestamp(),
        approved_by: user!.uid,
      })
      toast.success('User updated.')
    } catch (err) {
      console.error('approve error:', err)
      toast.error('Failed to update user.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-400">{t('common.loading')}</div>
  }

  const pending = users.filter((u) => u.role === 'pending')
  const active  = users.filter((u) => u.role !== 'pending')

  return (
    <div className="space-y-5">
      {/* ── Pending Approval ──────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-100">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              {t('settings.pendingApproval')} · {pending.length}
            </span>
          </div>
          <div className="divide-y divide-amber-100/60">
            {pending.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(u.uid, 'kitchen')}
                    disabled={busy === u.uid}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-40"
                  >
                    Kitchen
                  </button>
                  <button
                    onClick={() => approve(u.uid, 'admin')}
                    disabled={busy === u.uid}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors disabled:opacity-40"
                  >
                    Admin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Users ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {t('settings.allUsers')} · {active.length}
          </span>
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {t('settings.noActiveUsers')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {active.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                    {u.uid === user?.uid && (
                      <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full tracking-wide">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_STYLES[u.role])}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {u.uid !== user?.uid && (
                    <select
                      value={u.role === 'pending' ? '' : u.role}
                      disabled={busy === u.uid}
                      onChange={(e) => approve(u.uid, e.target.value as 'admin' | 'kitchen')}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#1B4332] disabled:opacity-40"
                    >
                      <option value="admin">→ Admin</option>
                      <option value="kitchen">→ Kitchen</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
