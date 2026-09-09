import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { logActivity } from '@/lib/activity-logger'
import { toast } from 'sonner'
import { Pencil, X, Check, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  name: string
  is_active: boolean
  order: number
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
        checked ? 'bg-ink' : 'bg-ink/10',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow-sm transition-transform duration-200',
        checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
      )} />
    </button>
  )
}

export default function TasksSettings() {
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addName, setAddName]     = useState('')
  const [busy, setBusy]           = useState<string | null>(null)
  const [adding, setAdding]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'tasks'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }))
        .sort((a, b) => a.order - b.order)
      setTasks(list)
      setLoading(false)
    })
  }, [])

  function log(action: string, description: string, task: { id: string; name: string }) {
    logActivity({
      action,
      category: 'task',
      description,
      entity_id: task.id,
      entity_name: task.name,
      performed_by: user!.uid,
      performed_by_name: userDoc?.full_name ?? '',
    })
  }

  async function toggle(task: Task) {
    setBusy(task.id)
    try {
      await updateDoc(doc(db, 'tasks', task.id), { is_active: !task.is_active })
      log('task_updated', `Tugasan ${!task.is_active ? 'diaktifkan' : 'dinyahaktifkan'}: ${task.name}`, task)
    } catch {
      toast.error(t('settings.toast.updateFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit(task: Task) {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditingId(null); return }
    setBusy(task.id)
    try {
      await updateDoc(doc(db, 'tasks', task.id), { name: trimmed })
      log('task_updated', `Nama tugasan dikemaskini: ${task.name} → ${trimmed}`, { id: task.id, name: trimmed })
      setEditingId(null)
    } catch {
      toast.error(t('settings.toast.saveFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function addTask() {
    const trimmed = addName.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const maxOrder = tasks.reduce((m, task) => Math.max(m, task.order), 0)
      const ref = await addDoc(collection(db, 'tasks'), {
        name: trimmed,
        is_active: true,
        order: maxOrder + 1,
        created_at: serverTimestamp(),
      })
      log('task_created', `Tugasan baru ditambah: ${trimmed}`, { id: ref.id, name: trimmed })
      setAddName('')
      toast.success(t('settings.toast.taskAdded'))
    } catch {
      toast.error(t('settings.toast.taskAddFailed'))
    } finally {
      setAdding(false)
    }
  }

  async function deleteTask(task: Task) {
    setBusy(task.id)
    try {
      await deleteDoc(doc(db, 'tasks', task.id))
      log('task_deleted', `Tugasan dipadam: ${task.name}`, task)
      setDeletingId(null)
      toast.success(t('settings.toast.taskDeleted'))
    } catch {
      toast.error(t('settings.toast.taskDeleteFailed'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-ink-soft">{t('common.loading')}</div>
  }

  const active   = tasks.filter((task) => task.is_active)
  const inactive = tasks.filter((task) => !task.is_active)

  const rowProps = { busy, editingId, editValue, deletingId, setEditingId, setEditValue, setDeletingId, onToggle: toggle, onSaveEdit: saveEdit, onDelete: deleteTask }

  return (
    <div className="space-y-5">
      {/* ── Active tasks ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-1 h-4 rounded-full bg-ink" />
          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
            {t('settings.active')} · {active.length}
          </span>
        </div>
        <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
          {active.length === 0 ? (
            <div className="px-4 py-4 text-sm text-ink-soft text-center">{t('settings.noTasks')}</div>
          ) : (
            <div className="divide-y divide-line">
              {active.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Inactive tasks ───────────────────────────────────────────────── */}
      {inactive.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-1 h-4 rounded-full bg-ink/20" />
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
              {t('settings.inactive')} · {inactive.length}
            </span>
          </div>
          <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden opacity-70">
            <div className="divide-y divide-line">
              {inactive.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Add new task ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-line bg-ink/[0.02] p-4">
        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">
          {t('settings.addTask')}
        </p>
        <div className="flex gap-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder={t('settings.taskPlaceholder')}
            className="flex-1 text-sm border border-line rounded-lg px-3 py-2 bg-surface focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/20 placeholder-ink-soft/50"
          />
          <button
            onClick={addTask}
            disabled={adding || !addName.trim()}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-ink text-white hover:bg-ink/90 transition-colors disabled:opacity-40"
          >
            {adding ? '...' : t('settings.addButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TaskRowProps {
  task: Task
  busy: string | null
  editingId: string | null
  editValue: string
  deletingId: string | null
  setEditingId: (id: string | null) => void
  setEditValue: (v: string) => void
  setDeletingId: (id: string | null) => void
  onToggle: (task: Task) => void
  onSaveEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function TaskRow({ task, busy, editingId, editValue, deletingId, setEditingId, setEditValue, setDeletingId, onToggle, onSaveEdit, onDelete }: TaskRowProps) {
  const { t } = useLanguage()

  if (deletingId === task.id) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-danger/5">
        <AlertTriangle size={16} className="text-danger shrink-0" />
        <p className="flex-1 text-xs text-danger font-medium">
          {t('settings.deleteTaskConfirm')}
        </p>
        <button
          onClick={() => onDelete(task)}
          disabled={busy === task.id}
          className="text-xs font-bold text-danger hover:text-danger px-3 py-1.5 rounded-lg border border-danger/40 hover:bg-danger/10 transition-colors whitespace-nowrap disabled:opacity-40"
        >
          {t('common.deleteConfirmAction')}
        </button>
        <button
          onClick={() => setDeletingId(null)}
          className="text-xs font-semibold text-ink-soft hover:text-ink"
        >
          {t('common.cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-ink-soft">{task.order}</span>
      <Toggle
        checked={task.is_active}
        onToggle={() => onToggle(task)}
        disabled={busy === task.id}
      />

      {editingId === task.id ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit(task)
            if (e.key === 'Escape') setEditingId(null)
          }}
          className="flex-1 text-sm border-b border-ink outline-none bg-transparent py-0.5 text-ink"
        />
      ) : (
        <span className={cn(
          'flex-1 text-sm truncate',
          task.is_active ? 'text-ink font-medium' : 'text-ink-soft'
        )}>
          {task.name}
        </span>
      )}

      {editingId === task.id ? (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onSaveEdit(task)}
            disabled={busy === task.id}
            className="p-1 text-ink hover:bg-ok/10 rounded disabled:opacity-40"
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
          <button onClick={() => setEditingId(null)} className="p-1 text-ink-soft hover:bg-ink/[0.03] rounded">
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => { setEditingId(task.id); setEditValue(task.name) }}
            className="p-1 text-ink-soft/50 hover:text-ink rounded transition-colors"
          >
            <Pencil size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setDeletingId(task.id)}
            className="p-1 text-ink-soft/50 hover:text-danger rounded transition-colors"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
