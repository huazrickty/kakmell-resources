import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logActivity } from '@/lib/activity-logger'

interface UserRecord {
  uid: string
  full_name: string
  email: string
  role: 'pending' | 'admin' | 'kitchen'
}

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-ink/10 text-ink border border-ink/20',
  kitchen: 'bg-ink/5 text-ink-soft border border-line',
  pending: 'bg-warn/10 text-warn border border-warn/30',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', kitchen: 'Kitchen', pending: 'Pending',
}

export default function UsersSettings() {
  const { user, userDoc } = useAuth()
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
      const targetUser = users.find(u => u.uid === uid)
      logActivity({
        action: 'user_role_changed',
        category: 'user',
        description: `Peranan pengguna dikemaskini: ${targetUser?.full_name ?? uid} → ${role}`,
        entity_id: uid,
        entity_name: targetUser?.full_name ?? uid,
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('settings.toast.userUpdated'))
    } catch (err) {
      console.error('approve error:', err)
      toast.error(t('settings.toast.userUpdateFailed'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-ink-soft">{t('common.loading')}</div>
  }

  const pending = users.filter((u) => u.role === 'pending')
  const active  = users.filter((u) => u.role !== 'pending')

  return (
    <div className="space-y-5">
      {/* ── Pending Approval ──────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-warn/20">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warn opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn/100" />
            </span>
            <span className="text-[10px] font-bold text-warn uppercase tracking-widest">
              {t('settings.pendingApproval')} · {pending.length}
            </span>
          </div>
          <div className="divide-y divide-warn/20">
            {pending.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{u.full_name}</p>
                  <p className="text-xs text-ink-soft truncate">{u.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(u.uid, 'kitchen')}
                    disabled={busy === u.uid}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface border border-line text-ink hover:border-ink/30 transition-colors disabled:opacity-40"
                  >
                    Kitchen
                  </button>
                  <button
                    onClick={() => approve(u.uid, 'admin')}
                    disabled={busy === u.uid}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-40"
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
      <div className="rounded-xl border border-line bg-surface shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
            {t('settings.allUsers')} · {active.length}
          </span>
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-soft">
            {t('settings.noActiveUsers')}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {active.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{u.full_name}</p>
                    {u.uid === user?.uid && (
                      <span className="text-[9px] font-bold text-ink-soft border border-line px-1.5 py-0.5 rounded-full tracking-wide">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft truncate">{u.email}</p>
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
                      className="text-xs border border-line rounded-lg px-2 py-1.5 bg-surface text-ink focus:outline-none focus:border-ink disabled:opacity-40"
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
