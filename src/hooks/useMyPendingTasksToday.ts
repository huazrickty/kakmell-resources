import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export interface MyTasksToday {
  total: number
  done: number
  pending: number
}

/**
 * Live summary of the current user's assigned tasks for today.
 * Same assignee-scoped query shape the Tasks page uses, so it passes the
 * Firestore rule for both roles. Cheap: one narrow snapshot listener.
 */
export function useMyTasksToday(): MyTasksToday {
  const { user } = useAuth()
  const [summary, setSummary] = useState<MyTasksToday>({ total: 0, done: 0, pending: 0 })

  useEffect(() => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const q = query(
      collection(db, 'daily_assignments', today, 'tasks'),
      where('assigned_to', '==', user.uid),
    )
    return onSnapshot(
      q,
      (snap) => {
        const total = snap.size
        const done = snap.docs.filter((d) => d.data().status === 'done').length
        setSummary({ total, done, pending: total - done })
      },
      () => setSummary({ total: 0, done: 0, pending: 0 }),
    )
  }, [user])

  return summary
}

/** Pending-only view (nav badge dots). */
export function useMyPendingTasksToday(): number {
  return useMyTasksToday().pending
}
