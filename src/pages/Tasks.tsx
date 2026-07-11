import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import {
  collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import {
  CalendarDays, Camera, CheckCircle2, Clock, Loader2, RotateCcw, Image as ImageIcon, X, AlertTriangle,
} from 'lucide-react'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { logActivity } from '@/lib/activity-logger'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  name: string
  is_active: boolean
  order: number
}

interface Assignment {
  task_name: string
  assigned_to: string | null
  assigned_name: string | null
  status: 'pending' | 'done'
  assigned_by: string
  assigned_at: Timestamp | null
  completed_at: Timestamp | null
  photo_url: string | null
}

interface StaffOption {
  uid: string
  full_name: string
}

function StatusBadge({ status }: { status: 'pending' | 'done' }) {
  const { t } = useLanguage()
  return status === 'done' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 uppercase tracking-wide">
      <CheckCircle2 size={11} strokeWidth={2.5} />
      {t('tasks.done')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 uppercase tracking-wide">
      <Clock size={11} strokeWidth={2.5} />
      {t('tasks.pending')}
    </span>
  )
}

export default function Tasks() {
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'

  const [date, setDate]               = useState(format(new Date(), 'yyyy-MM-dd'))
  const [tasks, setTasks]             = useState<Task[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [staff, setStaff]             = useState<StaffOption[]>([])
  const [loading, setLoading]         = useState(true)
  const [busy, setBusy]               = useState<string | null>(null)
  const [onlyMine, setOnlyMine]       = useState(false)

  // Photo capture / completion flow
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [captureTask, setCaptureTask] = useState<Task | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)

  // Undo confirm + photo lightbox
  const [undoTask, setUndoTask] = useState<Task | null>(null)
  const [viewUrl, setViewUrl]   = useState<string | null>(null)

  // Active tasks (master list, defines order)
  useEffect(() => {
    return onSnapshot(collection(db, 'tasks'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }))
        .filter((task) => task.is_active)
        .sort((a, b) => a.order - b.order)
      setTasks(list)
    })
  }, [])

  // Staff dropdown (admin only — kitchen cannot read other users)
  useEffect(() => {
    if (!isAdmin) return
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...(d.data() as { full_name: string; role: string }) }))
        .filter((u) => u.role === 'admin' || u.role === 'kitchen')
        .map((u) => ({ uid: u.uid, full_name: u.full_name }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      setStaff(list)
    })
  }, [isAdmin])

  // Assignments for selected date. Kitchen queries only its own docs
  // (matches the security rule); admin reads the whole subcollection.
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const col = collection(db, 'daily_assignments', date, 'tasks')
    const q = isAdmin ? col : query(col, where('assigned_to', '==', user.uid))
    return onSnapshot(q, (snap) => {
      const map: Record<string, Assignment> = {}
      snap.docs.forEach((d) => { map[d.id] = d.data() as Assignment })
      setAssignments(map)
      setLoading(false)
    })
  }, [date, isAdmin, user])

  // Revoke preview object URL when it changes / on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  async function assign(task: Task, uid: string) {
    if (!user) return
    setBusy(task.id)
    const refDoc = doc(db, 'daily_assignments', date, 'tasks', task.id)
    try {
      if (!uid) {
        await deleteDoc(refDoc)
        logActivity({
          action: 'task_unassigned',
          category: 'task',
          description: `Tugasan dikosongkan: ${task.name} (${date})`,
          entity_id: task.id,
          entity_name: task.name,
          performed_by: user.uid,
          performed_by_name: userDoc?.full_name ?? '',
        })
      } else {
        const person = staff.find((s) => s.uid === uid)
        await setDoc(refDoc, {
          task_name: task.name,
          assigned_to: uid,
          assigned_name: person?.full_name ?? '',
          status: 'pending',
          assigned_by: user.uid,
          assigned_at: serverTimestamp(),
          completed_at: null,
          photo_url: null,
        })
        logActivity({
          action: 'task_assigned',
          category: 'task',
          description: `Tugasan ditugaskan: ${task.name} → ${person?.full_name ?? uid} (${date})`,
          entity_id: task.id,
          entity_name: task.name,
          performed_by: user.uid,
          performed_by_name: userDoc?.full_name ?? '',
        })
      }
    } catch {
      toast.error(t('tasks.toast.assignFailed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Completion flow ─────────────────────────────────────────────────────

  function startCapture(task: Task) {
    setCaptureTask(task)
    // Reset so re-selecting the same file still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function closeCapture() {
    if (uploading) return
    setCaptureTask(null)
    setPreviewFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function confirmComplete() {
    if (!user || !captureTask || !previewFile) return
    setUploading(true)
    const task = captureTask
    try {
      const compressed = await imageCompression(previewFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      })
      const photoRef = ref(storage, `task-photos/${date}/${task.id}.jpg`)
      await uploadBytes(photoRef, compressed, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(photoRef)
      await updateDoc(doc(db, 'daily_assignments', date, 'tasks', task.id), {
        status: 'done',
        completed_at: serverTimestamp(),
        photo_url: url,
      })
      logActivity({
        action: 'task_completed',
        category: 'task',
        description: `Tugasan disiapkan: ${task.name} (${date})`,
        entity_id: task.id,
        entity_name: task.name,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('tasks.toast.completed'))
      setUploading(false)
      closeCapture()
    } catch {
      setUploading(false)
      toast.error(t('tasks.toast.uploadFailed'))
    }
  }

  async function confirmUndo() {
    if (!user || !undoTask) return
    const task = undoTask
    setBusy(task.id)
    setUndoTask(null)
    try {
      await updateDoc(doc(db, 'daily_assignments', date, 'tasks', task.id), {
        status: 'pending',
        completed_at: null,
        photo_url: null,
      })
      // Remove the photo so no orphan files remain; ignore if already gone
      try {
        await deleteObject(ref(storage, `task-photos/${date}/${task.id}.jpg`))
      } catch { /* object-not-found is fine */ }
      logActivity({
        action: 'task_reset',
        category: 'task',
        description: `Tugasan diundur ke belum siap: ${task.name} (${date})`,
        entity_id: task.id,
        entity_name: task.name,
        performed_by: user.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('tasks.toast.undone'))
    } catch {
      toast.error(t('tasks.toast.undoFailed'))
    } finally {
      setBusy(null)
    }
  }

  if (!user) return null

  // Admin: all active tasks (optionally filtered to own).
  // Kitchen: only tasks with an assignment doc pointing at them.
  const rows = tasks.filter((task) => {
    const a = assignments[task.id]
    if (!isAdmin) return a?.assigned_to === user.uid
    if (onlyMine)  return a?.assigned_to === user.uid
    return true
  })

  function renderActions(task: Task, a: Assignment | undefined) {
    if (a?.status === 'done') {
      const canUndo = isAdmin || a.assigned_to === user!.uid
      return (
        <div className="flex items-center gap-1 shrink-0">
          {a.photo_url && (
            <button
              onClick={() => setViewUrl(a.photo_url)}
              title={t('tasks.viewPhoto')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B4332] hover:bg-green-50 transition-colors"
            >
              <ImageIcon size={15} />
            </button>
          )}
          {canUndo && (
            <button
              onClick={() => setUndoTask(task)}
              disabled={busy === task.id}
              title={t('tasks.undo')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      )
    }
    if (a?.assigned_to === user!.uid) {
      return (
        <button
          onClick={() => startCapture(task)}
          disabled={uploading}
          className="flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors disabled:opacity-40"
        >
          <Camera size={13} />
          {t('tasks.complete')}
        </button>
      )
    }
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Hidden camera input — capture forces device camera, no gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileSelected}
        className="hidden"
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? t('tasks.title') : t('tasks.myTasks')}
        </h1>
      </div>

      {/* ── Date selector + filter ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <label className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2">
          <CalendarDays size={15} className="text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-500">{t('tasks.selectDate')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm text-gray-900 bg-transparent focus:outline-none"
          />
        </label>

        {isAdmin && (
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={cn(
              'px-3 py-2 rounded-full text-xs font-semibold border transition-colors',
              onlyMine
                ? 'bg-[#1B4332] text-white border-[#1B4332]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}
          >
            {t('tasks.assignedToMe')}
          </button>
        )}
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm h-14 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">{t('tasks.noActiveTasks')}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">{t('tasks.noTasksAssigned')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {rows.map((task) => {
              const a = assignments[task.id]
              return isAdmin ? (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                    {task.order}
                  </span>
                  <span className="flex-1 min-w-[140px] text-sm font-medium text-gray-900">
                    {task.name}
                  </span>
                  <StatusBadge status={a?.status ?? 'pending'} />
                  {renderActions(task, a)}
                  <select
                    value={a?.assigned_to ?? ''}
                    onChange={(e) => assign(task, e.target.value)}
                    disabled={busy === task.id}
                    className={cn(
                      'shrink-0 text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#1B4332] max-w-[160px] disabled:opacity-40',
                      a?.assigned_to ? 'border-gray-200 text-gray-900 font-medium' : 'border-dashed border-gray-300 text-gray-400'
                    )}
                  >
                    <option value="">{t('tasks.notAssigned')}</option>
                    {staff.map((s) => (
                      <option key={s.uid} value={s.uid}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                    {task.name}
                  </span>
                  <StatusBadge status={a?.status ?? 'pending'} />
                  {renderActions(task, a)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Photo preview modal (Confirm / Retake) ─────────────────────── */}
      {captureTask && previewUrl && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{captureTask.name}</p>
              <button
                onClick={closeCapture}
                disabled={uploading}
                className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>
            <img src={previewUrl} alt={captureTask.name} className="w-full max-h-[50vh] object-contain bg-gray-950" />
            <p className="px-4 pt-3 text-xs text-gray-400">{t('tasks.photoRequired')}</p>
            <div className="flex gap-2 p-4">
              <button
                onClick={() => startCapture(captureTask)}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 min-h-[44px]"
              >
                <Camera size={14} />
                {t('tasks.retake')}
              </button>
              <button
                onClick={confirmComplete}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors disabled:opacity-70 min-h-[44px]"
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('tasks.uploading')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    {t('tasks.confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo confirm modal ─────────────────────────────────────────── */}
      {undoTask && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{undoTask.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('tasks.undoConfirm')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUndoTask(null)}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmUndo}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors min-h-[44px]"
              >
                {t('tasks.undo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo lightbox ─────────────────────────────────────────────── */}
      {viewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setViewUrl(null)}
        >
          <button
            onClick={() => setViewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={viewUrl}
            alt={t('tasks.viewPhoto')}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  )
}
