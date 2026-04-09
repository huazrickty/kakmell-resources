'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { approveUserAction, getUsersAction, type UserProfileRow } from '@/app/actions/auth'
import { Check, ChevronDown, Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'admin',      label: 'Admin',       desc: 'Akses penuh' },
  { value: 'kitchen',    label: 'Kitchen',      desc: 'Bahan mentah + menu' },
  { value: 'hall_staff', label: 'Staff Dewan',  desc: 'Jadual acara sahaja' },
  { value: 'hall_owner', label: 'Owner Dewan',  desc: 'Jadual acara sahaja' },
  { value: 'pending',    label: 'Pending',      desc: 'Belum diluluskan' },
]

// Roles assignable when approving a pending user (exclude 'pending' itself)
const APPROVE_ROLE_OPTIONS = ROLE_OPTIONS.filter(r => r.value !== 'pending')

const ROLE_STYLE: Record<string, string> = {
  admin:      'bg-purple-100 text-purple-700',
  kitchen:    'bg-blue-100   text-blue-700',
  hall_staff: 'bg-teal-100   text-teal-700',
  hall_owner: 'bg-teal-100   text-teal-700',
  pending:    'bg-orange-100 text-orange-700',
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find(r => r.value === role)?.label ?? role
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ms-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Pending user row ──────────────────────────────────────────────────────────

function PendingRow({ user, onApprove }: {
  user: UserProfileRow
  onApprove: (id: string, role: string) => Promise<void>
}) {
  const [selectedRole, setSelectedRole] = useState('kitchen')
  const [saving, setSaving] = useState(false)

  async function handleApprove() {
    setSaving(true)
    await onApprove(user.id, selectedRole)
    setSaving(false)
  }

  return (
    <li className="p-4 rounded-xl border bg-orange-50 border-orange-200">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-sm font-bold shrink-0">
          {(user.full_name ?? user.email ?? '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {user.full_name ?? '(tiada nama)'}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
              Menunggu Kelulusan
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">Daftar: {formatDate(user.created_at)}</p>
        </div>
      </div>

      {/* Approve with role selection */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="w-full min-h-[48px] border border-gray-300 rounded-lg pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none"
          >
            {APPROVE_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={handleApprove}
          disabled={saving}
          className="min-h-[48px] px-5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Check size={15} />
          }
          Luluskan
        </button>
      </div>
    </li>
  )
}

// ── Active user row ───────────────────────────────────────────────────────────

function ActiveRow({ user, onChangeRole, onDeactivate }: {
  user: UserProfileRow
  onChangeRole: (id: string, role: string) => Promise<void>
  onDeactivate: (id: string) => Promise<void>
}) {
  const [selectedRole, setSelectedRole] = useState(user.role)
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState(false)

  const hasChanged = selectedRole !== user.role

  async function handleChangeRole() {
    setSaving(true)
    await onChangeRole(user.id, selectedRole)
    setSaving(false)
  }

  async function handleDeactivate() {
    if (!confirm(`Nyahaktifkan akaun "${user.full_name ?? user.email}"?\n\nPengguna ini tidak akan dapat log masuk sehingga diluluskan semula.`)) return
    setRemoving(true)
    await onDeactivate(user.id)
    setRemoving(false)
  }

  return (
    <li className="p-4 rounded-xl border bg-white border-gray-200">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold shrink-0">
          {(user.full_name ?? user.email ?? '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {user.full_name ?? '(tiada nama)'}
            </p>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_STYLE[user.role] ?? 'bg-gray-100 text-gray-600')}>
              {roleLabel(user.role)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Daftar: {formatDate(user.created_at)}
            {user.approved_at && ` · Lulus: ${formatDate(user.approved_at)}`}
          </p>
        </div>
      </div>

      {/* Role change + deactivate */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="w-full min-h-[48px] border border-gray-300 rounded-lg pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none"
          >
            {APPROVE_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={handleChangeRole}
          disabled={saving || !hasChanged}
          className="min-h-[48px] px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Check size={15} />
          }
          Tukar
        </button>
        <button
          onClick={handleDeactivate}
          disabled={removing}
          className="min-h-[48px] px-4 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 shrink-0"
        >
          {removing
            ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
            : 'Nyahaktif'
          }
        </button>
      </div>
    </li>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export function UsersClient({ initialUsers }: { initialUsers: UserProfileRow[] }) {
  const [users,   setUsers]   = useState<UserProfileRow[]>(initialUsers)
  const [filter,  setFilter]  = useState<'pending' | 'active'>('pending')
  const [loading, setLoading] = useState(false)

  const pending = users.filter(u => u.role === 'pending')
  const active  = users.filter(u => u.role !== 'pending')

  async function reload() {
    setLoading(true)
    const result = await getUsersAction()
    if ('users' in result) setUsers(result.users)
    setLoading(false)
  }

  async function handleApprove(userId: string, role: string) {
    const result = await approveUserAction(userId, role)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Pengguna berjaya diluluskan.')
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role, approved_at: new Date().toISOString() } : u
    ))
  }

  async function handleChangeRole(userId: string, role: string) {
    const result = await approveUserAction(userId, role)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Peranan berjaya dikemaskini.')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  async function handleDeactivate(userId: string) {
    const result = await approveUserAction(userId, 'pending')
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Akaun telah dinyahaktifkan.')
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role: 'pending', approved_at: null } : u
    ))
  }

  const displayed = filter === 'pending' ? pending : active

  return (
    <div>
      {/* Filter tabs + refresh */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'px-4 min-h-[40px] rounded-lg text-sm font-medium transition-colors',
            filter === 'pending'
              ? 'bg-orange-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          Menunggu{pending.length > 0 && ` (${pending.length})`}
        </button>
        <button
          onClick={() => setFilter('active')}
          className={cn(
            'px-4 min-h-[40px] rounded-lg text-sm font-medium transition-colors',
            filter === 'active'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          Aktif{active.length > 0 && ` (${active.length})`}
        </button>
        <button
          onClick={reload}
          disabled={loading}
          className="ml-auto min-h-[40px] px-3 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Muat semula"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* User list */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {filter === 'pending'
              ? 'Tiada pengguna menunggu kelulusan.'
              : 'Tiada pengguna aktif.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filter === 'pending'
            ? displayed.map(u => (
                <PendingRow key={u.id} user={u} onApprove={handleApprove} />
              ))
            : displayed.map(u => (
                <ActiveRow
                  key={u.id}
                  user={u}
                  onChangeRole={handleChangeRole}
                  onDeactivate={handleDeactivate}
                />
              ))
          }
        </ul>
      )}
    </div>
  )
}
