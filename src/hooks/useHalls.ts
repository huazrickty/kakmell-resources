import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export function useHalls(): { halls: string[]; loading: boolean } {
  const { user } = useAuth()
  const [halls, setHalls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'halls'),
      where('is_active', '==', true),
      orderBy('name', 'asc')
    )
    getDocs(q)
      .then((snap) => {
        setHalls(snap.docs.map((d) => d.data().name as string))
        setLoading(false)
      })
      .catch((err) => {
        console.error('useHalls error:', err)
        setLoading(false)
      })
  }, [user])

  return { halls, loading }
}
