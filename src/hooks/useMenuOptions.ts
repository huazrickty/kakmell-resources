import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MenuOptionsByCategory {
  nasi: string[]
  ayam: string[]
  daging: string[]
  acar: string[]
  bubur: string[]
  air_panas: string[]
  air_sejuk: string[]
}

const EMPTY: MenuOptionsByCategory = {
  nasi: [], ayam: [], daging: [], acar: [], bubur: [], air_panas: [], air_sejuk: [],
}

export function useMenuOptions(ready: boolean): { options: MenuOptionsByCategory; loading: boolean } {
  const [options, setOptions] = useState<MenuOptionsByCategory>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    const q = query(collection(db, 'menu_options'), where('is_active', '==', true))
    getDocs(q)
      .then((snap) => {
        const grouped: MenuOptionsByCategory = { nasi: [], ayam: [], daging: [], acar: [], bubur: [], air_panas: [], air_sejuk: [] }
        snap.docs.forEach((doc) => {
          const { category, name_ms } = doc.data() as { category: string; name_ms: string }
          if (category in grouped) {
            grouped[category as keyof MenuOptionsByCategory].push(name_ms)
          }
        })
        const deduped = {} as MenuOptionsByCategory
        for (const key of Object.keys(grouped) as (keyof MenuOptionsByCategory)[]) {
          deduped[key] = [...new Set(grouped[key])]
        }
        setOptions(deduped)
        setLoading(false)
      })
      .catch((err) => {
        console.error('useMenuOptions error:', err)
        setLoading(false)
      })
  }, [ready])

  return { options, loading }
}
