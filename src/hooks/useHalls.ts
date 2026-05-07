import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useHalls(ready: boolean): { halls: string[]; loading: boolean } {
  const [halls, setHalls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    const q = query(collection(db, 'halls'), where('is_active', '==', true))
    getDocs(q)
      .then((snap) => {
        const names = snap.docs.map((d) => d.data().name as string)
        names.sort((a, b) => a.localeCompare(b))
        setHalls(names)
        setLoading(false)
      })
      .catch((err) => {
        console.error('useHalls error:', err)
        setLoading(false)
      })
  }, [ready])

  return { halls, loading }
}
