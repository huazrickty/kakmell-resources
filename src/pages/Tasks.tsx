import { useState, useEffect, useRef } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import {
  collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import {
  Camera, CheckCircle2, Clock, Loader2, RotateCcw, Image as ImageIcon,
  X, ChevronLeft, ChevronRight, MoreHorizontal, ListChecks,
} from 'lucide-react'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { logActivity } from '@/lib/activity-logger'
import { toast } from 'sonner'
import {
  Button, Card, Badge, Select, BottomSheet, EmptyState, Pill, ListRow,
} from '@/components/ui-kit'

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
    <Badge status="ok">
      <CheckCircle2 size={11} strokeWidth={2.5} />
      {t('tasks.done')}
    </Badge>
  ) : (
    <Badge status="warn">
      <Clock size={11} strokeWidth={2.5} />
      {t('tasks.pending')}
    </Badge>
  )
}

export default function Tasks() {
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate]               = useState(todayStr)
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

  // Overflow actions / undo confirm / lightbox
  const [actionTask, setActionTask] = useState<Task | null>(null)
  const [undoTask, setUndoTask]     = useState<Task | null>(null)
  const [viewUrl, setViewUrl]       = useState<string | null>(null)

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

  const rows = tasks.filter((task) => {
    const a = assignments[task.id]
    if (!isAdmin) return a?.assigned_to === user.uid
    if (onlyMine)  return a?.assigned_to === user.uid
    return true
  })

  const actionAssignment = actionTask ? assignments[actionTask.id] : undefined

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

      <h1 className="text-xl font-bold tracking-tight text-ink mb-4">
        {isAdmin ? t('tasks.title') : t('tasks.myTasks')}
      </h1>

      {/* ── Date strip: < date > + Today ───────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <Card flush className="flex items-center">
          <button
            onClick={() => setDate(format(addDays(parseISO(date), -1), 'yyyy-MM-dd'))}
            className="h-12 w-12 flex items-center justify-center text-ink-soft hover:text-ink hover:bg-ink/5 rounded-l-xl transition-colors"
            aria-label="-1"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-12 bg-transparent text-sm font-semibold text-ink text-center focus:outline-none tabular-nums"
          />
          <button
            onClick={() => setDate(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}
            className="h-12 w-12 flex items-center justify-center text-ink-soft hover:text-ink hover:bg-ink/5 rounded-r-xl transition-colors"
            aria-label="+1"
          >
            <ChevronRight size={18} />
          </button>
        </Card>

        {date !== todayStr && (
          <Pill selected onClick={() => setDate(todayStr)}>
            {t('dashboard.today')}
          </Pill>
        )}

        {isAdmin && (
          <Pill selected={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
            {t('tasks.assignedToMe')}
          </Pill>
        )}
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-ink/5 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card flush>
          <EmptyState icon={ListChecks} message={t('tasks.noActiveTasks')} />
        </Card>
      ) : rows.length === 0 ? (
        <Card flush>
          <EmptyState icon={ListChecks} message={t('tasks.noTasksAssigned')} />
        </Card>
      ) : isAdmin ? (
        /* ── Admin: dense assignment rows ─────────────────────────────── */
        <Card flush>
          <div className="divide-y divide-line">
            {rows.map((task) => {
              const a = assignments[task.id]
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                    {task.order}
                  </span>
                  <span className="flex-1 min-w-[140px] text-sm font-medium text-ink">
                    {task.name}
                  </span>
                  <StatusBadge status={a?.status ?? 'pending'} />
                  {a?.status === 'done' && (
                    <button
                      onClick={() => setActionTask(task)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
                      aria-label={t('common.actions')}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                  {a?.assigned_to === user.uid && a?.status !== 'done' && (
                    <Button size="sm" onClick={() => startCapture(task)} disabled={uploading}>
                      <Camera size={13} />
                      {t('tasks.complete')}
                    </Button>
                  )}
                  <div className="shrink-0 w-[160px]">
                    <Select
                      className="!h-9 text-xs"
                      value={a?.assigned_to ?? ''}
                      onChange={(e) => assign(task, e.target.value)}
                      disabled={busy === task.id}
                    >
                      <option value="">{t('tasks.notAssigned')}</option>
                      {staff.map((s) => (
                        <option key={s.uid} value={s.uid}>{s.full_name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        /* ── Kitchen: task cards ──────────────────────────────────────── */
        <div className="space-y-3">
          {rows.map((task) => {
            const a = assignments[task.id]
            const isDone = a?.status === 'done'
            return (
              <Card key={task.id}>
                <div className="flex items-center gap-3">
                  {isDone && a?.photo_url && (
                    <button onClick={() => setViewUrl(a.photo_url)} className="shrink-0">
                      <img
                        src={a.photo_url}
                        alt={task.name}
                        className="h-12 w-12 rounded-lg object-cover border border-line"
                      />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-ink leading-snug">{task.name}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={a?.status ?? 'pending'} />
                    </div>
                  </div>
                  {isDone ? (
                    <button
                      onClick={() => setActionTask(task)}
                      className="h-12 w-12 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors shrink-0"
                      aria-label={t('common.actions')}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  ) : (
                    <Button onClick={() => startCapture(task)} disabled={uploading} className="shrink-0">
                      <Camera size={15} />
                      {t('tasks.complete')}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Photo preview sheet (Confirm / Retake) ─────────────────────── */}
      <BottomSheet
        open={!!captureTask && !!previewUrl}
        onClose={closeCapture}
        title={captureTask?.name}
      >
        <div className="space-y-3 pb-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={captureTask?.name ?? ''}
              className="w-full max-h-[45vh] object-contain rounded-lg bg-ink"
            />
          )}
          <p className="text-xs text-ink-soft">{t('tasks.photoRequired')}</p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              disabled={uploading}
              onClick={() => captureTask && startCapture(captureTask)}
            >
              <Camera size={15} />
              {t('tasks.retake')}
            </Button>
            <Button className="flex-1" disabled={uploading} onClick={confirmComplete}>
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {t('tasks.uploading')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  {t('tasks.confirm')}
                </>
              )}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Done-task actions sheet (view photo / undo) ────────────────── */}
      <BottomSheet
        open={!!actionTask && !undoTask}
        onClose={() => setActionTask(null)}
        title={actionTask?.name}
      >
        <div className="pb-2 -mx-4 divide-y divide-line">
          {actionAssignment?.photo_url && (
            <ListRow
              leading={<ImageIcon size={18} />}
              label={t('tasks.viewPhoto')}
              onClick={() => { setViewUrl(actionAssignment.photo_url); setActionTask(null) }}
            />
          )}
          {(isAdmin || actionAssignment?.assigned_to === user.uid) && (
            <ListRow
              leading={<RotateCcw size={18} />}
              label={t('tasks.undo')}
              onClick={() => { setUndoTask(actionTask); setActionTask(null) }}
            />
          )}
        </div>
      </BottomSheet>

      {/* ── Undo confirm sheet ─────────────────────────────────────────── */}
      <BottomSheet
        open={!!undoTask}
        onClose={() => setUndoTask(null)}
        title={undoTask?.name}
      >
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-soft">{t('tasks.undoConfirm')}</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setUndoTask(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={confirmUndo}>
              <RotateCcw size={15} />
              {t('tasks.undo')}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Photo lightbox — ink scrim, white close ────────────────────── */}
      {viewUrl && (
        <div
          className="fixed inset-0 z-[80] bg-ink/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewUrl(null)}
        >
          <button
            onClick={() => setViewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t('common.cancel')}
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
