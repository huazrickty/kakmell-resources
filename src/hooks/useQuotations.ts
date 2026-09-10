import { useEffect, useState } from 'react'
import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, where,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { QuotationDoc } from '@/lib/quotations'

/** Default page size for the list — bounded subscription, never the whole collection. */
export const QUOTATIONS_PAGE_SIZE = 100

export interface UseQuotationsOptions {
  /** Scope to one event (needs the composite index event_id ASC, created_at DESC) */
  eventId?: string
  limit?: number
  /** false → no subscription at all (e.g. non-admin viewer); returns [] and loading=false */
  enabled?: boolean
}

/**
 * Bounded real-time list: orderBy(created_at desc) + limit. `atLimit` is true
 * when the snapshot is full, so the page can tell the user filters run on a subset.
 */
export function useQuotations(opts: UseQuotationsOptions = {}): {
  quotations: QuotationDoc[]
  loading: boolean
  atLimit: boolean
} {
  const { eventId, limit: max = QUOTATIONS_PAGE_SIZE, enabled = true } = opts
  const [quotations, setQuotations] = useState<QuotationDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return               // derived return below
    const constraints: QueryConstraint[] = []
    if (eventId) constraints.push(where('event_id', '==', eventId))
    constraints.push(orderBy('created_at', 'desc'), limit(max))
    const q = query(collection(db, 'quotations'), ...constraints)
    const unsub = onSnapshot(q, (snap) => {
      setQuotations(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<QuotationDoc, 'id'>) })))
      setLoading(false)
    }, (err) => {
      console.error('useQuotations error:', err)
      setLoading(false)
    })
    return unsub
  }, [eventId, max, enabled])

  if (!enabled) return { quotations: [], loading: false, atLimit: false }
  return { quotations, loading, atLimit: quotations.length >= max }
}

/** Single document subscription. Empty id → null without subscribing. */
export function useQuotation(id: string | null | undefined): { quotation: QuotationDoc | null; loading: boolean } {
  const [quotation, setQuotation] = useState<QuotationDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return                      // no subscription; return value is derived below
    const unsub = onSnapshot(doc(db, 'quotations', id), (snap) => {
      setQuotation(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<QuotationDoc, 'id'>) }) : null)
      setLoading(false)
    }, (err) => {
      console.error('useQuotation error:', err)
      setQuotation(null)
      setLoading(false)
    })
    return unsub
  }, [id])

  if (!id) return { quotation: null, loading: false }
  return { quotation, loading }
}

/** Ids + numbers of quotations that are revisions of `id` (one-shot read). */
export function useRevisionChildren(id: string | null | undefined): {
  children: { id: string; quotation_no: string }[]
} {
  const [children, setChildren] = useState<{ id: string; quotation_no: string }[]>([])

  useEffect(() => {
    if (!id) return                      // return value derived below
    let cancelled = false
    getDocs(query(collection(db, 'quotations'), where('revision_of', '==', id), limit(5)))
      .then((snap) => {
        if (cancelled) return
        setChildren(snap.docs.map(d => ({ id: d.id, quotation_no: (d.data().quotation_no as string) ?? '' })))
      })
      .catch((err) => console.error('useRevisionChildren error:', err))
    return () => { cancelled = true }
  }, [id])

  return { children: id ? children : [] }
}
