import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MenuSelection {
  nasi: string
  ayam: string
  daging: string
  acar: string
  bubur: string
  // Legacy single hot drink — events created before the hot/cold split
  air_panas?: string
  hot_drinks?: string[]
  cold_drinks?: string[]
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
  // Feature A: absent on pre-existing events — treat missing as 'kahwin'
  menu_type?: string
  // Non-kahwin only: chosen item names (BM)
  selected_items?: string[]
  // Optional free-text extra menu note, all menu types (Feature B)
  menu_tambahan?: string
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
