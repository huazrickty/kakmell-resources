import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MenuSelection {
  nasi: string
  ayam: string
  daging: string
  acar: string
  bubur: string
  air_panas: string
}

export interface EventDoc {
  id: string
  nama_majlis: string
  hall_name: string
  tarikh: Timestamp
  sesi: 'siang' | 'malam'
  pax: number
  status: 'upcoming' | 'completed' | 'cancelled'
  remarks: string
  menu_selection: MenuSelection
  created_by: string
  created_at: Timestamp
}

export function useEvents(): { events: EventDoc[]; loading: boolean } {
  const [events, setEvents] = useState<EventDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('tarikh', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EventDoc, 'id'>) }))
      )
      setLoading(false)
    })
    return unsub
  }, [])

  return { events, loading }
}
