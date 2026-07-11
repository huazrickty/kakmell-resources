import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { logActivity } from '@/lib/activity-logger'
import { MENU_TYPES, MENU_TYPE_LABEL_KEYS, MENU_TYPE_LABELS_BM, type MenuType } from '@/lib/menu-types'
import { toast } from 'sonner'
import { Pencil, X, Check, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuOption {
  id: string
  category: string
  name_ms: string
  is_active: boolean
  menu_type?: string
}

const CATEGORY_ORDER = ['nasi', 'ayam', 'daging', 'acar', 'bubur', 'air_panas', 'air_sejuk'] as const
const CATEGORY_LABELS: Record<string, string> = {
  nasi:      'Nasi',
  ayam:      'Ayam',
  daging:    'Daging',
  acar:      'Acar',
  bubur:     'Bubur',
  air_panas: 'Minuman Panas',
  air_sejuk: 'Minuman Sejuk',
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

export default function MenuSettings() {
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const [menuType, setMenuType]   = useState<MenuType>('kahwin')
  const [options, setOptions]     = useState<MenuOption[]>([])
  const [loading, setLoading]     = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addCategory, setAddCategory] = useState<string>('nasi')
  const [addName, setAddName]     = useState('')
  const [busy, setBusy]           = useState<string | null>(null)
  const [adding, setAdding]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'menu_options'), (snap) => {
      setOptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuOption, 'id'>) })))
      setLoading(false)
    })
  }, [])

  function logMenu(action: string, description: string, item: { id: string; name: string }) {
    logActivity({
      action,
      category: 'menu',
      description,
      entity_id: item.id,
      entity_name: item.name,
      performed_by: user!.uid,
      performed_by_name: userDoc?.full_name ?? '',
    })
  }

  function typeLabelOf(opt: MenuOption): string {
    const mt = (opt.menu_type ?? 'kahwin') as MenuType
    return MENU_TYPE_LABELS_BM[mt] ?? mt
  }

  async function toggle(id: string, current: boolean) {
    setBusy(id)
    try {
      await updateDoc(doc(db, 'menu_options', id), { is_active: !current })
      const opt = options.find((o) => o.id === id)
      if (opt) {
        logMenu(
          'menu_item_updated',
          `Item menu ${!current ? 'diaktifkan' : 'dinyahaktifkan'} (${typeLabelOf(opt)}): ${opt.name_ms}`,
          { id, name: opt.name_ms },
        )
      }
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
      await updateDoc(doc(db, 'menu_options', id), { name_ms: trimmed })
      const opt = options.find((o) => o.id === id)
      if (opt && opt.name_ms !== trimmed) {
        logMenu(
          'menu_item_updated',
          `Nama item menu dikemaskini (${typeLabelOf(opt)}): ${opt.name_ms} → ${trimmed}`,
          { id, name: trimmed },
        )
      }
      setEditingId(null)
    } catch {
      toast.error(t('settings.toast.saveFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function addOption() {
    const trimmed = addName.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const ref = await addDoc(collection(db, 'menu_options'), {
        category: menuType === 'kahwin' ? addCategory : 'item',
        name_ms: trimmed,
        is_active: true,
        menu_type: menuType,
      })
      logMenu(
        'menu_item_created',
        `Item menu ditambah (${MENU_TYPE_LABELS_BM[menuType]}): ${trimmed}`,
        { id: ref.id, name: trimmed },
      )
      setAddName('')
      toast.success(t('settings.toast.menuItemAdded'))
    } catch {
      toast.error(t('settings.toast.menuItemAddFailed'))
    } finally {
      setAdding(false)
    }
  }

  async function deleteOption(id: string) {
    setBusy(id)
    try {
      const opt = options.find((o) => o.id === id)
      await deleteDoc(doc(db, 'menu_options', id))
      if (opt) {
        logMenu(
          'menu_item_deleted',
          `Item menu dipadam (${typeLabelOf(opt)}): ${opt.name_ms}`,
          { id, name: opt.name_ms },
        )
      }
      setDeletingId(null)
      toast.success(t('settings.toast.menuItemDeleted'))
    } catch {
      toast.error(t('settings.toast.menuItemDeleteFailed'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-400">{t('common.loading')}</div>
  }

  // Docs without menu_type are pre-migration wedding options
  const typeOptions = options.filter((o) => (o.menu_type ?? 'kahwin') === menuType)

  const typeTabs = (
    <div className="flex border-b border-gray-200 overflow-x-auto gap-0 scrollbar-none -mx-4 px-4">
      {MENU_TYPES.map((mt) => (
        <button
          key={mt}
          onClick={() => { setMenuType(mt); setEditingId(null); setDeletingId(null); setAddName('') }}
          className={cn(
            'shrink-0 pb-2.5 pt-1 px-3 text-xs font-semibold transition-colors whitespace-nowrap relative',
            menuType === mt ? 'text-[#1B4332]' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          {t(MENU_TYPE_LABEL_KEYS[mt])}
          {menuType === mt && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1B4332] rounded-full" />
          )}
        </button>
      ))}
    </div>
  )

  /* ── Non-kahwin: flat item list with full CRUD ─────────────────────────── */
  if (menuType !== 'kahwin') {
    return (
      <div className="space-y-5">
        {typeTabs}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {typeOptions.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">{t('settings.noMenuItems')}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {typeOptions
                .slice()
                .sort((a, b) => a.name_ms.localeCompare(b.name_ms))
                .map((opt) =>
                  deletingId === opt.id ? (
                    <div key={opt.id} className="flex items-center gap-3 px-4 py-2.5 bg-red-50">
                      <AlertTriangle size={16} className="text-red-500 shrink-0" />
                      <p className="flex-1 text-xs text-red-700 font-medium">
                        {t('settings.deleteMenuItemConfirm')}
                      </p>
                      <button
                        onClick={() => deleteOption(opt.id)}
                        disabled={busy === opt.id}
                        className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-300 hover:bg-red-100 transition-colors whitespace-nowrap disabled:opacity-40"
                      >
                        {t('common.deleteConfirmAction')}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div key={opt.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Toggle
                        checked={opt.is_active}
                        onToggle={() => toggle(opt.id, opt.is_active)}
                        disabled={busy === opt.id}
                      />

                      {editingId === opt.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(opt.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 text-sm border-b border-[#1B4332] outline-none bg-transparent py-0.5 text-gray-900"
                        />
                      ) : (
                        <span className={cn(
                          'flex-1 text-sm truncate',
                          opt.is_active ? 'text-gray-900' : 'line-through text-gray-400'
                        )}>
                          {opt.name_ms}
                        </span>
                      )}

                      {editingId === opt.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => saveEdit(opt.id)}
                            disabled={busy === opt.id}
                            className="p-1 text-[#1B4332] hover:bg-green-50 rounded disabled:opacity-40"
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingId(opt.id); setEditValue(opt.name_ms) }}
                            className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
                          >
                            <Pencil size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => setDeletingId(opt.id)}
                            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
            </div>
          )}
        </div>

        {/* Add item */}
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {t('settings.addOption')}
          </p>
          <div className="flex gap-2">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOption()}
              placeholder={t('settings.itemPlaceholder')}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 placeholder-gray-400"
            />
            <button
              onClick={addOption}
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

  /* ── Kahwin: existing category-grouped UI, unchanged ───────────────────── */
  return (
    <div className="space-y-6">
      {typeTabs}
      {CATEGORY_ORDER.map((cat) => {
        const items = typeOptions.filter((o) => o.category === cat)
        return (
          <div key={cat}>
            {/* ── Category header ─────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-1 h-4 rounded-full bg-[#1B4332]" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="text-[10px] text-gray-400">· {items.length}</span>
            </div>

            {/* ── Options list ─────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {items.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 italic">
                  {t('settings.noMenuItems')}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Toggle
                        checked={opt.is_active}
                        onToggle={() => toggle(opt.id, opt.is_active)}
                        disabled={busy === opt.id}
                      />

                      {editingId === opt.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(opt.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 text-sm border-b border-[#1B4332] outline-none bg-transparent py-0.5 text-gray-900"
                        />
                      ) : (
                        <span className={cn(
                          'flex-1 text-sm truncate',
                          opt.is_active ? 'text-gray-900' : 'line-through text-gray-400'
                        )}>
                          {opt.name_ms}
                        </span>
                      )}

                      {editingId === opt.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => saveEdit(opt.id)}
                            disabled={busy === opt.id}
                            className="p-1 text-[#1B4332] hover:bg-green-50 rounded disabled:opacity-40"
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(opt.id); setEditValue(opt.name_ms) }}
                          className="shrink-0 p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
                        >
                          <Pencil size={13} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* ── Add new option ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('settings.addOption')}
        </p>
        <div className="flex gap-2 flex-wrap">
          <select
            value={addCategory}
            onChange={(e) => setAddCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B4332] text-gray-700"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder={t('settings.itemPlaceholder')}
            className="flex-1 min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 placeholder-gray-400"
          />
          <button
            onClick={addOption}
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
