import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { EventDoc } from './useEvents'

export function useEvent(id: string): { event: EventDoc | null; loading: boolean } {
  const [event, setEvent] = useState<EventDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'events', id), (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...(snap.data() as Omit<EventDoc, 'id'>) })
      } else {
        setEvent(null)
      }
      setLoading(false)
    })
    return unsub
  }, [id])

  return { event, loading }
}
