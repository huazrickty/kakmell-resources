import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { type MenuType } from '@/lib/menu-types'

// Active item names (BM) for a non-kahwin menu type.
// Kahwin uses useMenuOptions (category-grouped) instead — returns [] here.
export function useMenuTypeItems(menuType: MenuType, ready: boolean): { items: string[]; loading: boolean } {
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ready || menuType === 'kahwin') {
      setItems([])
      return
    }
    setLoading(true)
    const q = query(
      collection(db, 'menu_options'),
      where('menu_type', '==', menuType),
      where('is_active', '==', true),
    )
    getDocs(q)
      .then((snap) => {
        const names = snap.docs.map((d) => (d.data() as { name_ms: string }).name_ms)
        setItems([...new Set(names)].sort((a, b) => a.localeCompare(b)))
        setLoading(false)
      })
      .catch((err) => {
        console.error('useMenuTypeItems error:', err)
        setLoading(false)
      })
  }, [ready, menuType])

  return { items, loading }
}
