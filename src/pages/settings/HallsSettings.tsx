import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Pencil, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Hall {
  id: string
  name: string
  is_active: boolean
}

function Toggle({ checked, onToggle, disabled }: { checked: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-[#1B4332]' : 'bg-gray-200',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
      )} />
    </button>
  )
}

export default function HallsSettings() {
  const { t } = useLanguage()
  const [halls, setHalls]       = useState<Hall[]>([])
  const [loading, setLoading]   = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addName, setAddName]   = useState('')
  const [busy, setBusy]         = useState<string | null>(null)
  const [adding, setAdding]     = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'halls'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Hall, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setHalls(list)
      setLoading(false)
    })
  }, [])

  async function toggle(id: string, current: boolean) {
    setBusy(id)
    try {
      await updateDoc(doc(db, 'halls', id), { is_active: !current })
    } catch {
      toast.error(t('settings.toast.updateFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditingId(null); return }
    setBusy(id)
    try {
      await updateDoc(doc(db, 'halls', id), { name: trimmed })
      setEditingId(null)
    } catch {
      toast.error(t('settings.toast.saveFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function addHall() {
    const trimmed = addName.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      await addDoc(collection(db, 'halls'), { name: trimmed, is_active: true })
      setAddName('')
      toast.success(t('settings.toast.hallAdded'))
    } catch {
      toast.error(t('settings.toast.hallAddFailed'))
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-400">{t('common.loading')}</div>
  }

  const active   = halls.filter((h) => h.is_active)
  const inactive = halls.filter((h) => !h.is_active)

  return (
    <div className="space-y-5">
      {/* ── Active halls ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-1 h-4 rounded-full bg-[#1B4332]" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {t('settings.active')} · {active.length}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {active.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">{t('settings.noHalls')}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {active.map((h) => <HallRow key={h.id} hall={h} busy={busy} editingId={editingId} editValue={editValue} setEditingId={setEditingId} setEditValue={setEditValue} onToggle={toggle} onSaveEdit={saveEdit} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Inactive halls ──────────────────────────────────────────────── */}
      {inactive.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-1 h-4 rounded-full bg-gray-300" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('settings.inactive')} · {inactive.length}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden opacity-70">
            <div className="divide-y divide-gray-50">
              {inactive.map((h) => <HallRow key={h.id} hall={h} busy={busy} editingId={editingId} editValue={editValue} setEditingId={setEditingId} setEditValue={setEditValue} onToggle={toggle} onSaveEdit={saveEdit} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Add new hall ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('settings.addHall')}
        </p>
        <div className="flex gap-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHall()}
            placeholder={t('settings.hallPlaceholder')}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 placeholder-gray-400"
          />
          <button
            onClick={addHall}
            disabled={adding || !addName.trim()}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors disabled:opacity-40"
          >
            {adding ? '...' : t('settings.addButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface HallRowProps {
  hall: Hall
  busy: string | null
  editingId: string | null
  editValue: string
  setEditingId: (id: string | null) => void
  setEditValue: (v: string) => void
  onToggle: (id: string, current: boolean) => void
  onSaveEdit: (id: string) => void
}

function HallRow({ hall, busy, editingId, editValue, setEditingId, setEditValue, onToggle, onSaveEdit }: HallRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Toggle
        checked={hall.is_active}
        onToggle={() => onToggle(hall.id, hall.is_active)}
        disabled={busy === hall.id}
      />

      {editingId === hall.id ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit(hall.id)
            if (e.key === 'Escape') setEditingId(null)
          }}
          className="flex-1 text-sm border-b border-[#1B4332] outline-none bg-transparent py-0.5 text-gray-900"
        />
      ) : (
        <span className={cn(
          'flex-1 text-sm truncate',
          hall.is_active ? 'text-gray-900 font-medium' : 'text-gray-400'
        )}>
          {hall.name}
        </span>
      )}

      {editingId === hall.id ? (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onSaveEdit(hall.id)}
            disabled={busy === hall.id}
            className="p-1 text-[#1B4332] hover:bg-green-50 rounded disabled:opacity-40"
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setEditingId(hall.id); setEditValue(hall.name) }}
          className="shrink-0 p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
        >
          <Pencil size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
