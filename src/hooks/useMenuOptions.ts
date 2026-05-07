import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MenuOptionsByCategory {
  nasi: string[]
  ayam: string[]
  daging: string[]
  acar: string[]
  bubur: string[]
  air: string[]
}

const EMPTY: MenuOptionsByCategory = {
  nasi: [], ayam: [], daging: [], acar: [], bubur: [], air: [],
}

export function useMenuOptions(): { options: MenuOptionsByCategory; loading: boolean } {
  const [options, setOptions] = useState<MenuOptionsByCategory>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'menu_options'), where('is_active', '==', true))
    getDocs(q).then((snap) => {
      const grouped: MenuOptionsByCategory = { nasi: [], ayam: [], daging: [], acar: [], bubur: [], air: [] }
      snap.docs.forEach((doc) => {
        const { category, name_ms } = doc.data() as { category: string; name_ms: string }
        if (category in grouped) {
          grouped[category as keyof MenuOptionsByCategory].push(name_ms)
        }
      })
      setOptions(grouped)
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
