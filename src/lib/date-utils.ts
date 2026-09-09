type TimestampLike = { toDate?: () => Date; seconds?: number; _seconds?: number }

/** Coerce Firestore Timestamp / admin-SDK JSON / string / Date into Date. */
export function tsToDate(ts: unknown): Date {
  if (!ts) return new Date()
  if (ts instanceof Date) return ts
  const t = ts as TimestampLike
  if (typeof t.toDate === 'function') return t.toDate()
  if (typeof ts === 'string') return new Date(ts)
  if (typeof t._seconds === 'number') return new Date(t._seconds * 1000)
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000)
  return new Date(ts as number | string)
}

/** DD/MM/YYYY — used on invoice PDF and InvoiceDetail. */
export function fmtDateDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
